from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import sqlite3
import os
import json
from datetime import datetime, timedelta
import random

app = Flask(__name__)
app.secret_key = 'smartstudyplanner_secret_key_2024'
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('static', exist_ok=True)

DB_PATH = 'database.db'

# ─── Database Init ────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        theme TEXT DEFAULT 'dark',
        notifications INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6366f1',
        target_hours REAL DEFAULT 0,
        completed_hours REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject_id INTEGER,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        deadline TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject_id INTEGER,
        duration_minutes INTEGER NOT NULL,
        session_type TEXT DEFAULT 'study',
        date TEXT DEFAULT CURRENT_DATE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS timetable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')

    conn.commit()
    conn.close()

init_db()

# ─── Helpers ──────────────────────────────────────────────────────────────────

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

MOTIVATIONAL_QUOTES = [
    {"quote": "The secret of getting ahead is getting started.", "author": "Mark Twain"},
    {"quote": "It always seems impossible until it's done.", "author": "Nelson Mandela"},
    {"quote": "Don't watch the clock; do what it does. Keep going.", "author": "Sam Levenson"},
    {"quote": "Success is the sum of small efforts repeated day in and day out.", "author": "Robert Collier"},
    {"quote": "Believe you can and you're halfway there.", "author": "Theodore Roosevelt"},
    {"quote": "The future belongs to those who believe in the beauty of their dreams.", "author": "Eleanor Roosevelt"},
    {"quote": "Education is the most powerful weapon which you can use to change the world.", "author": "Nelson Mandela"},
    {"quote": "Push yourself, because no one else is going to do it for you.", "author": "Unknown"},
]

# ─── Auth Routes ──────────────────────────────────────────────────────────────

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        conn = get_db()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['user_name'] = user['name']
            session['user_email'] = user['email']
            session['user_avatar'] = user['avatar']
            session['theme'] = user['theme']
            return jsonify({'success': True, 'redirect': url_for('dashboard')})
        return jsonify({'success': False, 'message': 'Invalid email or password.'})
    return render_template('index.html', page='login')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        if not name or not email or not password:
            return jsonify({'success': False, 'message': 'All fields are required.'})
        if len(password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'})
        conn = get_db()
        existing = conn.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
        if existing:
            conn.close()
            return jsonify({'success': False, 'message': 'Email already registered.'})
        hashed = generate_password_hash(password)
        conn.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', (name, email, hashed))
        conn.commit()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['user_email'] = user['email']
        session['user_avatar'] = ''
        session['theme'] = 'dark'
        return jsonify({'success': True, 'redirect': url_for('dashboard')})
    return render_template('index.html', page='signup')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/forgot-password')
def forgot_password():
    return render_template('index.html', page='forgot')

# ─── Main Pages ───────────────────────────────────────────────────────────────

@app.route('/dashboard')
@login_required
def dashboard():
    uid = session['user_id']
    conn = get_db()
    today = datetime.now().strftime('%Y-%m-%d')

    tasks_today = conn.execute(
        'SELECT * FROM tasks WHERE user_id=? AND deadline=? ORDER BY priority',
        (uid, today)).fetchall()

    upcoming = conn.execute(
        "SELECT t.*, s.name as subject_name, s.color FROM tasks t LEFT JOIN subjects s ON t.subject_id=s.id WHERE t.user_id=? AND t.deadline >= ? AND t.status != 'completed' ORDER BY t.deadline LIMIT 5",
        (uid, today)).fetchall()

    total_tasks = conn.execute('SELECT COUNT(*) as c FROM tasks WHERE user_id=?', (uid,)).fetchone()['c']
    completed_tasks = conn.execute("SELECT COUNT(*) as c FROM tasks WHERE user_id=? AND status='completed'", (uid,)).fetchone()['c']

    week_start = (datetime.now() - timedelta(days=datetime.now().weekday())).strftime('%Y-%m-%d')
    week_hours = conn.execute(
        'SELECT SUM(duration_minutes)/60.0 as h FROM study_sessions WHERE user_id=? AND date >= ?',
        (uid, week_start)).fetchone()['h'] or 0

    today_hours = conn.execute(
        'SELECT SUM(duration_minutes)/60.0 as h FROM study_sessions WHERE user_id=? AND date=?',
        (uid, today)).fetchone()['h'] or 0

    subjects = conn.execute('SELECT * FROM subjects WHERE user_id=?', (uid,)).fetchall()
    conn.close()

    quote = random.choice(MOTIVATIONAL_QUOTES)
    completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0)

    return render_template('index.html', page='dashboard',
        tasks_today=tasks_today, upcoming=upcoming,
        total_tasks=total_tasks, completed_tasks=completed_tasks,
        week_hours=round(week_hours, 1), today_hours=round(today_hours, 1),
        subjects=subjects, quote=quote, completion_rate=completion_rate)

