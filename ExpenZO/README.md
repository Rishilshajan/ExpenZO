# 💸 ExpenZO – Smart Expense Tracker PWA (🚧 Development Stage)

**ExpenZO** is a **Progressive Web App (PWA)** designed for tracking personal and group expenses with an intuitive, mobile-friendly interface. It supports **Google & Email/Password login** via **Firebase Authentication**, cloud storage with **MongoDB Atlas**, and a **Flask backend** for server-side logic. ExpenZO is installable as a standalone app and is designed to support features like **group splitting**, **Google Pay settlement**, and **expense visualizations**.

---

## 🚀 Features

### 🔐 Authentication
- Firebase Authentication (Google Sign-In + Email/Password)
- Unified Log In/Sign Up interface with tabbed toggle
- Secure Flask session management on successful login
- First-time users automatically redirected to the dashboard

### 🧾 Expense Management
- Add expenses with:
  - 💰 Amount
  - 📝 Reason
  - 🕒 Timestamp (auto-generated)
  - 📂 Category (existing or custom)
- Each user has a dedicated collection in MongoDB
- Recent transactions view with latest expense first

### 👥 Group Splitting (Ongoing)
- Create groups with a title (e.g. "Trip to Goa")
- Add members via mobile contact access *(Planned)*
- Enter expenses for groups and split:
  - Equally
  - Custom-wise (manual amount per person)
- Display balance sheet showing who owes how much

### 💳 Google Pay Integration *(Planned)*
- Deep-link based Google Pay redirection for settling dues
- Balances auto-updated post-transaction
- Works via phone number-based UPI

### 📊 Visual Insights
- Dynamic Pie Chart showing expense category-wise distribution
- Responsive cards showing summary metrics
- Light, modern UI optimized for touch and mobile

### 📱 Progressive Web App (PWA)
- Installable on Android & Desktop
- `manifest.json` & `service_worker.js` for offline support
- Standalone fullscreen experience on mobile
- Cacheable frontend for instant reload

---

## 🛠️ Tech Stack

| Layer       | Technology              |
|-------------|--------------------------|
| Frontend    | HTML, CSS, JavaScript    |
| Backend     | Flask (Python)           |
| Database    | MongoDB Atlas (NoSQL)    |
| Auth        | Firebase Authentication  |
| Deployment  | Web + APK (via PWA)      |
| PWA Support | manifest.json, service_worker.js |
| State Mgmt  | Flask Session + Firebase |

---

