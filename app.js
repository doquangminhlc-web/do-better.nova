// ── STATE ──────────────────────────────────────────────────────────────────
var tasks = [];
var curFilter = "all";
var calY, calM, selDate;

function loadTasks() {
  try { tasks = JSON.parse(localStorage.getItem("tdht_v4") || "[]"); }
  catch (e) { tasks = []; }
}
function saveTasks() {
  try { localStorage.setItem("tdht_v4", JSON.stringify(tasks)); }
  catch (e) {}
}

// ── HELPERS ────────────────────────────────────────────────────────────────
function todayStr() {
  var d = new Date();
  return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
}
function p2(n) { return n < 10 ? "0" + n : "" + n; }
function fmtDate(s) {
  if (!s) return "";
  var x = s.split("-");
  return x[2] + "/" + x[1] + "/" + x[0];
}
function priLabel(p) {
  if (p === "high") return "Cao";
  if (p === "mid") return "Vừa";
  return "Thấp";
}
function priEmoji(p) {
  if (p === "high") return "🔴";
  if (p === "mid") return "🟡";
  return "🟢";
}
function priCls(p) {
  if (p === "high") return "ph";
  if (p === "mid") return "pm";
  return "pl";
}
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── CLOCK ──────────────────────────────────────────────────────────────────
function tick() {
  var d = new Date();
  var days = ["Chủ nhật","Thứ hai","Thứ ba","Thứ tư","Thứ năm","Thứ sáu","Thứ bảy"];
  var el = document.getElementById("clock");
  if (el) {
    el.textContent =
      days[d.getDay()] + ", " +
      d.toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" }) +
      " — " + d.toLocaleTimeString("vi-VN");
  }
}

// ── DARK MODE ──────────────────────────────────────────────────────────────
var dark = false;
function applyDark() {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "");
  var b = document.getElementById("btnDark");
  if (b) b.textContent = dark ? "☀️ Light Mode" : "🌙 Dark Mode";
  try { localStorage.setItem("tdht_dark", dark ? "1" : "0"); } catch (e) {}
}
function toggleDark() {
  dark = !dark;
  applyDark();
}

// ── TABS ───────────────────────────────────────────────────────────────────
function showTab(name) {
  var tabs = ["list", "cal"];
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var tabBtn = document.getElementById("t-" + t);
    var panel  = document.getElementById("p-" + t);
    if (t === name) {
      if (tabBtn) tabBtn.classList.add("on");
      if (panel)  panel.classList.add("on");
    } else {
      if (tabBtn) tabBtn.classList.remove("on");
      if (panel)  panel.classList.remove("on");
    }
  }
  if (name === "cal") renderCal();
}

// ── ADD TASK ───────────────────────────────────────────────────────────────
function addTask() {
  var text = document.getElementById("iText").value.trim();
  var date = document.getElementById("iDate").value;
  var time = document.getElementById("iTime").value;
  var pri  = document.getElementById("iPri").value;

  if (!text) { alert("Vui lòng nhập tên công việc!"); document.getElementById("iText").focus(); return; }
  if (!date) { alert("Vui lòng chọn ngày!"); document.getElementById("iDate").focus(); return; }
  if (!time) { alert("Vui lòng chọn giờ!"); document.getElementById("iTime").focus(); return; }

  tasks.push({ id: Date.now(), text: text, date: date, time: time, pri: pri, done: false });
  tasks.sort(function (a, b) {
    var ka = a.date + "T" + a.time;
    var kb = b.date + "T" + b.time;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  saveTasks();
  renderList();

  document.getElementById("iText").value = "";
  document.getElementById("iDate").value = todayStr();
  document.getElementById("iTime").value = "";
  document.getElementById("iText").focus();
}

// ── TOGGLE / DELETE ────────────────────────────────────────────────────────
function toggleTask(id) {
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id === id) { tasks[i].done = !tasks[i].done; break; }
  }
  saveTasks();
  renderList();
  renderTL();
}
function deleteTask(id) {
  if (!confirm("Xoá công việc này?")) return;
  tasks = tasks.filter(function (t) { return t.id !== id; });
  saveTasks();
  renderList();
  renderTL();
}

