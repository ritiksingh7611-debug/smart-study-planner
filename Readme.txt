🧠 Smart Study Planner Pro
A full-stack AI-powered study planner web application built with Python Flask, SQLite, and modern CSS/JS.

📁 Project Structure
smart_study_planner/
├── app.py                  ← Flask backend (all routes + API)
├── database.db             ← SQLite database (auto-created on first run)
├── requirements.txt        ← Python dependencies
├── templates/
│   └── index.html          ← All pages in one Jinja2 template
└── static/
    ├── style.css           ← Complete CSS (dark/light themes, glassmorphism)
    ├── app.js              ← All JavaScript (timer, charts, forms, modals)
    └── uploads/            ← User avatar uploads

🚀 Setup & Run
1. Install Python dependencies
bashpip install -r requirements.txt
2. Run the Flask app
bashpython app.py
3. Open in browser
http://localhost:5000

✨ Features
PageFeaturesLogin / SignupJWT-free session auth, password hashing, show/hide passwordDashboardStats cards, today's tasks, upcoming deadlines, AI suggestions, motivational quotesPlannerSubject management, color-coded weekly timetable, AI auto-generateTasksKanban board (To Do / In Progress / Done), priority badges, search & filterPomodoroAnimated ring timer, study/break modes, session logging, sound beepAnalyticsWeekly bar chart, subject doughnut chart, productivity trend line (Chart.js)ProfileUpdate name/theme, change password, avatar upload

🎨 Design

Dark/Light mode toggle
Glassmorphism cards with blur effects
Obsidian + Electric Indigo color palette
Sora display font + JetBrains Mono for numbers
Fully responsive (mobile, tablet, desktop)
Smooth CSS animations and hover effects


🔑 Tech Stack

Backend: Python 3.10+ · Flask 3.x · SQLite3 · Werkzeug (password hashing)
Frontend: HTML5 · CSS3 (Grid/Flexbox/Variables) · Vanilla JS · Chart.js 4
Icons: Font Awesome 6 · Google Fonts (Sora, JetBrains Mono)