@app.route('/planner')
@login_required
def planner():
    uid = session['user_id']
    conn = get_db()
    subjects = conn.execute('SELECT * FROM subjects WHERE user_id=? ORDER BY name', (uid,)).fetchall()
    timetable = conn.execute(
        'SELECT t.*, s.name as subject_name, s.color FROM timetable t JOIN subjects s ON t.subject_id=s.id WHERE t.user_id=? ORDER BY t.day, t.start_time',
        (uid,)).fetchall()
    conn.close()
    return render_template('index.html', page='planner', subjects=subjects, timetable=timetable)

@app.route('/tasks')
@login_required
def tasks():
    uid = session['user_id']
    conn = get_db()
    all_tasks = conn.execute(
        'SELECT t.*, s.name as subject_name, s.color FROM tasks t LEFT JOIN subjects s ON t.subject_id=s.id WHERE t.user_id=? ORDER BY t.created_at DESC',
        (uid,)).fetchall()
    subjects = conn.execute('SELECT * FROM subjects WHERE user_id=?', (uid,)).fetchall()
    conn.close()
    return render_template('index.html', page='tasks', tasks=all_tasks, subjects=subjects)

@app.route('/pomodoro')
@login_required
def pomodoro():
    uid = session['user_id']
    conn = get_db()
    subjects = conn.execute('SELECT * FROM subjects WHERE user_id=?', (uid,)).fetchall()
    today = datetime.now().strftime('%Y-%m-%d')
    today_sessions = conn.execute(
        'SELECT COUNT(*) as c FROM study_sessions WHERE user_id=? AND date=? AND session_type="pomodoro"',
        (uid, today)).fetchone()['c']
    conn.close()
    return render_template('index.html', page='pomodoro', subjects=subjects, today_sessions=today_sessions)

@app.route('/analytics')
@login_required
def analytics():
    uid = session['user_id']
    conn = get_db()
    today = datetime.now()

    # Weekly data
    weekly = []
    weekly_labels = []
    for i in range(6, -1, -1):
        d = (today - timedelta(days=i)).strftime('%Y-%m-%d')
        h = conn.execute(
            'SELECT SUM(duration_minutes)/60.0 as h FROM study_sessions WHERE user_id=? AND date=?',
            (uid, d)).fetchone()['h'] or 0
        weekly.append(round(h, 2))
        weekly_labels.append((today - timedelta(days=i)).strftime('%a'))

    # Subject hours
    subjects = conn.execute(
        'SELECT s.name, s.color, SUM(ss.duration_minutes)/60.0 as hours FROM subjects s LEFT JOIN study_sessions ss ON s.id=ss.subject_id AND ss.user_id=s.user_id WHERE s.user_id=? GROUP BY s.id',
        (uid,)).fetchall()

    # Streak
    streak = 0
    check_date = today.date()
    while True:
        d = check_date.strftime('%Y-%m-%d')
        has = conn.execute('SELECT 1 FROM study_sessions WHERE user_id=? AND date=?', (uid, d)).fetchone()
        if has:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    total_hours = conn.execute('SELECT SUM(duration_minutes)/60.0 as h FROM study_sessions WHERE user_id=?', (uid,)).fetchone()['h'] or 0
    total_tasks = conn.execute('SELECT COUNT(*) as c FROM tasks WHERE user_id=?', (uid,)).fetchone()['c']
    done_tasks = conn.execute("SELECT COUNT(*) as c FROM tasks WHERE user_id=? AND status='completed'", (uid,)).fetchone()['c']
    conn.close()

    return render_template('index.html', page='analytics',
        weekly=json.dumps(weekly), weekly_labels=json.dumps(weekly_labels),
        subjects=subjects, streak=streak,
        total_hours=round(total_hours, 1), total_tasks=total_tasks, done_tasks=done_tasks)

@app.route('/profile')
@login_required
def profile():
    uid = session['user_id']
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone()
    conn.close()
    return render_template('index.html', page='profile', user=user)

# ─── API Routes ───────────────────────────────────────────────────────────────

