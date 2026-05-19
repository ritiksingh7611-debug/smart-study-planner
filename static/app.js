/* ═══════════════════════════════════════════════════════════════════════════
   Smart Study Planner Pro — app.js
═══════════════════════════════════════════════════════════════════════════ */

// ─── Theme ────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const cur = html.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  fetch('/api/profile', {
    method: 'POST',
    body: (() => { const f = new FormData(); f.append('name', document.querySelector('.profile-name')?.textContent || ''); f.append('theme', next); return f; })()
  }).catch(() => {});
}
(function initTheme() {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
})();

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

// ─── Auth Toggle ──────────────────────────────────────────────────────────────
function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.querySelector('i').className = isText ? 'fas fa-eye' : 'fas fa-eye-slash';
}

// ─── Auth Forms ───────────────────────────────────────────────────────────────
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('authMsg');
  const btn = e.target.querySelector('.btn-auth');
  btn.disabled = true; btn.textContent = 'Signing in…';
  const fd = new FormData(e.target);
  try {
    const res = await fetch('/login', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) { window.location.href = data.redirect; }
    else { showAuthMsg(msg, data.message, 'error'); btn.disabled = false; btn.innerHTML = 'Sign In <i class="fas fa-arrow-right"></i>'; }
  } catch { showAuthMsg(msg, 'Network error. Please try again.', 'error'); btn.disabled = false; }
});

document.getElementById('signupForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('authMsg');
  const btn = e.target.querySelector('.btn-auth');
  btn.disabled = true; btn.textContent = 'Creating account…';
  const fd = new FormData(e.target);
  try {
    const res = await fetch('/signup', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) { window.location.href = data.redirect; }
    else { showAuthMsg(msg, data.message, 'error'); btn.disabled = false; btn.innerHTML = 'Create Account <i class="fas fa-arrow-right"></i>'; }
  } catch { showAuthMsg(msg, 'Network error.', 'error'); btn.disabled = false; }
});

document.getElementById('forgotForm')?.addEventListener('submit', e => {
  e.preventDefault();
  showAuthMsg(document.getElementById('authMsg'), 'If this email exists, a reset link has been sent.', 'success');
});

function showAuthMsg(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = 'auth-msg ' + type;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => { t.className = 'toast'; }, 3200);
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById('modalOverlay')?.classList.add('active');
  document.getElementById(id)?.classList.add('active');
}
function closeAllModals() {
  document.getElementById('modalOverlay')?.classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// ─── AI Suggestions ───────────────────────────────────────────────────────────
async function loadAISuggestions() {
  const el = document.getElementById('aiSuggestions');
  if (!el) return;
  el.innerHTML = '<div class="ai-loading"><i class="fas fa-spinner fa-spin"></i> Analyzing your progress...</div>';
  try {
    const res = await fetch('/api/ai-suggestions', { method: 'POST' });
    const data = await res.json();
    el.innerHTML = data.suggestions.map(s =>
      `<div class="ai-suggestion-item">${s}</div>`
    ).join('');
  } catch {
    el.innerHTML = '<div class="ai-suggestion-item">💡 Keep up the great work! Consistency is key to success.</div>';
  }
}

// ─── Subjects ─────────────────────────────────────────────────────────────────
async function addSubject() {
  const name = document.getElementById('subName')?.value.trim();
  const color = document.getElementById('subColor')?.value || '#6366f1';
  const hours = parseFloat(document.getElementById('subHours')?.value) || 0;
  if (!name) { showToast('Subject name is required', 'error'); return; }
  try {
    const res = await fetch('/api/subjects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, target_hours: hours })
    });
    const data = await res.json();
    if (data.success) {
      closeAllModals();
      showToast('Subject added!');
      setTimeout(() => location.reload(), 800);
    }
  } catch { showToast('Error adding subject', 'error'); }
}

async function deleteSubject(id) {
  if (!confirm('Delete this subject?')) return;
  const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) {
    document.querySelector(`.subject-card[data-id="${id}"]`)?.remove();
    showToast('Subject deleted');
  }
}

