from flask import Flask, render_template, redirect, url_for, session, request, jsonify
from database.config import get_db
from datetime import timedelta, datetime
import os
from dotenv import load_dotenv
from collections import defaultdict
from bson.objectid import ObjectId
import calendar


load_dotenv()

app = Flask(__name__, static_folder ="static")
app.secret_key = os.getenv("SECRET_KEY") or "fallback_secret_key"
app.permanent_session_lifetime = timedelta(days=7)
db = get_db()

meta_col = db['meta']
groups_col = db['groups']
group_expenses_col = db["group_expenses"]


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

@app.route('/collect_phone', methods=['GET', 'POST'])
def collect_phone():
    if 'user' not in session:
        return redirect(url_for('auth'))

    user = session['user']
    users_col = db['users']
    
    if request.method == 'POST':
        phone = request.form.get('phone', '').strip()
        if phone:
            users_col.update_one({'email': user['email']}, {'$set': {'phone': phone}})
            session['user']['phone'] = phone  # update session too
            return redirect(url_for('home'))
        else:
            return render_template("collect_phone.html", error="Phone number is required")

    return render_template("collect_phone.html")


@app.route('/set_session', methods=['POST'])
def set_session():
    data = request.get_json()
    if not data or 'email' not in data:
        return jsonify({"error": "Invalid data"}), 400

    session['user'] = data
    users_col = db["users"]

    existing_user = users_col.find_one({"email": data['email']})

    # NEW USER (signup)
    if not existing_user:
        users_col.insert_one(data)
        # If phone is missing in signup data, redirect to phone page
        if not data.get("phone"):
            return jsonify({"redirect": "/collect_phone"})
        return jsonify({"redirect": "/home"})

    # EXISTING USER (login)
    else:
        # Use phone from DB if available
        if not existing_user.get("phone"):
            return jsonify({"redirect": "/collect_phone"})
        
        # Populate session with existing user data
        session['user'] = {
            "email": existing_user["email"],
            "name": existing_user.get("name", ""),
            "phone": existing_user.get("phone", ""),
            "photo": existing_user.get("photo", "")
        }
        return jsonify({"redirect": "/home"})



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
            "creator_phone":session["user"]["phone"],
            "members": members,
            "group_expenses": 0,
            "created_at": datetime.now()
        })

        return redirect(url_for("home"))

    return render_template("create_group.html")

def calculate_user_balance(group_id, user_phone):
    expenses = list(group_expenses_col.find({"group_id": ObjectId(group_id)}))

    balance_map = defaultdict(float)

    for exp in expenses:
        paid_by = exp.get("paid_by")
        splits = exp.get("splits", [])

        for split in splits:
            member_phone = split.get("phone")
            amount = float(split.get("amount", 0))
            role = split.get("role")

            if member_phone == user_phone and role == "owes":
                # You owe someone (who paid)
                balance_map[paid_by] -= amount

            elif member_phone != user_phone and paid_by == user_phone and role == "owes":
                # You paid for someone else
                balance_map[member_phone] += amount

    # Now summarize net balances
    total_to_get = sum([amt for amt in balance_map.values() if amt > 0])
    total_to_pay = sum([-amt for amt in balance_map.values() if amt < 0])
    total_balance = total_to_get - total_to_pay

    return round(total_balance, 2), round(total_to_pay, 2), round(total_to_get, 2)


@app.route("/group/<group_id>")
def group_detail(group_id):
    if "user" not in session:
        return redirect(url_for("auth"))

    user_data = session["user"]
    username = user_data.get("email")
    user_phone = user_data.get("phone")

    try:
        group_obj_id = ObjectId(group_id)
    except:
        return "Invalid Group ID", 400

    group = groups_col.find_one({"_id": group_obj_id})
    if not group:
        return "Group not found", 404

    is_member = any(m["phone"] == user_phone for m in group["members"])
    if group["creator_email"] != username and not is_member:
        return "Unauthorized", 403

    expenses = list(group_expenses_col.find({"group_id": group_obj_id}).sort("created_at", -1))
    total_balance, total_to_pay, total_to_get = calculate_user_balance(group_id, user_phone)

    category_data = defaultdict(float)
    for exp in expenses:
        category_data[exp.get("category", "Other")] += float(exp.get("amount", 0))

    chart_labels = list(category_data.keys())
    chart_values = list(category_data.values())

    return render_template("group_detail.html",
                           user=user_data,
                           group=group,
                           expenses=expenses,
                           current_user_phone=user_phone,
                           chart_labels=chart_labels,
                           chart_data=chart_values,
                           total_balance=total_balance,
                           amount_to_pay=total_to_pay,
                           amount_to_receive=total_to_get)


