from flask import Flask, render_template, redirect, url_for, session, request, jsonify
from database.config import get_db
from datetime import timedelta, datetime
import os
from dotenv import load_dotenv
from collections import defaultdict
from bson.objectid import ObjectId

load_dotenv()

app = Flask(__name__, static_folder ="static")
app.secret_key = os.getenv("SECRET_KEY") or "fallback_secret_key"
app.permanent_session_lifetime = timedelta(days=7)
db = get_db()

# 1. Preloader Route - Page Loader
@app.route('/')
def pageloader():
    return render_template("preloader.html")

# 2. Auth Route - Firebase Login Page
@app.route("/auth")
def auth():
    firebase_config = {
        "apiKey": os.getenv("FIREBASE_API_KEY"),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.getenv("FIREBASE_PROJECT_ID"),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.getenv("FIREBASE_APP_ID"),
    }
    return render_template("auth.html", firebase_config=firebase_config)

# 3. Save session from JS (after Firebase login)
@app.route('/set_session', methods=['POST'])
def set_session():
    data = request.json
    if not data or 'email' not in data:
        return jsonify({"message": "Invalid data"}), 400

    session['user'] = data  # Save to Flask session

    # Optional: Add user to MongoDB if not exists
    users_col = db["users"]
    if not users_col.find_one({"email": data['email']}):
        users_col.insert_one(data)

    return jsonify({"message": "Session stored"}), 200

# 4. Home Route - Expense Dashboard
@app.route('/home', methods=['GET', 'POST'])
def home():
    if 'user' not in session:
        return redirect(url_for('auth'))

    user_data = session['user']
    username = user_data.get("email") or "unknown_user"
    if not username:
        return redirect(url_for('auth'))

    user_col = db[username]
    meta_col = db['meta']
    groups_col = db['groups']
    user_groups = list(groups_col.find({"creator_email": username}))   
    group_expenses_col = db["group_expenses"]


    # Ensure meta info exists for user
    user_meta = meta_col.find_one({"user": username})
    if not user_meta:
        meta_col.insert_one({"user": username, "categories": ["General"]})
        categories = ["General"]
    else:
        categories = user_meta.get("categories", ["General"])

    # POST - Handle new expense
    if request.method == "POST":
        amount = request.form.get("Amount")
        reason = request.form.get("Reason")
        selected_category = request.form.get("category")
        new_category = request.form.get("new_category")

        category = new_category.strip() if selected_category == "__new__" and new_category.strip() else selected_category or "General"

        if category not in categories:
            meta_col.update_one({"user": username}, {"$push": {"categories": category}}, upsert=True)
            categories.append(category)

        if amount and reason:
            user_col.insert_one({
                "amount": float(amount),
                "reason": reason,
                "category": category,
                "timestamp": datetime.now()
            })

        return redirect(url_for('home'))

    # Fetch expenses for dashboard
    expenses = list(user_col.find().sort("timestamp", -1).limit(10))

    # Generate data for Pie Chart
    category_totals = defaultdict(float)
    for expense in user_col.find():
        category_totals[expense["category"]] += expense["amount"]

    labels = list(category_totals.keys())
    values = list(category_totals.values())

    return render_template("home.html",
                           user=user_data,  
                           categories=categories,
                           expenses=expenses,
                           chart_labels=labels,
                           chart_data=values,
                           groups=user_groups)


@app.route("/group/create", methods=["GET", "POST"])
def group_create():
    if "user" not in session:
        return redirect(url_for("auth"))

    if request.method == "POST":
        data = request.form
        group_name = data.get("group_name")
        member_names = request.form.getlist("member_name")
        member_phones = request.form.getlist("member_phone")

        members = [
            {"name": name, "phone": phone}
            for name, phone in zip(member_names, member_phones)
            if name and phone
        ]

        if not group_name or not members:
            return render_template("create_group.html", error="Fill all fields", group_name=group_name, members=members)

        db.groups.insert_one({
            "group_name": group_name,
            "creator_email": session["user"]["email"],
            "members": members,
            "group_expenses": 0,
            "created_at": datetime.now()
        })

        return redirect(url_for("home"))

    return render_template("create_group.html")


@app.route("/group/<group_id>")
def group_detail(group_id):
    if "user" not in session:
        return redirect(url_for("auth"))

    user_data = session["user"]
    username = user_data.get("email")
    user_phone = user_data.get("phone")

    groups_col = db["groups"]
    group_expenses_col = db["group_expenses"]

    try:
        group_obj_id = ObjectId(group_id)
    except Exception as e:
        return "Invalid Group ID", 400

    group = groups_col.find_one({"_id": group_obj_id})
    if not group:
        return "Group not found", 404

    # Check if current user is part of the group
    is_member = any(m["phone"] == user_phone for m in group["members"])
    if group["creator_email"] != username and not is_member:
        return "Unauthorized", 403

    # 1. Fetch all expenses related to this group
    expenses = list(group_expenses_col.find({"group_id": group_obj_id}).sort("created_at", -1))

    # 2. Initialize balance metrics
    total_to_get = 0.0
    total_to_pay = 0.0

    # 3. Go through each expense and determine user's pay/get status
    for exp in expenses:
        splits = exp.get("splits", [])
        for s in splits:
            if s.get("phone") == user_phone:
                role = s.get("role")
                amt = float(s.get("amount", 0))
                if role == "owes":
                    total_to_pay += amt
                elif role == "paid":
                    total_to_get += amt

    total_balance = total_to_get - total_to_pay

    # 4. Pie Chart Analytics
    category_data = defaultdict(float)
    for exp in expenses:
        category_data[exp.get("category", "Other")] += float(exp.get("amount", 0))

    chart_labels = list(category_data.keys())
    chart_values = list(category_data.values())

    # 5. Render the group detail page
    return render_template("group_detail.html",
                           user=user_data,
                           group=group,
                           expenses=expenses,
                           chart_labels=chart_labels,
                           chart_data=chart_values,
                           total_balance=round(total_balance, 2) if total_balance else 0.0,
                           amount_to_pay=round(total_to_pay, 2) if total_to_pay else 0.0,
                           amount_to_receive=round(total_to_get, 2) if total_to_get else 0.0)
    

@app.route("/group/<group_id>/add_expense", methods=["POST"])
def add_group_expense(group_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    title = data.get("title")
    amount = float(data.get("amount", 0))
    paid_by = data.get("paid_by")
    splits = data.get("splits", [])

    group_expenses_col = db["group_expenses"]

    new_expense = {
        "group_id": ObjectId(group_id),
        "title": title,
        "amount": amount,
        "paid_by": paid_by,
        "splits": splits,
        "created_at": datetime.utcnow(),
        "category": "General"
    }

    group_expenses_col.insert_one(new_expense)

    return jsonify({"message": "Expense added successfully!"})


    
if __name__ == "__main__":
    app.run(debug=True)
