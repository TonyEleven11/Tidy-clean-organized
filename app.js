/* =========================================================================
   Tidy, Clean, Organized — task list & logic
   -------------------------------------------------------------------------
   Tasks are managed entirely from within the app (tap "+" on the All Tasks
   tab to add one, tap any task row there to rename it, change its
   interval, mark it done, or delete it).

   DEFAULT_TASKS below is only a *seed* — it's copied into this phone's
   storage the very first time the app is opened. After that, editing this
   file will NOT change tasks that already exist on a phone that's used the
   app before (their copy lives in localStorage). It only affects a brand
   new install (or one where site data has been cleared).

   Two kinds of tasks exist in the data model:
   1) "interval" — repeats every N days since it was last marked done.
      This is the only kind the in-app "+" form creates.
   2) "annual" — pinned to specific calendar months (e.g. flea bombs in
      September and January). Only created by hand in this seed list; the
      in-app form doesn't offer this (it's a rare case). An annual task can
      still be renamed or deleted from the app, just not converted to a
      different set of months without editing this file and starting fresh.
   ========================================================================= */

// Shown in the Today tab's greeting. Change this if the app is ever used
// by someone else.
const USER_NAME = "Tony";

const DEFAULT_TASKS = [
  // Daily
  { id: "tidy-up", name: "Tidy up", kind: "interval", days: 1 },

  // Every 3 days
  { id: "fold-clothing", name: "Hang or fold some clothing", kind: "interval", days: 3 },

  // Weekly
  { id: "sweep-floor", name: "Sweep floor", kind: "interval", days: 7 },
  { id: "clean-fridge", name: "Clean fridge", kind: "interval", days: 7 },
  { id: "clean-bathroom-floor", name: "Clean bathroom floor", kind: "interval", days: 7 },
  { id: "clean-bathroom-sink-toilet", name: "Clean bathroom sink and toilet", kind: "interval", days: 7 },
  { id: "clean-microwave", name: "Clean microwave", kind: "interval", days: 7 },

  // Every 2 weeks
  { id: "change-bedsheets", name: "Change bed sheets", kind: "interval", days: 14 },
  { id: "wash-bedsheets", name: "Wash bed sheets", kind: "interval", days: 14 },
  { id: "mop-floor", name: "Mop part of floor", kind: "interval", days: 14 },

  // Monthly
  { id: "dust-cornices", name: "Dust cornices for cobwebs", kind: "interval", days: 30 },
  { id: "clean-outside", name: "Clean outside", kind: "interval", days: 30 },
  { id: "clean-windows", name: "Clean windows", kind: "interval", days: 30 },

  // Every ~5 months
  { id: "wash-window-nets", name: "Wash window nets", kind: "interval", days: 152 },

  // Twice a year, pinned to specific months
  { id: "flea-bombs", name: "Flea bombs (insect treatment)", kind: "annual", months: [9, 1] },
];

/* ========================================================================
   Storage
   ------------------------------------------------------------------------
   Two separate things are stored in localStorage:
     - tidyAppTasks.v1  — the list of tasks itself (seeded from
       DEFAULT_TASKS on first run, then edited via the app from then on).
     - tidyAppState.v1  — { [taskId]: lastDoneTimestampMs }, i.e. when each
       task was last marked done.
   ======================================================================== */

const TASKS_KEY = "tidyAppTasks.v1";
const STATE_KEY = "tidyAppState.v1";

function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) {
    console.warn("Could not read saved tasks, reseeding from defaults.", e);
  }
  const seeded = DEFAULT_TASKS.map((t) => ({ ...t }));
  saveTasks(seeded);
  return seeded;
}

function saveTasks(taskList) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(taskList));
  } catch (e) {
    console.warn("Could not save tasks.", e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("Could not read saved state, starting fresh.", e);
    return {};
  }
}

function saveState(s) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn("Could not save state.", e);
  }
}

let tasks = loadTasks();
let state = loadState();

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "task"
  );
}