// ── FILTER ─────────────────────────────────────────────────────────────────
function setFilter(f) {
  curFilter = f;
  var btns = document.querySelectorAll(".fbtn[data-f]");
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute("data-f") === f) btns[i].classList.add("on");
    else btns[i].classList.remove("on");
  }
  renderList();
}
function getFiltered() {
  var t = todayStr();
  if (curFilter === "pending") return tasks.filter(function (x) { return !x.done; });
  if (curFilter === "done")    return tasks.filter(function (x) { return x.done; });
  if (curFilter === "today")   return tasks.filter(function (x) { return x.date === t; });
  return tasks.slice();
}

// ── RENDER LIST ────────────────────────────────────────────────────────────
function renderList() {
  var list = document.getElementById("taskList");
  if (!list) return;
  var arr = getFiltered();

  document.getElementById("sAll").textContent  = tasks.length;
  document.getElementById("sDone").textContent = tasks.filter(function (t) { return t.done; }).length;
  document.getElementById("sRem").textContent  = tasks.filter(function (t) { return !t.done; }).length;

  if (arr.length === 0) {
    list.innerHTML = "<li class=\"empty\">📭 Không có công việc nào" + (curFilter !== "all" ? " trong mục này" : "") + "</li>";
    return;
  }

  var html = "";
  for (var i = 0; i < arr.length; i++) {
    var t = arr[i];
    html += "<li class=\"ti" + (t.done ? " done" : "") + "\">";
    html += "<button class=\"chk\" data-id=\"" + t.id + "\">✓</button>";
    html += "<div class=\"tbody\">";
    html += "<div class=\"ttxt\">" + esc(t.text) + "</div>";
    html += "<div class=\"tmeta\">";
    html += "<span>📅 " + fmtDate(t.date) + "</span>";
    if (t.time) html += "<span>⏰ " + t.time + "</span>";
    html += "<span class=\"pbadge " + priCls(t.pri) + "\">" + priEmoji(t.pri) + " " + priLabel(t.pri) + "</span>";
    html += "</div></div>";
    html += "<button class=\"del\" data-id=\"" + t.id + "\">🗑</button>";
    html += "</li>";
  }
  list.innerHTML = html;

  // Attach events (no inline onclick — CSP safe)
  var chkBtns = list.querySelectorAll(".chk");
  for (var j = 0; j < chkBtns.length; j++) {
    chkBtns[j].addEventListener("click", function () {
      toggleTask(parseInt(this.getAttribute("data-id")));
    });
  }
  var delBtns = list.querySelectorAll(".del");
  for (var k = 0; k < delBtns.length; k++) {
    delBtns[k].addEventListener("click", function () {
      deleteTask(parseInt(this.getAttribute("data-id")));
    });
  }
}

// ── CALENDAR ───────────────────────────────────────────────────────────────
function pickDay(ds) {
  selDate = ds;
  renderCal();
}
function renderCal() {
  var months = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
  var lbl = document.getElementById("calLabel");
  if (lbl) lbl.textContent = months[calM] + " " + calY;

  var grid = document.getElementById("calGrid");
  if (!grid) return;

  var dnames = ["CN","T2","T3","T4","T5","T6","T7"];
  var html = "";
  for (var i = 0; i < dnames.length; i++) {
    html += "<div class=\"dname\">" + dnames[i] + "</div>";
  }

  var first = new Date(calY, calM, 1).getDay();
  var total = new Date(calY, calM + 1, 0).getDate();
  var today = todayStr();
  var tdates = {};
  for (var j = 0; j < tasks.length; j++) tdates[tasks[j].date] = true;

  for (var e = 0; e < first; e++) html += "<div class=\"cday empty\"></div>";

  for (var d = 1; d <= total; d++) {
    var ds = calY + "-" + p2(calM + 1) + "-" + p2(d);
    var cls = "cday";
    if (ds === today) cls += " today";
    else if (ds === selDate) cls += " sel";
    if (tdates[ds]) cls += " has";
    html += "<div class=\"" + cls + "\" data-date=\"" + ds + "\">" + d + "</div>";
  }

  grid.innerHTML = html;

  // Attach click events (CSP safe)
  var days = grid.querySelectorAll(".cday:not(.empty)");
  for (var x = 0; x < days.length; x++) {
    days[x].addEventListener("click", function () {
      selDate = this.getAttribute("data-date");
      renderCal();
    });
  }

  renderTL();
}

