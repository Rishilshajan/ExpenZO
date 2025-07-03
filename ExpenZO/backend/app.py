from flask import Flask, render_template, redirect, url_for, session, request, jsonify
from database.config import get_db
from datetime import timedelta, datetime
import os
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

app = Flask(__name__)
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
from collections import defaultdict
from flask import render_template, redirect, request, session, url_for
from datetime import datetime

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
                           chart_data=values)

if __name__ == "__main__":
    app.run(debug=True)