function makeUniqueId(name) {
  const base = slugify(name);
  let id = base;
  let n = 2;
  const existingIds = new Set(tasks.map((t) => t.id));
  while (existingIds.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

/* ========================================================================
   Date helpers
   ======================================================================== */

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function relativeAgoText(lastDone, now) {
  const n = daysBetween(lastDone, now);
  if (n === 0) return "today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}

/* ========================================================================
   Icon + color per task
   ------------------------------------------------------------------------
   Purely cosmetic, guessed from the task name so tasks you add yourself
   also get a reasonable icon without any extra input. Falls back to a
   generic sparkle/soap icon if nothing matches.
   ======================================================================== */

const ICON_RULES = [
  [/flea|insect|pest/, "🐜", "#fee2e2"],
  [/bed ?sheets?|\bsheets?\b/, "🛏️", "#ede9fe"],
  [/bathroom|toilet|\bsink\b/, "🛁", "#cffafe"],
  [/fridge|refrigerator/, "🧊", "#dbeafe"],
  [/microwave|kitchen|dish(es)?/, "🍽️", "#fef3c7"],
  [/window/, "🪟", "#e0f2fe"],
  [/floor|sweep|vacuum|\bmop\b/, "🧹", "#fef9c3"],
  [/cornice|cobweb|\bdust/, "🕸️", "#e5e7eb"],
  [/\bcar\b|vehicle/, "🚗", "#ffe4e6"],
  [/\bplant/, "🪴", "#dcfce7"],
  [/garden|outside|lawn|\byard\b/, "🏡", "#fee7c9"],
  [/laundry|clothing|\bcloth/, "🧺", "#fae8ff"],
  [/rubbish|trash|\bbin\b|garbage/, "🗑️", "#e5e7eb"],
  [/tidy/, "✨", "#ffedd5"],
];

function getTaskIcon(task) {
  const n = task.name.toLowerCase();
  for (const [re, icon] of ICON_RULES) {
    if (re.test(n)) return icon;
  }
  return "🧼";
}

function getTaskIconBg(task) {
  const n = task.name.toLowerCase();
  for (const [re, , bg] of ICON_RULES) {
    if (re.test(n)) return bg;
  }
  return "#ffedd5";
}

function frequencyLabel(task) {
  if (task.kind === "interval") {
    return `Every ${task.days} day${task.days === 1 ? "" : "s"}`;
  }
  if (task.kind === "annual") {
    const abbrev = task.months
      .map((m) => new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "short" }))
      .join(" & ");
    return `${abbrev} (yearly)`;
  }
  return "";
}

// Compact variant (no "Every") for the narrow FREQ. column on the All
// Tasks table, so it fits on one line without wrapping.
function frequencyLabelCompact(task) {
  if (task.kind === "interval") {
    return `${task.days} day${task.days === 1 ? "" : "s"}`;
  }
  if (task.kind === "annual") {
    return task.months
      .map((m) => new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "short" }))
      .join(" & ");
  }
  return "";
}

/* ========================================================================
   Status calculation
   ------------------------------------------------------------------------
   Every task, whether "interval" or "annual", ends up with:
     - lastDone: Date or null
     - overdueDays: whole days past its due date (negative = not due yet)
     - period: the task's "typical" cycle length in days, used to turn
       overdueDays into a comparable 0..1..2+ score across different tasks
     - score: overdueDays / period. score >= 0 means due, score >= 1 means
       overdue by a full extra cycle (this is what triggers red).
     - label: short human text for the row
   ======================================================================== */

function annualTriggerDates(months, today) {
  const dates = [];
  for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 1; y++) {
    for (const m of months) {
      dates.push(new Date(y, m - 1, 1));
    }
  }
  dates.sort((a, b) => a - b);
  return dates;
}