// ── TIMELINE ───────────────────────────────────────────────────────────────
function renderTL() {
  var lbl = document.getElementById("dayLabel");
  var box = document.getElementById("tlBox");
  if (!lbl || !box) return;

  if (!selDate) {
    lbl.textContent = "--";
    box.innerHTML = "<div class=\"noday\">Chọn ngày để xem</div>";
    return;
  }

  var p = selDate.split("-");
  lbl.textContent = p[2] + "/" + p[1] + "/" + p[0];

  var arr = tasks.filter(function (t) { return t.date === selDate; });
  arr.sort(function (a, b) { return a.time < b.time ? -1 : 1; });

  if (arr.length === 0) {
    box.innerHTML = "<div class=\"noday\">🎉 Không có công việc ngày này</div>";
    return;
  }

  var html = "<div class=\"tline\">";
  for (var i = 0; i < arr.length; i++) {
    var t = arr[i];
    html += "<div class=\"titem\">";
    html += "<div class=\"ttime\">" + (t.time || "--") + "</div>";
    html += "<div class=\"tdot" + (t.done ? " done" : "") + "\"></div>";
    html += "<div class=\"tcard" + (t.done ? " done" : "") + "\" data-id=\"" + t.id + "\">";
    html += "<div class=\"tc-t\">" + esc(t.text) + "</div>";
    html += "<div class=\"tc-m\"><span class=\"pbadge " + priCls(t.pri) + "\">" + priEmoji(t.pri) + " " + priLabel(t.pri) + "</span>";
    html += t.done ? "<span>✅ Xong</span>" : "<span>⏳ Chưa xong</span>";
    html += "</div></div></div>";
  }
  html += "</div>";
  box.innerHTML = html;

  var cards = box.querySelectorAll(".tcard");
  for (var j = 0; j < cards.length; j++) {
    cards[j].addEventListener("click", function () {
      toggleTask(parseInt(this.getAttribute("data-id")));
    });
  }
}

// ── BOOT ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  loadTasks();

  // Dark mode init
  try { dark = localStorage.getItem("tdht_dark") === "1"; } catch (e) { dark = false; }
  applyDark();

  // Calendar init
  var now = new Date();
  calY = now.getFullYear();
  calM = now.getMonth();
  selDate = todayStr();

  // Set default date input
  var iDate = document.getElementById("iDate");
  if (iDate) iDate.value = todayStr();

  // Clock
  tick();
  setInterval(tick, 1000);

  // Dark toggle
  var btnDark = document.getElementById("btnDark");
  if (btnDark) btnDark.addEventListener("click", toggleDark);

  // Tabs
  var tList = document.getElementById("t-list");
  var tCal  = document.getElementById("t-cal");
  if (tList) tList.addEventListener("click", function () { showTab("list"); });
  if (tCal)  tCal.addEventListener("click",  function () { showTab("cal"); });

  // Add task
  var btnAdd = document.getElementById("btnAdd");
  if (btnAdd) btnAdd.addEventListener("click", addTask);
  var iText = document.getElementById("iText");
  if (iText) iText.addEventListener("keydown", function (e) { if (e.key === "Enter") addTask(); });

  // Filter buttons
  var fbtns = document.querySelectorAll(".fbtn[data-f]");
  for (var i = 0; i < fbtns.length; i++) {
    fbtns[i].addEventListener("click", function () {
      setFilter(this.getAttribute("data-f"));
    });
  }

  // Calendar nav
  var btnPrev = document.getElementById("btnPrev");
  var btnNext = document.getElementById("btnNext");
  var btnToday = document.getElementById("btnToday");
  if (btnPrev) btnPrev.addEventListener("click", function () {
    calM--; if (calM < 0) { calM = 11; calY--; } renderCal();
  });
  if (btnNext) btnNext.addEventListener("click", function () {
    calM++; if (calM > 11) { calM = 0; calY++; } renderCal();
  });
  if (btnToday) btnToday.addEventListener("click", function () {
    var n = new Date(); calY = n.getFullYear(); calM = n.getMonth(); selDate = todayStr(); renderCal();
  });

  // First render
  renderList();
});