@app.route('/api/subjects', methods=['GET', 'POST'])
@login_required
def api_subjects():
    uid = session['user_id']
    conn = get_db()
    if request.method == 'POST':
        data = request.json
        conn.execute('INSERT INTO subjects (user_id, name, color, target_hours) VALUES (?,?,?,?)',
            (uid, data['name'], data.get('color', '#6366f1'), data.get('target_hours', 0)))
        conn.commit()
        sub = conn.execute('SELECT * FROM subjects WHERE user_id=? ORDER BY id DESC LIMIT 1', (uid,)).fetchone()
        conn.close()
        return jsonify({'success': True, 'subject': dict(sub)})
    subjects = conn.execute('SELECT * FROM subjects WHERE user_id=? ORDER BY name', (uid,)).fetchall()
    conn.close()
    return jsonify([dict(s) for s in subjects])

@app.route('/api/subjects/<int:sid>', methods=['PUT', 'DELETE'])
@login_required
def api_subject(sid):
    uid = session['user_id']
    conn = get_db()
    if request.method == 'DELETE':
        conn.execute('DELETE FROM subjects WHERE id=? AND user_id=?', (sid, uid))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    data = request.json
    conn.execute('UPDATE subjects SET name=?, color=?, target_hours=? WHERE id=? AND user_id=?',
        (data['name'], data['color'], data.get('target_hours', 0), sid, uid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/tasks', methods=['GET', 'POST'])
@login_required
def api_tasks():
    uid = session['user_id']
    conn = get_db()
    if request.method == 'POST':
        data = request.json
        conn.execute('INSERT INTO tasks (user_id, subject_id, title, description, priority, deadline) VALUES (?,?,?,?,?,?)',
            (uid, data.get('subject_id'), data['title'], data.get('description', ''),
             data.get('priority', 'medium'), data.get('deadline', '')))
        conn.commit()
        task = conn.execute('SELECT t.*, s.name as subject_name, s.color FROM tasks t LEFT JOIN subjects s ON t.subject_id=s.id WHERE t.user_id=? ORDER BY t.id DESC LIMIT 1', (uid,)).fetchone()
        conn.close()
        return jsonify({'success': True, 'task': dict(task)})
    tasks = conn.execute('SELECT t.*, s.name as subject_name, s.color FROM tasks t LEFT JOIN subjects s ON t.subject_id=s.id WHERE t.user_id=? ORDER BY t.created_at DESC', (uid,)).fetchall()
    conn.close()
    return jsonify([dict(t) for t in tasks])

@app.route('/api/tasks/<int:tid>', methods=['PUT', 'DELETE'])
@login_required
def api_task(tid):
    uid = session['user_id']
    conn = get_db()
    if request.method == 'DELETE':
        conn.execute('DELETE FROM tasks WHERE id=? AND user_id=?', (tid, uid))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    data = request.json
    if 'status' in data and len(data) == 1:
        conn.execute('UPDATE tasks SET status=? WHERE id=? AND user_id=?', (data['status'], tid, uid))
    else:
        conn.execute('UPDATE tasks SET title=?, description=?, priority=?, deadline=?, subject_id=?, status=? WHERE id=? AND user_id=?',
            (data['title'], data.get('description',''), data.get('priority','medium'),
             data.get('deadline',''), data.get('subject_id'), data.get('status','pending'), tid, uid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/sessions', methods=['POST'])
@login_required
def api_sessions():
    uid = session['user_id']
    data = request.json
    conn = get_db()
    conn.execute('INSERT INTO study_sessions (user_id, subject_id, duration_minutes, session_type, date) VALUES (?,?,?,?,?)',
        (uid, data.get('subject_id'), data['duration_minutes'], data.get('session_type','study'), data.get('date', datetime.now().strftime('%Y-%m-%d'))))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/timetable', methods=['GET', 'POST', 'DELETE'])
@login_required
def api_timetable():
    uid = session['user_id']
    conn = get_db()
    if request.method == 'POST':
        data = request.json
        conn.execute('INSERT INTO timetable (user_id, subject_id, day, start_time, end_time) VALUES (?,?,?,?,?)',
            (uid, data['subject_id'], data['day'], data['start_time'], data['end_time']))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    if request.method == 'DELETE':
        tid = request.args.get('id')
        conn.execute('DELETE FROM timetable WHERE id=? AND user_id=?', (tid, uid))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    rows = conn.execute('SELECT t.*, s.name as subject_name, s.color FROM timetable t JOIN subjects s ON t.subject_id=s.id WHERE t.user_id=? ORDER BY t.day, t.start_time', (uid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/generate-timetable', methods=['POST'])
@login_required
def generate_timetable():
    uid = session['user_id']
    conn = get_db()
    subjects = conn.execute('SELECT * FROM subjects WHERE user_id=?', (uid,)).fetchall()
    if not subjects:
        conn.close()
        return jsonify({'success': False, 'message': 'Add subjects first.'})

    conn.execute('DELETE FROM timetable WHERE user_id=?', (uid,))
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    time_slots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '19:00', '20:00']

    for day in days:
        day_subjects = random.sample(list(subjects), min(len(subjects), random.randint(2, 4)))
        used_slots = set()
        for sub in day_subjects:
            slot_idx = random.choice([i for i in range(len(time_slots)) if i not in used_slots])
            used_slots.add(slot_idx)
            start = time_slots[slot_idx]
            end_h = int(start[:2]) + 1
            end = f'{end_h:02d}:00'
            conn.execute('INSERT INTO timetable (user_id, subject_id, day, start_time, end_time) VALUES (?,?,?,?,?)',
                (uid, sub['id'], day, start, end))

    conn.commit()
    rows = conn.execute('SELECT t.*, s.name as subject_name, s.color FROM timetable t JOIN subjects s ON t.subject_id=s.id WHERE t.user_id=? ORDER BY t.day, t.start_time', (uid,)).fetchall()
    conn.close()
    return jsonify({'success': True, 'timetable': [dict(r) for r in rows]})

@app.route('/api/profile', methods=['POST'])
@login_required
def update_profile():
    uid = session['user_id']
    conn = get_db()
    data = request.form
    avatar_path = session.get('user_avatar', '')

    if 'avatar' in request.files:
        file = request.files['avatar']
        if file and file.filename:
            filename = secure_filename(f"avatar_{uid}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            avatar_path = f"/static/uploads/{filename}"

    conn.execute('UPDATE users SET name=?, theme=?, notifications=?, avatar=? WHERE id=?',
        (data.get('name', session['user_name']),
         data.get('theme', 'dark'),
         1 if data.get('notifications') else 0,
         avatar_path, uid))
    conn.commit()

    if data.get('new_password'):
        user = conn.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone()
        if check_password_hash(user['password'], data.get('current_password', '')):
            conn.execute('UPDATE users SET password=? WHERE id=?',
                (generate_password_hash(data['new_password']), uid))
            conn.commit()
        else:
            conn.close()
            return jsonify({'success': False, 'message': 'Current password is incorrect.'})

    user = conn.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone()
    conn.close()
    session['user_name'] = user['name']
    session['user_avatar'] = user['avatar']
    session['theme'] = user['theme']
    return jsonify({'success': True, 'message': 'Profile updated successfully!'})

@app.route('/api/ai-suggestions', methods=['POST'])
@login_required
def ai_suggestions():
    uid = session['user_id']
    conn = get_db()
    subjects = conn.execute('SELECT * FROM subjects WHERE user_id=?', (uid,)).fetchall()
    pending = conn.execute("SELECT COUNT(*) as c FROM tasks WHERE user_id=? AND status='pending'", (uid,)).fetchone()['c']
    today_hours = conn.execute(
        'SELECT SUM(duration_minutes)/60.0 as h FROM study_sessions WHERE user_id=? AND date=?',
        (uid, datetime.now().strftime('%Y-%m-%d'))).fetchone()['h'] or 0
    conn.close()

    suggestions = []
    if len(subjects) == 0:
        suggestions.append("🎯 Start by adding your subjects to build a personalized study plan.")
    if pending > 5:
        suggestions.append(f"⚠️ You have {pending} pending tasks. Consider breaking them into smaller chunks.")
    if today_hours < 2:
        suggestions.append("📚 You've studied less than 2 hours today. Try a focused 25-min Pomodoro session!")
    if today_hours >= 4:
        suggestions.append("🌟 Great work today! You've hit 4+ hours. Take a 15-min break to recharge.")
    suggestions.append("🧠 Spaced repetition works best: review material after 1 day, 1 week, then 1 month.")
    suggestions.append("💡 The best time to review is just before sleep — your brain consolidates memory overnight.")
    return jsonify({'suggestions': suggestions[:4]})

@app.context_processor
def inject_globals():
    return {'datetime': datetime}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