@app.route("/group/<group_id>/add_expense", methods=["POST"])
def add_group_expense(group_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    title = data.get("title")
    amount = float(data.get("amount", 0))
    paid_by = data.get("paid_by")
    splits = data.get("splits", [])

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

    # Recalculate updated balances
    user_phone = session["user"]["phone"]
    total_balance, amount_to_pay, amount_to_get = calculate_user_balance(group_id, user_phone)

    return jsonify({
        "message": "Expense added successfully!",
        "total_balance": total_balance,
        "amount_to_pay": amount_to_pay,
        "amount_to_receive": amount_to_get
    })

@app.route('/group/<group_id>/delete_member', methods=['POST'])
def delete_member(group_id):
    if 'user' not in session:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    phone = data.get('phone')
    current_user_phone = session["user"].get("phone")

    group = groups_col.find_one({"_id": ObjectId(group_id)})
    if not group:
        return jsonify({"message": "Group not found"}), 404

    if group['creator_phone'] != current_user_phone:
        return jsonify({"message": "Only admin can delete members"}), 403

    updated_members = [m for m in group["members"] if m["phone"] != phone]
    groups_col.update_one(
        {"_id": ObjectId(group_id)},
        {"$set": {"members": updated_members}}
    )

    return jsonify({"message": "Member deleted successfully"})

@app.route('/group/<group_id>/edit_member', methods=['POST'])
def edit_member(group_id):
    if 'user' not in session:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    original_phone = data.get("original_phone", "").strip()
    new_name = data.get("name", "").strip()

    current_user_phone = session["user"].get("phone")
    group = groups_col.find_one({"_id": ObjectId(group_id)})

    if not group:
        return jsonify({"message": "Group not found"}), 404
    if group["creator_phone"] != current_user_phone:
        return jsonify({"message": "Only admin can edit members"}), 403

    # ✅ Modify the matching member
    updated_members = []
    found = False
    for m in group["members"]:
        if m["phone"] == original_phone:
            updated_members.append({"phone": m["phone"], "name": new_name})
            found = True
        else:
            updated_members.append(m)

    if not found:
        return jsonify({"message": "Member not found"}), 404

    groups_col.update_one(
        {"_id": ObjectId(group_id)},
        {"$set": {"members": updated_members}}
    )

    updated_group = groups_col.find_one({"_id": ObjectId(group_id)})
    return jsonify({"message": "Member updated successfully", "members": updated_group["members"]})


@app.route('/group/<group_id>/add_member', methods=['POST'])
def add_member(group_id):
    if 'user' not in session:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()

    current_user_phone = session["user"].get("phone")
    group = groups_col.find_one({"_id": ObjectId(group_id)})

    if not group:
        return jsonify({"message": "Group not found"}), 404
    if group["creator_phone"] != current_user_phone:
        return jsonify({"message": "Only admin can add members"}), 403

    if any(m["phone"] == phone for m in group["members"]):
        return jsonify({"message": "Member already exists"}), 400

    # ✅ Push new member
    groups_col.update_one(
        {"_id": ObjectId(group_id)},
        {"$push": {"members": {"name": name, "phone": phone}}}
    )

    updated_group = groups_col.find_one({"_id": ObjectId(group_id)})
    return jsonify({"message": "Member added successfully", "members": updated_group["members"]})

@app.route("/group/<group_id>/my_balances")
def my_balances(group_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    current_user = session["user"]
    current_user_phone = current_user["phone"]

    expenses = list(group_expenses_col.find({"group_id": ObjectId(group_id)}).sort("created_at", -1))

    to_get = []
    to_pay = []
    transactions = []
    balance_map = defaultdict(float)

    group = groups_col.find_one({"_id": ObjectId(group_id)})
    if not group:
        return jsonify({"error": "Group not found"}), 404

    member_lookup = {m["phone"]: m["name"] for m in group["members"]}

    for exp in expenses:
        title = exp.get("title", "")
        paid_by = exp.get("paid_by")
        created_at = exp.get("created_at", datetime.utcnow())

        user_involved = any(split["phone"] == current_user_phone for split in exp.get("splits", [])) or current_user_phone == paid_by
        if not user_involved:
            continue

        for split in exp.get("splits", []):
            member_phone = split.get("phone")
            amount = float(split.get("amount", 0))
            role = split.get("role")

            if member_phone == current_user_phone and role == "owes":
                # You owe someone
                balance_map[paid_by] -= amount
                transactions.append({
                    "to": paid_by,
                    "to_name": member_lookup.get(paid_by, paid_by),
                    "amount": amount,
                    "title": title,
                    "date": created_at,
                    "direction": "pay"
                })

            elif member_phone != current_user_phone and paid_by == current_user_phone and role == "owes":
                # You paid for someone else
                balance_map[member_phone] += amount
                transactions.append({
                    "to": member_phone,
                    "to_name": member_lookup.get(member_phone, member_phone),
                    "amount": amount,
                    "title": title,
                    "date": created_at,
                    "direction": "receive"
                })

    # Convert to proper lists
    for phone, amount in balance_map.items():
        name = member_lookup.get(phone, phone)
        if amount > 0:
            to_get.append({
                "phone": phone,
                "name": name,
                "amount": round(amount, 2)
            })
        elif amount < 0:
            to_pay.append({
                "phone": phone,
                "name": name,
                "amount": round(abs(amount), 2)
            })

    total_to_get = round(sum([entry["amount"] for entry in to_get]), 2)
    total_to_pay = round(sum([entry["amount"] for entry in to_pay]), 2)
    total_balance = round(total_to_get - total_to_pay, 2)

    return jsonify({
        "to_get": to_get,
        "to_pay": to_pay,
        "total_balance": total_balance,
        "amount_to_get": total_to_get,
        "amount_to_pay": total_to_pay,
        "transactions": sorted(transactions, key=lambda x: x["date"], reverse=True)
    })


@app.route("/group/<group_id>/all_expenses")
def all_expenses(group_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    group = groups_col.find_one({"_id": ObjectId(group_id)})
    if not group:
        return jsonify({"error": "Group not found"}), 404

    member_lookup = {m["phone"]: m["name"] for m in group["members"]}

    expenses = list(group_expenses_col.find({"group_id": ObjectId(group_id)}).sort("created_at", -1))
    results = []

    for exp in expenses:
        results.append({
            "title": exp.get("title", ""),
            "amount": float(exp.get("amount", 0)),
            "created_at": exp.get("created_at").isoformat(),
            "paid_by": member_lookup.get(exp.get("paid_by", ""), exp.get("paid_by", "")),
            "splits": [
                {
                    "phone": s["phone"],
                    "name": member_lookup.get(s["phone"], s["phone"]),
                    "amount": float(s["amount"]),
                    "role": s["role"]
                }
                for s in exp.get("splits", [])
            ]
        })

    return jsonify({"expenses": results})


@app.route("/group/<group_id>/analytics_data")
def analytics_data(group_id):
    expenses = list(group_expenses_col.find({"group_id": ObjectId(group_id)}))

    total_expense = sum(float(e["amount"]) for e in expenses)

    bar_data = defaultdict(float)
    pie_data = defaultdict(float)

    for exp in expenses:
        date = exp.get("created_at", datetime.utcnow())
        day = date.strftime("%Y-%m-%d")
        week = f"Week {date.isocalendar()[1]}"
        month = date.strftime("%B")

        # Aggregate for all levels
        bar_data[day] += float(exp["amount"])
        pie_data[exp["title"]] += float(exp["amount"])  # or paid_by name

    return jsonify({
        "total": round(total_expense, 2),
        "bar_daily": dict(bar_data),
        "bar_weekly": group_by_week(bar_data),
        "bar_monthly": group_by_month(bar_data),
        "pie": dict(pie_data)
    })

def group_by_week(data):
    weekly = defaultdict(float)
    for dstr, val in data.items():
        dt = datetime.strptime(dstr, "%Y-%m-%d")
        key = f"Week {dt.isocalendar()[1]}"
        weekly[key] += val
    return weekly

def group_by_month(data):
    monthly = defaultdict(float)
    for dstr, val in data.items():
        dt = datetime.strptime(dstr, "%Y-%m-%d")
        key = dt.strftime("%B")
        monthly[key] += val
    return monthly



if __name__ == "__main__":
    app.run(debug=True)
