const STORAGE_KEY = "taskflow.tasks";
const columns = [
  { key: "todo", label: "未着手" },
  { key: "doing", label: "進行中" },
  { key: "done", label: "完了" },
];

let tasks = loadTasks();
let draggedTaskId = null;

const board = document.getElementById("board");
const form = document.getElementById("taskForm");
const summary = document.getElementById("summary");
const search = document.getElementById("search");
const priorityFilter = document.getElementById("priorityFilter");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  if (!title) return;

  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    assignee: document.getElementById("assignee").value.trim(),
    dueDate: document.getElementById("dueDate").value,
    priority: document.getElementById("priority").value,
    description: document.getElementById("description").value.trim(),
    status: "todo",
    createdAt: new Date().toISOString(),
  });

  form.reset();
  saveAndRender();
});

search.addEventListener("input", render);
priorityFilter.addEventListener("change", render);

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return sampleTasks();
  try {
    return JSON.parse(saved);
  } catch {
    return sampleTasks();
  }
}

function sampleTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: "週次ミーティング資料作成",
      assignee: "田中",
      dueDate: "",
      priority: "high",
      description: "営業報告とKPIを1枚に整理する",
      status: "todo",
      createdAt: new Date().toISOString(),
    },
  ];
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  render();
}

function filteredTasks() {
  const q = search.value.trim().toLowerCase();
  const pf = priorityFilter.value;
  return tasks.filter((task) => {
    const hitQuery = !q || [task.title, task.assignee].join(" ").toLowerCase().includes(q);
    const hitPriority = pf === "all" || task.priority === pf;
    return hitQuery && hitPriority;
  });
}

function render() {
  board.innerHTML = "";
  const filtered = filteredTasks();

  columns.forEach((col) => {
    const section = document.createElement("section");
    section.className = `column ${col.key}`;
    section.innerHTML = `<h2>${col.label}</h2>`;

    const zone = document.createElement("div");
    zone.className = "dropzone";
    zone.dataset.status = col.key;
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", () => {
      zone.classList.remove("drag-over");
      if (!draggedTaskId) return;
      moveTask(draggedTaskId, col.key);
    });

    filtered
      .filter((task) => task.status === col.key)
      .forEach((task) => zone.appendChild(taskCard(task)));

    section.appendChild(zone);
    board.appendChild(section);
  });

  const done = tasks.filter((t) => t.status === "done").length;
  summary.textContent = `全 ${tasks.length} 件 / 完了 ${done} 件`;
}

function taskCard(task) {
  const tmpl = document.getElementById("taskCardTemplate");
  const node = tmpl.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;
  node.querySelector(".task-title").textContent = task.title;
  node.querySelector(".task-description").textContent = task.description || "（詳細なし）";

  const p = node.querySelector(".priority");
  p.textContent = `優先度: ${jpPriority(task.priority)}`;
  p.classList.add(task.priority);

  node.querySelector(".meta").textContent = `担当: ${task.assignee || "未設定"} / 期限: ${task.dueDate || "未設定"}`;

  node.draggable = true;
  node.addEventListener("dragstart", () => {
    draggedTaskId = task.id;
  });

  node.querySelector(".move-left").addEventListener("click", () => shiftTask(task.id, -1));
  node.querySelector(".move-right").addEventListener("click", () => shiftTask(task.id, 1));
  node.querySelector(".delete").addEventListener("click", () => {
    tasks = tasks.filter((t) => t.id !== task.id);
    saveAndRender();
  });

  return node;
}

function shiftTask(id, step) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const idx = columns.findIndex((c) => c.key === task.status);
  const next = columns[idx + step];
  if (!next) return;
  task.status = next.key;
  saveAndRender();
}

function moveTask(id, status) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.status = status;
  saveAndRender();
}

function jpPriority(priority) {
  return ({ high: "高", medium: "中", low: "低" })[priority] || "中";
}

render();