function getTaskStatus(task, now) {
  const lastDoneMs = state[task.id];
  const lastDone = lastDoneMs ? new Date(lastDoneMs) : null;

  if (task.kind === "interval") {
    const period = task.days;
    if (!lastDone) {
      return {
        lastDone: null,
        overdueDays: null,
        period,
        score: Infinity,
        label: "Never done",
      };
    }
    const daysSince = daysBetween(lastDone, now);
    const overdueDays = daysSince - period;
    const score = overdueDays / period;
    let label;
    if (daysSince === 0) label = "Done today";
    else if (daysSince === 1) label = "Done yesterday";
    else label = `${daysSince} days ago`;
    return { lastDone, overdueDays, period, score, label };
  }

  if (task.kind === "annual") {
    const period = Math.round(365 / task.months.length);
    const triggers = annualTriggerDates(task.months, now);

    let dueDate;
    if (lastDone) {
      dueDate = triggers.find((d) => d > startOfDay(lastDone));
    }
    if (!dueDate) {
      const past = triggers.filter((d) => d <= startOfDay(now));
      dueDate = past.length ? past[past.length - 1] : triggers[0];
    }

    const overdueDays = daysBetween(dueDate, now);
    const score = overdueDays / period;

    let label;
    if (overdueDays > 0) label = `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
    else if (overdueDays === 0) label = "Due today";
    else label = `Due in ${-overdueDays} day${-overdueDays === 1 ? "" : "s"}`;

    return { lastDone, overdueDays, period, score, label };
  }

  throw new Error(`Unknown task kind: ${task.kind}`);
}

function getStatusColor(status) {
  if (status.score === Infinity) return "red";
  if (status.score >= 1) return "red";
  if (status.score >= 0) return "amber";
  return "green";
}

function isDoneToday(status, now) {
  return !!status.lastDone && daysBetween(status.lastDone, now) === 0;
}

/* ========================================================================
   Tab switching
   ======================================================================== */

let currentTab = "today";

const viewToday = document.getElementById("view-today");
const viewAll = document.getElementById("view-all");
const tabTodayBtn = document.getElementById("tab-today-btn");
const tabAllBtn = document.getElementById("tab-all-btn");

function setTab(tab) {
  currentTab = tab;
  viewToday.hidden = tab !== "today";
  viewAll.hidden = tab !== "all";
  tabTodayBtn.classList.toggle("active", tab === "today");
  tabAllBtn.classList.toggle("active", tab === "all");
}

tabTodayBtn.addEventListener("click", () => setTab("today"));
tabAllBtn.addEventListener("click", () => setTab("all"));

/* ========================================================================
   Rendering — Today tab
   ======================================================================== */

const todayHeaderEl = document.getElementById("today-header");
const todayListEl = document.getElementById("today-list");
const todayEmptyEl = document.getElementById("today-empty");
const todayBannerEl = document.getElementById("today-banner");

function greetingParts(now) {
  const hour = now.getHours();
  if (hour < 12) return { icon: "☀️", text: "Good morning" };
  if (hour < 18) return { icon: "🌤️", text: "Good afternoon" };
  return { icon: "🌙", text: "Good evening" };
}

function renderTodayHeader(done, total) {
  const now = new Date();
  const { icon, text } = greetingParts(now);

  todayHeaderEl.innerHTML = "";

  const greetRow = document.createElement("div");
  greetRow.className = "greet-row";

  const greetIcon = document.createElement("span");
  greetIcon.className = "greet-icon";
  greetIcon.textContent = icon;

  const greetText = document.createElement("div");
  greetText.className = "greet-text";
  const h1 = document.createElement("h1");
  h1.textContent = `${text}, ${USER_NAME}!`;
  const sub = document.createElement("p");
  sub.textContent = "Let's get things done!";
  greetText.appendChild(h1);
  greetText.appendChild(sub);

  greetRow.appendChild(greetIcon);
  greetRow.appendChild(greetText);

  if (total > 0) {
    const pct = Math.round((done / total) * 100);

    const ring = document.createElement("div");
    ring.className = "progress-ring";
    ring.style.background = `conic-gradient(var(--orange) ${pct}%, #fde3c8 0)`;

    const inner = document.createElement("div");
    inner.className = "progress-ring-inner";
    const count = document.createElement("span");
    count.className = "progress-count";
    count.textContent = `${done}/${total}`;
    inner.appendChild(count);
    ring.appendChild(inner);

    const label = document.createElement("span");
    label.className = "progress-label";
    label.textContent = "done today";

    const ringWrap = document.createElement("div");
    ringWrap.className = "ring-wrap";
    ringWrap.appendChild(ring);
    ringWrap.appendChild(label);

    greetRow.appendChild(ringWrap);
  }

  todayHeaderEl.appendChild(greetRow);

  const sectionLabel = document.createElement("p");
  sectionLabel.className = "section-label";
  sectionLabel.textContent = total > 0 ? "TODAY'S TASKS" : "";
  todayHeaderEl.appendChild(sectionLabel);
}

function renderTodayBanner(done, total) {
  todayBannerEl.innerHTML = "";
  if (total === 0) return; // empty state message covers this case instead

  let icon = "⭐";
  let title = "You're doing great!";
  let sub = "A tidy home, a happy mind.";

  if (done < total) {
    const left = total - done;
    icon = "💪";
    title = `${left} to go`;
    sub = "You've got this!";
  }

  const iconEl = document.createElement("span");
  iconEl.className = "banner-icon";
  iconEl.textContent = icon;

  const textWrap = document.createElement("div");
  const t = document.createElement("p");
  t.className = "banner-title";
  t.textContent = title;
  const s = document.createElement("p");
  s.className = "banner-sub";
  s.textContent = sub;
  textWrap.appendChild(t);
  textWrap.appendChild(s);

  const heart = document.createElement("span");
  heart.className = "banner-heart";
  heart.textContent = "💛";

  todayBannerEl.appendChild(iconEl);
  todayBannerEl.appendChild(textWrap);
  todayBannerEl.appendChild(heart);
}

function renderTodayRow(task, status, doneToday) {
  const li = document.createElement("li");
  li.className = "today-row";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "today-row-btn";
  btn.setAttribute("aria-label", `Mark "${task.name}" ${doneToday ? "not done" : "done"} today`);
  btn.addEventListener("click", () => toggleDoneToday(task));

  const iconWrap = document.createElement("span");
  iconWrap.className = "task-icon";
  iconWrap.style.background = getTaskIconBg(task);
  iconWrap.textContent = getTaskIcon(task);

  const textWrap = document.createElement("div");
  textWrap.className = "today-row-text";
  const name = document.createElement("div");
  name.className = "today-row-name";
  name.textContent = task.name;
  const sub = document.createElement("div");
  sub.className = "today-row-sub";
  sub.textContent = doneToday ? "Done today ✓" : frequencyLabel(task);
  textWrap.appendChild(name);
  textWrap.appendChild(sub);

  const check = document.createElement("span");
  check.className = "check-circle" + (doneToday ? " checked" : "");
  if (doneToday) check.textContent = "✓";

  btn.appendChild(iconWrap);
  btn.appendChild(textWrap);
  btn.appendChild(check);
  li.appendChild(btn);
  return li;
}

const preCompletionCache = {};

function toggleDoneToday(task) {
  const now = new Date();
  const status = getTaskStatus(task, now);
  if (isDoneToday(status, now)) {
    // Un-check: restore whatever it was before today's completion.
    const previous = preCompletionCache[task.id];
    if (previous === undefined || previous === null) {
      delete state[task.id];
    } else {
      state[task.id] = previous;
    }
    delete preCompletionCache[task.id];
  } else {
    preCompletionCache[task.id] = state[task.id] ?? null;
    state[task.id] = Date.now();
  }
  saveState(state);
  render();
}

function renderTodayView() {
  const now = new Date();
  const rows = tasks.map((task) => ({ task, status: getTaskStatus(task, now) }));

  const todayRows = rows.filter(
    ({ status }) => status.score >= 0 || isDoneToday(status, now)
  );

  todayRows.sort((a, b) => {
    const aDone = isDoneToday(a.status, now);
    const bDone = isDoneToday(b.status, now);
    if (aDone !== bDone) return aDone ? 1 : -1; // unfinished first
    if (!aDone && a.status.score !== b.status.score) return b.status.score - a.status.score;
    return a.task.name.localeCompare(b.task.name);
  });

  const total = todayRows.length;
  const done = todayRows.filter(({ status }) => isDoneToday(status, now)).length;

  renderTodayHeader(done, total);
  renderTodayBanner(done, total);

  todayListEl.innerHTML = "";
  todayEmptyEl.hidden = total > 0;
  todayEmptyEl.textContent = "Nothing due today — enjoy the break! 🎉";

  for (const { task, status } of todayRows) {
    todayListEl.appendChild(renderTodayRow(task, status, isDoneToday(status, now)));
  }
}

/* ========================================================================
   Rendering — All Tasks tab
   ======================================================================== */

const allListEl = document.getElementById("all-list");
const allEmptyEl = document.getElementById("all-empty");

function renderAllRow(task, status) {
  const now = new Date();
  const color = getStatusColor(status);

  const li = document.createElement("li");
  li.className = "all-row";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "all-row-btn";
  btn.setAttribute("aria-label", `Edit "${task.name}"`);
  btn.addEventListener("click", () => openTaskModal(task));

  const iconWrap = document.createElement("span");
  iconWrap.className = "task-icon small";
  iconWrap.style.background = getTaskIconBg(task);
  iconWrap.textContent = getTaskIcon(task);

  const nameCol = document.createElement("span");
  nameCol.className = "col-task";
  const nameInner = document.createElement("span");
  nameInner.className = "all-row-name";
  nameInner.textContent = task.name;
  nameCol.appendChild(iconWrap);
  nameCol.appendChild(nameInner);

  const freqCol = document.createElement("span");
  freqCol.className = "col-freq";
  freqCol.textContent = frequencyLabelCompact(task);

  const lastCol = document.createElement("span");
  lastCol.className = "col-last";
  if (status.lastDone) {
    const dateLine = document.createElement("span");
    dateLine.className = "last-date";
    dateLine.textContent = formatDate(status.lastDone);
    const agoLine = document.createElement("span");
    agoLine.className = `last-ago ${color}`;
    agoLine.textContent = `(${relativeAgoText(status.lastDone, now)})`;
    lastCol.appendChild(dateLine);
    lastCol.appendChild(agoLine);
  } else {
    const neverLine = document.createElement("span");
    neverLine.className = "last-ago red";
    neverLine.textContent = "Never done";
    lastCol.appendChild(neverLine);
  }

  const chevron = document.createElement("span");
  chevron.className = "col-chevron";
  chevron.textContent = "›";

  btn.appendChild(nameCol);
  btn.appendChild(freqCol);
  btn.appendChild(lastCol);
  btn.appendChild(chevron);
  li.appendChild(btn);
  return li;
}

function renderAllView() {
  const now = new Date();
  const rows = tasks.map((task) => ({ task, status: getTaskStatus(task, now) }));

  rows.sort((a, b) => {
    if (b.status.score !== a.status.score) return b.status.score - a.status.score;
    return a.task.name.localeCompare(b.task.name);
  });

  allListEl.innerHTML = "";
  allEmptyEl.hidden = rows.length > 0;

  for (const { task, status } of rows) {
    allListEl.appendChild(renderAllRow(task, status));
  }
}

/* ========================================================================
   Shared render entrypoint
   ======================================================================== */

function render() {
  renderTodayView();
  renderAllView();
}

/* ========================================================================
   Undo toast (used for delete)
   ======================================================================== */

const toastEl = document.getElementById("toast");
let undoTimer = null;

function showUndoToast(message, onUndo) {
  clearTimeout(undoTimer);
  toastEl.innerHTML = "";

  const msg = document.createElement("span");
  msg.textContent = message;

  const undoBtn = document.createElement("button");
  undoBtn.textContent = "Undo";
  undoBtn.className = "undo-btn";
  undoBtn.type = "button";
  undoBtn.addEventListener("click", () => {
    onUndo();
    hideToast();
  });

  toastEl.appendChild(msg);
  toastEl.appendChild(undoBtn);
  toastEl.classList.add("visible");

  undoTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
  toastEl.classList.remove("visible");
}

/* ========================================================================
   Add / edit / delete modal
   ======================================================================== */

const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalForm = document.getElementById("modal-form");
const modalNameInput = document.getElementById("modal-name");
const modalDaysInput = document.getElementById("modal-days");
const modalIntervalField = document.getElementById("modal-interval-field");
const modalAnnualNote = document.getElementById("modal-annual-note");
const modalError = document.getElementById("modal-error");
const modalMarkDoneBtn = document.getElementById("modal-mark-done");
const modalDeleteBtn = document.getElementById("modal-delete");
const modalCancelBtn = document.getElementById("modal-cancel");
const addTaskBtn = document.getElementById("add-task-btn");

let editingTaskId = null; // null while adding a brand-new task

function openTaskModal(task) {
  modalError.textContent = "";
  editingTaskId = task ? task.id : null;

  if (task) {
    modalTitle.textContent = "Edit task";
    modalNameInput.value = task.name;
    modalDeleteBtn.hidden = false;
    modalMarkDoneBtn.hidden = false;

    if (task.kind === "annual") {
      modalIntervalField.hidden = true;
      modalAnnualNote.hidden = false;
      const monthNames = task.months
        .map((m) => new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" }))
        .join(" & ");
      modalAnnualNote.textContent = `This task repeats every year in ${monthNames}. That schedule can only be changed by editing the code (see README) — but you can still rename or delete it here.`;
    } else {
      modalIntervalField.hidden = false;
      modalAnnualNote.hidden = true;
      modalDaysInput.value = task.days;
    }
  } else {
    modalTitle.textContent = "Add task";
    modalNameInput.value = "";
    modalDaysInput.value = "";
    modalIntervalField.hidden = false;
    modalAnnualNote.hidden = true;
    modalDeleteBtn.hidden = true;
    modalMarkDoneBtn.hidden = true;
  }

  modalOverlay.classList.add("visible");
  setTimeout(() => modalNameInput.focus(), 0);
}

function closeModal() {
  modalOverlay.classList.remove("visible");
  editingTaskId = null;
}

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
modalCancelBtn.addEventListener("click", closeModal);
addTaskBtn.addEventListener("click", () => openTaskModal(null));

modalMarkDoneBtn.addEventListener("click", () => {
  if (!editingTaskId) return;
  const task = tasks.find((t) => t.id === editingTaskId);
  if (!task) return;
  state[task.id] = Date.now();
  saveState(state);
  closeModal();
  render();
});

modalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = modalNameInput.value.trim();

  if (!name) {
    modalError.textContent = "Give the task a name.";
    return;
  }

  const existing = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null;

  if (existing && existing.kind === "annual") {
    existing.name = name;
    saveTasks(tasks);
    closeModal();
    render();
    return;
  }

  const days = parseInt(modalDaysInput.value, 10);
  if (!Number.isFinite(days) || days < 1) {
    modalError.textContent = "Enter how many days between repeats (1 or more).";
    return;
  }

  if (existing) {
    existing.name = name;
    existing.days = days;
  } else {
    tasks.push({ id: makeUniqueId(name), name, kind: "interval", days });
  }

  saveTasks(tasks);
  closeModal();
  render();
});

modalDeleteBtn.addEventListener("click", () => {
  if (!editingTaskId) return;
  const idToDelete = editingTaskId;
  const removedTask = tasks.find((t) => t.id === idToDelete);
  const removedIndex = tasks.findIndex((t) => t.id === idToDelete);
  const removedState = state[idToDelete] ?? null;

  tasks = tasks.filter((t) => t.id !== idToDelete);
  delete state[idToDelete];
  saveTasks(tasks);
  saveState(state);
  closeModal();
  render();

  if (removedTask) {
    showUndoToast(`Deleted "${removedTask.name}".`, () => {
      tasks.splice(removedIndex, 0, removedTask);
      if (removedState !== null) state[idToDelete] = removedState;
      saveTasks(tasks);
      saveState(state);
      render();
    });
  }
});

/* ========================================================================
   Init
   ======================================================================== */

setTab("today");
render();

// Re-render every hour so "days ago" text / today's list stay correct if
// the app is left open across a day boundary.
setInterval(render, 60 * 60 * 1000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((e) => {
      console.warn("Service worker registration failed:", e);
    });
  });
}
