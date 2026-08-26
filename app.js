/* =========================================================================
   Tidy, Clean, Organized — task list & logic
   -------------------------------------------------------------------------
   Tasks are managed entirely from within the app now (tap "+" to add one,
   tap any task's name to rename it, change its interval, or delete it).

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
  // First run (or corrupted data): seed from the defaults.
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
  // Whole days between two Date objects, ignoring time-of-day.
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
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
  // Build a sorted list of "1st of month" dates covering last year,
  // this year, and next year, for the given trigger months.
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
        sub: `every ${period} day${period === 1 ? "" : "s"}`,
      };
    }
    const daysSince = daysBetween(lastDone, now);
    const overdueDays = daysSince - period;
    const score = overdueDays / period;
    let label;
    if (daysSince === 0) label = "Done today";
    else if (daysSince === 1) label = "Done yesterday";
    else label = `${daysSince} days ago`;
    return {
      lastDone,
      overdueDays,
      period,
      score,
      label,
      sub: `every ${period} day${period === 1 ? "" : "s"}`,
    };
  }

  if (task.kind === "annual") {
    const period = Math.round(365 / task.months.length);
    const triggers = annualTriggerDates(task.months, now);

    // Which cycle are we in? The due date is the first trigger strictly
    // after lastDone (or the most recent past trigger if never done).
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
    const monthNames = task.months
      .map((m) => new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" }))
      .join(" & ");

    let label;
    if (overdueDays > 0) label = `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
    else if (overdueDays === 0) label = "Due today";
    else label = `Due in ${-overdueDays} day${-overdueDays === 1 ? "" : "s"}`;

    return {
      lastDone,
      overdueDays,
      period,
      score,
      label,
      sub: monthNames,
    };
  }

  throw new Error(`Unknown task kind: ${task.kind}`);
}

function getStatusColor(status) {
  if (status.score === Infinity) return "red";
  if (status.score >= 1) return "red";
  if (status.score >= 0) return "amber";
  return "green";
}

/* ========================================================================
   Rendering
   ======================================================================== */

const listEl = document.getElementById("task-list");
const toastEl = document.getElementById("toast");
const emptyEl = document.getElementById("empty-state");

function render() {
  const now = new Date();

  const rows = tasks.map((task) => {
    const status = getTaskStatus(task, now);
    return { task, status };
  });

  // Most overdue first (highest score first). Ties broken alphabetically.
  rows.sort((a, b) => {
    if (b.status.score !== a.status.score) return b.status.score - a.status.score;
    return a.task.name.localeCompare(b.task.name);
  });

  listEl.innerHTML = "";
  emptyEl.hidden = rows.length > 0;
  for (const { task, status } of rows) {
    listEl.appendChild(renderRow(task, status));
  }
}

function renderRow(task, status) {
  const color = getStatusColor(status);

  const row = document.createElement("li");
  row.className = `task-row ${color}`;

  const info = document.createElement("button");
  info.type = "button";
  info.className = "task-info";
  info.setAttribute("aria-label", `Edit "${task.name}"`);
  info.addEventListener("click", () => openTaskModal(task));

  const name = document.createElement("div");
  name.className = "task-name";
  name.textContent = task.name;

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.textContent = `${status.label} · ${status.sub}`;

  info.appendChild(name);
  info.appendChild(meta);

  const button = document.createElement("button");
  button.className = "done-btn";
  button.type = "button";
  button.setAttribute("aria-label", `Mark "${task.name}" done today`);
  button.textContent = "✓";
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    markDone(task);
  });

  row.appendChild(info);
  row.appendChild(button);
  return row;
}

/* ========================================================================
   Marking done + undo
   ======================================================================== */

let undoTimer = null;

function markDone(task) {
  const previous = state[task.id] ?? null;
  state[task.id] = Date.now();
  saveState(state);
  render();
  showUndoToast(`${task.name} marked done.`, () => {
    if (previous === null) delete state[task.id];
    else state[task.id] = previous;
    saveState(state);
    render();
  });
}

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
  }

  modalOverlay.classList.add("visible");
  // Focus after the modal is actually visible/laid out.
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

modalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = modalNameInput.value.trim();

  if (!name) {
    modalError.textContent = "Give the task a name.";
    return;
  }

  const existing = editingTaskId ? tasks.find((t) => t.id === editingTaskId) : null;

  if (existing && existing.kind === "annual") {
    // Annual tasks: rename only, no interval field shown.
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

render();

// Re-render every hour so "days ago" text stays correct if the app is
// left open across a day boundary.
setInterval(render, 60 * 60 * 1000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((e) => {
      console.warn("Service worker registration failed:", e);
    });
  });
}