// ─── Timetable ────────────────────────────────────────────────────────────────
async function addTimetableSlot() {
  const subjectId = document.getElementById('ttSubject')?.value;
  const day = document.getElementById('ttDay')?.value;
  const start = document.getElementById('ttStart')?.value;
  const end = document.getElementById('ttEnd')?.value;
  if (!subjectId || !day || !start || !end) { showToast('Fill all fields', 'error'); return; }
  if (start >= end) { showToast('End time must be after start time', 'error'); return; }
  try {
    const res = await fetch('/api/timetable', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_id: subjectId, day, start_time: start, end_time: end })
    });
    const data = await res.json();
    if (data.success) { closeAllModals(); showToast('Slot added!'); setTimeout(() => location.reload(), 800); }
  } catch { showToast('Error', 'error'); }
}

async function deleteTTSlot(id, el) {
  const res = await fetch(`/api/timetable?id=${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) { el.closest('.tt-slot')?.remove(); showToast('Slot removed'); }
}

async function generateTimetable() {
  const btn = event.target;
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…';
  try {
    const res = await fetch('/api/generate-timetable', { method: 'POST' });
    const data = await res.json();
    if (data.success) { showToast('AI timetable generated! 🎉'); setTimeout(() => location.reload(), 1000); }
    else { showToast(data.message || 'Add subjects first', 'error'); }
  } catch { showToast('Error', 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-magic"></i> AI Generate'; }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
function editTask(card) {
  const id = card.dataset.id;
  document.getElementById('editTaskId').value = id;
  document.getElementById('taskTitle').value = card.dataset.title;
  document.getElementById('taskDesc').value = card.dataset.desc;
  document.getElementById('taskPriority').value = card.dataset.priority;
  document.getElementById('taskDeadline').value = card.dataset.deadline;
  document.getElementById('taskSubject').value = card.dataset.subject;
  document.getElementById('taskModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Task';
  openModal('addTaskModal');
}

async function saveTask() {
  const id = document.getElementById('editTaskId')?.value;
  const title = document.getElementById('taskTitle')?.value.trim();
  if (!title) { showToast('Task title required', 'error'); return; }
  const body = {
    title,
    description: document.getElementById('taskDesc')?.value || '',
    priority: document.getElementById('taskPriority')?.value || 'medium',
    deadline: document.getElementById('taskDeadline')?.value || '',
    subject_id: document.getElementById('taskSubject')?.value || null,
    status: 'pending'
  };
  try {
    let res;
    if (id) {
      res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    const data = await res.json();
    if (data.success) {
      closeAllModals();
      showToast(id ? 'Task updated!' : 'Task added!');
      setTimeout(() => location.reload(), 800);
    }
  } catch { showToast('Error saving task', 'error'); }
}

async function deleteTask(id, el) {
  if (!confirm('Delete this task?')) return;
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) {
    const card = el.closest('.task-card');
    const col = card.closest('.kanban-col');
    card.style.opacity = '0'; card.style.transform = 'scale(.9)';
    setTimeout(() => {
      card.remove();
      updateKanbanCounts();
    }, 250);
    showToast('Task deleted');
  }
}

async function moveTask(id, newStatus, el) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  });
  const data = await res.json();
  if (data.success) {
    const card = el.closest('.task-card');
    const targetCol = document.getElementById(`col-${newStatus}`);
    if (targetCol && card) {
      card.style.opacity = '0'; card.style.transform = 'translateY(-8px)';
      setTimeout(() => {
        card.style.opacity = ''; card.style.transform = '';
        card.dataset.status = newStatus;
        card.className = `task-card priority-${card.dataset.priority}`;
        targetCol.appendChild(card);
        // Update status buttons
        const btnArea = card.querySelector('.task-status-btns');
        btnArea.innerHTML = '';
        if (newStatus !== 'pending') btnArea.innerHTML += `<button class="status-btn" onclick="moveTask(${id}, 'pending', this)">To Do</button>`;
        if (newStatus !== 'in-progress') btnArea.innerHTML += `<button class="status-btn" onclick="moveTask(${id}, 'in-progress', this)">In Progress</button>`;
        if (newStatus !== 'completed') btnArea.innerHTML += `<button class="status-btn status-done" onclick="moveTask(${id}, 'completed', this)">✓ Done</button>`;
        updateKanbanCounts();
      }, 200);
    }
    showToast(`Moved to ${newStatus.replace('-', ' ')}`);
  }
}

function updateKanbanCounts() {
  ['pending','in-progress','completed'].forEach(s => {
    const col = document.getElementById(`col-${s}`);
    const cnt = document.getElementById(`count-${s}`);
    if (col && cnt) cnt.textContent = col.querySelectorAll('.task-card').length;
  });
}

function filterTasks() {
  const q = document.getElementById('taskSearch')?.value.toLowerCase() || '';
  const pri = document.getElementById('filterPriority')?.value || '';
  const sta = document.getElementById('filterStatus')?.value || '';
  document.querySelectorAll('.task-card').forEach(card => {
    const matchQ = !q || card.querySelector('.task-title')?.textContent.toLowerCase().includes(q);
    const matchP = !pri || card.dataset.priority === pri;
    const matchS = !sta || card.dataset.status === sta;
    card.style.display = (matchQ && matchP && matchS) ? '' : 'none';
  });
}

// Clear edit id when opening add modal freshly
document.addEventListener('click', e => {
  if (e.target.closest('[onclick="openModal(\'addTaskModal\')"]')) {
    document.getElementById('editTaskId').value = '';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskDeadline').value = '';
    document.getElementById('taskSubject').value = '';
    document.getElementById('taskModalTitle').innerHTML = '<i class="fas fa-plus"></i> Add Task';
  }
});

// ─── Pomodoro ─────────────────────────────────────────────────────────────────
(function initPomodoro() {
  if (!document.querySelector('.pomo-ring')) return;

  const MODES = { study: 25*60, short: 5*60, long: 15*60 };
  let mode = 'study', timeLeft = MODES.study, running = false, intervalId = null;
  let cycles = 0, sessionSubject = null;
  const circumference = 553; // 2π × 88

  const display = document.getElementById('timerDisplay');
  const ring = document.getElementById('timerRing');
  const label = document.getElementById('timerLabel');
  const playIcon = document.getElementById('playIcon');
  const cycleEl = document.getElementById('pomoCycles');

  // Inject SVG gradient
  const svg = document.querySelector('.pomo-ring');
  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML = `<linearGradient id="pomoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#6366f1"/>
    <stop offset="100%" stop-color="#22d3a8"/>
  </linearGradient>`;
  svg.prepend(defs);

  function fmt(s) {
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }
  function updateRing() {
    const total = MODES[mode];
    const pct = timeLeft / total;
    ring.style.strokeDashoffset = circumference * (1 - pct);
  }
  function updateDisplay() {
    if (display) display.textContent = fmt(timeLeft);
    updateRing();
  }
  function tick() {
    if (timeLeft > 0) { timeLeft--; updateDisplay(); }
    else {
      clearInterval(intervalId); running = false;
      playIcon.className = 'fas fa-play';
      playBeep();
      if (mode === 'study') {
        cycles++;
        if (cycleEl) cycleEl.textContent = cycles;
        logSession();
        addPomoLog('🍅 Study session complete!');
        showToast('Session done! Take a break 🎉');
      } else {
        addPomoLog('✅ Break over — back to work!');
        showToast('Break done! Start studying 📚');
      }
    }
  }

  window.toggleTimer = function() {
    if (running) {
      clearInterval(intervalId); running = false;
      playIcon.className = 'fas fa-play';
    } else {
      intervalId = setInterval(tick, 1000); running = true;
      playIcon.className = 'fas fa-pause';
    }
  };
  window.resetTimer = function() {
    clearInterval(intervalId); running = false;
    timeLeft = MODES[mode]; updateDisplay();
    playIcon.className = 'fas fa-play';
  };
  window.skipSession = function() {
    clearInterval(intervalId); running = false;
    timeLeft = 0; updateDisplay();
    playIcon.className = 'fas fa-play';
    addPomoLog('⏭ Session skipped');
  };
  window.setMode = function(m, btn) {
    clearInterval(intervalId); running = false;
    mode = m; timeLeft = MODES[m];
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const labels = { study:'FOCUS TIME', short:'SHORT BREAK', long:'LONG BREAK' };
    if (label) label.textContent = labels[m];
    playIcon.className = 'fas fa-play';
    updateDisplay();
  };

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0,150,300].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + delay/1000);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay/1000 + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay/1000 + 0.3);
        osc.start(ctx.currentTime + delay/1000);
        osc.stop(ctx.currentTime + delay/1000 + 0.4);
      });
    } catch(e) {}
  }

  async function logSession() {
    const subjectId = document.getElementById('pomoSubject')?.value || null;
    const today = new Date().toISOString().split('T')[0];
    try {
      await fetch('/api/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_minutes: 25, session_type: 'pomodoro', subject_id: subjectId, date: today })
      });
      const el = document.getElementById('sessionsToday');
      if (el) el.textContent = parseInt(el.textContent || 0) + 1;
    } catch {}
  }

  function addPomoLog(text) {
    const log = document.getElementById('pomoLog');
    if (!log) return;
    const time = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const item = document.createElement('div');
    item.className = 'pomo-log-item';
    item.innerHTML = `<span>${text}</span><span>${time}</span>`;
    log.prepend(item);
  }

  updateDisplay();
})();

// ─── Analytics ────────────────────────────────────────────────────────────────
function initAnalytics(weekly, labels, subjectNames, subjectHours, subjectColors) {
  const chartDefaults = {
    responsive: true,
    plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text2').trim(), font: { family: 'Sora', size: 12 } } } },
    scales: {
      x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text3').trim() }, grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border').trim() } },
      y: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text3').trim() }, grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border').trim() } }
    }
  };

  // Weekly bar chart
  const wCtx = document.getElementById('weeklyChart');
  if (wCtx) new Chart(wCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Hours Studied',
        data: weekly,
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: false } } }
  });

  // Subject doughnut
  const sCtx = document.getElementById('subjectChart');
  if (sCtx) {
    const colors = subjectColors.length ? subjectColors : ['#6366f1','#22d3a8','#fb923c','#f43f5e','#fbbf24'];
    new Chart(sCtx, {
      type: 'doughnut',
      data: {
        labels: subjectNames.length ? subjectNames : ['No data'],
        datasets: [{ data: subjectHours.map(h => h||0).length ? subjectHours.map(h=>h||0) : [1], backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text2').trim(), padding: 12, font: { family: 'Sora', size: 11 } } } } }
    });
  }

  // Trend line chart (uses weekly data as trend)
  const tCtx = document.getElementById('trendChart');
  if (tCtx) new Chart(tCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Productivity',
        data: weekly,
        borderColor: '#22d3a8',
        backgroundColor: 'rgba(34,211,168,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#22d3a8',
        pointRadius: 4
      }]
    },
    options: { ...chartDefaults }
  });
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function previewAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('avatarPreview');
    if (prev) {
      if (prev.tagName === 'IMG') prev.src = e.target.result;
      else {
        const img = document.createElement('img');
        img.src = e.target.result; img.className = 'profile-avatar'; img.id = 'avatarPreview';
        prev.replaceWith(img);
      }
    }
  };
  reader.readAsDataURL(file);
}

document.getElementById('profileForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = document.getElementById('profileMsg');
  const btn = e.target.querySelector('.btn-primary');
  btn.disabled = true; btn.textContent = 'Saving…';
  const fd = new FormData(e.target);
  const avatarInput = document.getElementById('avatarInput');
  if (avatarInput?.files[0]) fd.append('avatar', avatarInput.files[0]);
  try {
    const res = await fetch('/api/profile', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showAuthMsg(msg, data.message, 'success');
      showToast('Profile saved!');
      // Apply theme
      const theme = document.getElementById('themeSelect')?.value || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      const icon = document.getElementById('themeIcon');
      if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    } else { showAuthMsg(msg, data.message, 'error'); }
  } catch { showAuthMsg(msg, 'Error saving profile.', 'error'); }
  btn.disabled = false; btn.textContent = 'Save Changes';
});

async function changePassword() {
  const cur = document.getElementById('currentPwd')?.value;
  const nw = document.getElementById('newPwd')?.value;
  const cf = document.getElementById('confirmPwd')?.value;
  if (!cur || !nw || !cf) { showToast('All password fields required', 'error'); return; }
  if (nw !== cf) { showToast('Passwords do not match', 'error'); return; }
  if (nw.length < 6) { showToast('Password must be 6+ characters', 'error'); return; }
  const name = document.querySelector('input[name="name"]')?.value || '';
  const fd = new FormData();
  fd.append('name', name); fd.append('current_password', cur); fd.append('new_password', nw);
  try {
    const res = await fetch('/api/profile', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) { showToast('Password updated!'); document.getElementById('currentPwd').value = ''; document.getElementById('newPwd').value = ''; document.getElementById('confirmPwd').value = ''; }
    else { showToast(data.message || 'Error updating password', 'error'); }
  } catch { showToast('Error', 'error'); }
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const search = document.getElementById('taskSearch');
    if (search) search.focus();
  }
});