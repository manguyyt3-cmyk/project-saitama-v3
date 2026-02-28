const exercises = ["pushups", "situps", "squats"]

// ─── Date Helpers ────────────────────────────────────────────────────────────

function todayString() {
  return new Date().toISOString().split("T")[0]
}

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1)
  const d2 = new Date(dateStr2)
  return Math.round(Math.abs((d2 - d1) / (1000 * 60 * 60 * 24)))
}

function yesterdayString() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split("T")[0]
}

// ─── Rep Generator ────────────────────────────────────────────────────────────

function generateReps() {
  const min = 50
  const max = 200
  const step = Math.random() < 0.5 ? 5 : 10
  const raw = Math.random() * (max - min) + min
  return Math.round(raw / step) * step
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function loadStats() {
  return JSON.parse(localStorage.getItem("lifetimeStats")) || {
    pushups: 0,
    situps: 0,
    squats: 0,
    workoutsCompleted: 0,
    restDays: 0,
    streak: 0,
    lastCompleted: "",   // date of last workout OR rest day
    lastRestDay: ""
  }
}

function saveStats(stats) {
  localStorage.setItem("lifetimeStats", JSON.stringify(stats))
}

function loadToday() {
  return JSON.parse(localStorage.getItem("todayWorkout"))
}

function saveToday(data) {
  localStorage.setItem("todayWorkout", JSON.stringify(data))
}

// ─── Streak Logic ─────────────────────────────────────────────────────────────
// Rules:
//   • Completing a workout OR logging a rest day counts as "active"
//   • If lastCompleted was yesterday → streak continues
//   • If lastCompleted was today → already counted, no change
//   • Anything older → streak resets to 1

function calculateNewStreak(stats, completionDate) {
  const last = stats.lastCompleted

  if (!last) return 1                          // first ever activity
  if (last === completionDate) return stats.streak  // already logged today
  if (last === yesterdayString()) return stats.streak + 1  // consecutive day
  return 1                                     // gap detected → reset
}

// ─── Workout Generator ────────────────────────────────────────────────────────

function generateWorkout() {
  let today = loadToday()
  if (today && today.date === todayString()) return today

  today = {
    date: todayString(),
    goals: {},
    done: {},
    completed: false,
    isRestDay: false
  }

  exercises.forEach(ex => {
    today.goals[ex] = generateReps()
    today.done[ex] = 0
  })

  saveToday(today)
  return today
}

// ─── Completion Check ─────────────────────────────────────────────────────────

function checkCompletion(today, stats) {
  const complete = exercises.every(ex => today.done[ex] >= today.goals[ex])
  if (!complete || today.completed) return

  today.completed = true
  stats.workoutsCompleted++
  stats.streak = calculateNewStreak(stats, today.date)
  stats.lastCompleted = today.date
}

// ─── Rep Tracking ─────────────────────────────────────────────────────────────

function addRep(ex, amount) {
  const today = loadToday()
  const stats = loadStats()

  today.done[ex] = Math.max(0, today.done[ex] + amount)
  if (amount > 0) stats[ex] += amount

  checkCompletion(today, stats)

  saveToday(today)
  saveStats(stats)

  renderWorkout()
  renderStats()
}

// ─── Rest Day ─────────────────────────────────────────────────────────────────

function logRestDay() {
  const today = generateWorkout()
  const stats = loadStats()

  if (today.isRestDay) {
    showToast("Already logged a rest day today!")
    return
  }

  today.isRestDay = true
  saveToday(today)

  stats.restDays = (stats.restDays || 0) + 1
  stats.streak = calculateNewStreak(stats, today.date)
  stats.lastCompleted = today.date
  stats.lastRestDay = today.date
  saveStats(stats)

  showToast("🛋️ Rest day logged! Streak preserved.")
  renderStats()
  renderWorkout()
}

// ─── Spin Wheel ───────────────────────────────────────────────────────────────

function spinWheel(callback) {
  const wheel = document.getElementById("wheel")
  wheel.classList.add("spinning")

  // Generate a new workout for today if not already done
  // (clear old one if date changed)
  const existing = loadToday()
  if (existing && existing.date !== todayString()) {
    localStorage.removeItem("todayWorkout")
  }

  const rotation = 1080 + Math.random() * 720
  wheel.style.setProperty("--spin-deg", `${rotation}deg`)
  wheel.style.transform = `rotate(${rotation}deg)`

  setTimeout(() => {
    wheel.classList.remove("spinning")
    callback()
  }, 2000)
}

function showResults() {
  const btn = document.getElementById("spinBtn")
  btn.disabled = true

  spinWheel(() => {
    const today = generateWorkout()
    const div = document.getElementById("results")

    div.innerHTML = exercises.map(ex =>
      `<div class="result-chip"><span class="result-exercise">${ex}</span><span class="result-reps">${today.goals[ex]}</span></div>`
    ).join("")

    div.classList.add("visible")
    btn.disabled = false

    // Auto-navigate to workout after a beat
    setTimeout(() => showScreen("workout"), 1200)
  })
}

// ─── Render: Workout ──────────────────────────────────────────────────────────

function renderWorkout() {
  const today = generateWorkout()
  const list = document.getElementById("workoutList")
  list.innerHTML = ""

  if (today.isRestDay) {
    list.innerHTML = `<div class="rest-banner">🛋️ REST DAY<p>Streak preserved. See you tomorrow, hero.</p></div>`
    return
  }

  exercises.forEach(ex => {
    const pct = Math.min(100, Math.round((today.done[ex] / today.goals[ex]) * 100))
    const done = today.done[ex] >= today.goals[ex]

    const card = document.createElement("div")
    card.className = `card ${done ? "card--done" : ""}`

    card.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${ex}</h3>
        <div class="card-header-right">
          <span class="card-badge">${today.done[ex]} <span class="card-goal">/ ${today.goals[ex]}</span></span>
          ${done ? '<span class="card-complete-badge">✓</span>' : ""}
        </div>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
      <div class="card-actions">
        <button class="btn-rep btn-minus" onclick="addRep('${ex}', -1)">−1</button>
        <button class="btn-rep" onclick="addRep('${ex}', 1)">+1</button>
        <button class="btn-rep" onclick="addRep('${ex}', 5)">+5</button>
        <button class="btn-rep btn-big" onclick="addRep('${ex}', 10)">+10</button>
      </div>
    `
    list.appendChild(card)
  })

  // Show rest day button
  if (!today.isRestDay && !today.completed) {
    const restBtn = document.createElement("button")
    restBtn.className = "btn-rest"
    restBtn.textContent = "🛋️ Log Rest Day"
    restBtn.onclick = logRestDay
    list.appendChild(restBtn)
  }

  if (today.completed) {
    list.insertAdjacentHTML("afterbegin", `<div class="complete-banner">🏆 WORKOUT COMPLETE!</div>`)
  }
}

// ─── Render: Stats ────────────────────────────────────────────────────────────

function renderStats() {
  const stats = loadStats()
  const div = document.getElementById("statsList")

  // Streak status
  const last = stats.lastCompleted
  const today = todayString()
  const yesterday = yesterdayString()
  const streakAlive = last === today || last === yesterday
  const streakDisplay = streakAlive ? stats.streak : 0

  div.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card stat-streak">
        <div class="stat-value">${streakDisplay}</div>
        <div class="stat-label">🔥 Day Streak</div>
        ${!streakAlive && stats.streak > 0 ? '<div class="streak-warning">Streak reset — get back on it!</div>' : ""}
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.workoutsCompleted}</div>
        <div class="stat-label">Workouts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.restDays || 0}</div>
        <div class="stat-label">🛋️ Rest Days</div>
      </div>
    </div>
    <div class="lifetime-grid">
      <div class="lifetime-row"><span>Pushups</span><strong>${stats.pushups.toLocaleString()}</strong></div>
      <div class="lifetime-row"><span>Situps</span><strong>${stats.situps.toLocaleString()}</strong></div>
      <div class="lifetime-row"><span>Squats</span><strong>${stats.squats.toLocaleString()}</strong></div>
    </div>
    <button class="btn-reset" onclick="confirmReset()">↺ Reset All Stats</button>
  `
}

// ─── Notifications ────────────────────────────────────────────────────────────

async function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("Notifications not supported in this browser.")
    return
  }

  const permission = await Notification.requestPermission()

  if (permission === "granted") {
    // Register service worker and subscribe
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready
      showToast("🔔 Notifications enabled! We'll remind you to train.")

      // Schedule a test notification so user sees it working
      setTimeout(() => {
        reg.showNotification("Project Saitama 💪", {
          body: "Don't forget your daily training, hero!",
          icon: "icon-192.png",
          badge: "icon-192.png",
          tag: "daily-reminder"
        })
      }, 3000)
    }
  } else {
    showToast("Notifications blocked. Enable them in browser settings.")
  }
}

// ─── Reset Stats ──────────────────────────────────────────────────────────────

function confirmReset() {
  const div = document.getElementById("statsList")

  // Swap in a confirmation prompt inline
  const confirmEl = document.createElement("div")
  confirmEl.className = "reset-confirm"
  confirmEl.innerHTML = `
    <p>Wipe all lifetime stats?<br><span>This cannot be undone.</span></p>
    <div class="reset-confirm-actions">
      <button class="btn-reset-cancel" onclick="renderStats()">Cancel</button>
      <button class="btn-reset-confirm" onclick="resetStats()">Yes, reset</button>
    </div>
  `
  div.appendChild(confirmEl)
}

function resetStats() {
  localStorage.removeItem("lifetimeStats")
  localStorage.removeItem("todayWorkout")
  showToast("Stats wiped. Start fresh, hero.")
  renderStats()
  renderWorkout()
}

// ─── Screen Navigation ────────────────────────────────────────────────────────

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"))
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"))

  const screenMap = { spin: "spinScreen", workout: "workoutScreen", stats: "statsScreen" }
  const btnMap = { spin: "navSpin", workout: "navWorkout", stats: "navStats" }

  document.getElementById(screenMap[name])?.classList.remove("hidden")
  document.getElementById(btnMap[name])?.classList.add("active")
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message) {
  const existing = document.getElementById("toast")
  if (existing) existing.remove()

  const toast = document.createElement("div")
  toast.id = "toast"
  toast.className = "toast"
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => toast.classList.add("toast--visible"), 10)
  setTimeout(() => {
    toast.classList.remove("toast--visible")
    setTimeout(() => toast.remove(), 400)
  }, 3000)
}

// ─── Service Worker Registration ──────────────────────────────────────────────

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js")
    .catch(err => console.warn("SW registration failed:", err))
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.getElementById("spinBtn").addEventListener("click", showResults)
document.getElementById("notifBtn").addEventListener("click", requestNotifications)

renderWorkout()
renderStats()
