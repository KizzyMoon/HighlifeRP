const STORAGE_KEY = "highlife-ems-dashboard-v1";
const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1g3XXntoqyA9XMgEcXwq89RyqBUymJCpVbG1vlE4BSPY/edit?gid=1321749468#gid=1321749468";

const state = loadState();
let activeTab = "overview";

const els = {
  lastUpdated: document.querySelector("[data-last-updated]"),
  stats: document.querySelector("[data-stats]"),
  googleUrl: document.querySelector("[data-google-url]"),
  csvFile: document.querySelector("[data-csv-file]"),
  search: document.querySelector("[data-search]"),
  statusFilter: document.querySelector("[data-status-filter]"),
  views: document.querySelectorAll("[data-view]"),
  tabs: document.querySelectorAll("[data-tab]"),
  needsRaList: document.querySelector("[data-needs-ra-list]"),
  limitList: document.querySelector("[data-limit-list]"),
  workList: document.querySelector("[data-work-list]"),
  cadetGrid: document.querySelector("[data-cadet-grid]"),
  directory: document.querySelector("[data-directory]"),
  notesList: document.querySelector("[data-notes-list]"),
  needsRaCount: document.querySelector("[data-count-needs-ra]"),
  limitCount: document.querySelector("[data-count-limits]"),
  workCount: document.querySelector("[data-count-work]"),
  directoryCount: document.querySelector("[data-directory-count]"),
  notesCount: document.querySelector("[data-notes-count]"),
  dialog: document.querySelector("[data-dialog]"),
  dialogForm: document.querySelector("[data-dialog-form]"),
  dialogTitle: document.querySelector("[data-dialog-title]"),
  dialogBody: document.querySelector("[data-dialog-body]")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      cadets: Array.isArray(saved.cadets) ? saved.cadets.map(normalizeCadet) : [],
      members: Array.isArray(saved.members) ? saved.members.map(normalizeMember) : [],
      notes: Array.isArray(saved.notes) ? saved.notes.map(normalizeNote) : [],
      lastUpdated: saved.lastUpdated || ""
    };
  } catch {
    return { cadets: [], members: [], notes: [], lastUpdated: "" };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pick(row, aliases) {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const found = keys.find((key) => normalizeKey(key) === target);
    if (found && String(row[found] ?? "").trim()) return String(row[found]).trim();
  }
  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const found = keys.find((key) => normalizeKey(key).includes(target) || target.includes(normalizeKey(key)));
    if (found && String(row[found] ?? "").trim()) return String(row[found]).trim();
  }
  return "";
}

function boolValue(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  return ["yes", "y", "true", "done", "complete", "completed", "passed", "trained", "1"].includes(text);
}

function parseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const direct = new Date(raw);
  if (!Number.isNaN(direct.valueOf())) return direct.toISOString().slice(0, 10);
  const match = raw.match(/^(\d{1,2})[\/. -](\d{1,2})[\/. -](\d{2,4})$/);
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(year, month, day);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
}

function daysUntil(dateText) {
  if (!dateText) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateText}T00:00`);
  if (Number.isNaN(date.valueOf())) return null;
  return Math.ceil((date - today) / 86400000);
}

function addDays(dateText, amount) {
  if (!dateText) return "";
  const date = new Date(`${dateText}T00:00`);
  if (Number.isNaN(date.valueOf())) return "";
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function normalizeCadet(raw = {}) {
  const startDate = parseDate(raw.startDate || raw.start || raw.joined || raw.joinDate);
  const day14Due = parseDate(raw.day14Due || raw.fourteenDayDue || raw["14day"]) || addDays(startDate, 14);
  const day28Due = parseDate(raw.day28Due || raw.twentyEightDayDue || raw["28day"]) || addDays(startDate, 28);
  return {
    id: raw.id || crypto.randomUUID(),
    name: raw.name || "",
    callsign: raw.callsign || "",
    rank: raw.rank || "Cadet",
    status: raw.status || "Active",
    trainer: raw.trainer || "",
    startDate,
    day14Due,
    day28Due,
    lastRaDate: parseDate(raw.lastRaDate || raw.lastRA || raw.raDate),
    raCompleted: Boolean(raw.raCompleted),
    day1: Boolean(raw.day1),
    day2: Boolean(raw.day2),
    needsWork: raw.needsWork || "",
    sheetUrl: raw.sheetUrl || "",
    notes: raw.notes || ""
  };
}

function normalizeMember(raw = {}) {
  return {
    id: raw.id || crypto.randomUUID(),
    name: raw.name || "",
    callsign: raw.callsign || "",
    rank: raw.rank || "",
    role: raw.role || raw.department || "EMS",
    status: raw.status || "Active",
    notes: raw.notes || ""
  };
}

function normalizeNote(raw = {}) {
  return {
    id: raw.id || crypto.randomUUID(),
    cadetId: raw.cadetId || "",
    cadetName: raw.cadetName || "",
    note: raw.note || "",
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function cadetFromRow(row) {
  const raText = pick(row, ["RA", "RA Complete", "RA Completed", "Ride Along", "Ridealong", "Ride Along Complete"]);
  return normalizeCadet({
    name: pick(row, ["Name", "Cadet", "Cadet Name", "Member", "Employee"]),
    callsign: pick(row, ["Callsign", "Call Sign", "Unit", "Radio"]),
    rank: pick(row, ["Rank", "Position"]) || "Cadet",
    status: pick(row, ["Status", "Current Status"]) || "Active",
    trainer: pick(row, ["Trainer", "Mentor", "Supervisor"]),
    startDate: pick(row, ["Start Date", "Join Date", "Date Joined", "Cadet Start", "Hired"]),
    day14Due: pick(row, ["14 Day", "14 Day Due", "14-Day", "14 Day Limit"]),
    day28Due: pick(row, ["28 Day", "28 Day Due", "28-Day", "28 Day Limit"]),
    lastRaDate: pick(row, ["Last RA", "RA Date", "Ride Along Date"]),
    raCompleted: boolValue(raText),
    day1: boolValue(pick(row, ["Day 1", "Day One", "D1", "Day 1 Trained"])),
    day2: boolValue(pick(row, ["Day 2", "Day Two", "D2", "Day 2 Trained"])),
    needsWork: pick(row, ["Needs Work", "Work On", "To Improve", "Training Notes", "Cadet Notes", "Notes"]),
    sheetUrl: pick(row, ["Sheet", "Sheet URL", "Google Sheet", "Profile Link"]),
    notes: pick(row, ["My Notes", "Private Notes"])
  });
}

function memberFromRow(row) {
  return normalizeMember({
    name: pick(row, ["Name", "Member", "EMS Name", "Employee"]),
    callsign: pick(row, ["Callsign", "Call Sign", "Unit", "Radio"]),
    rank: pick(row, ["Rank", "Position"]),
    role: pick(row, ["Role", "Department", "Division"]) || "EMS",
    status: pick(row, ["Status", "Current Status"]) || "Active",
    notes: pick(row, ["Notes", "Comment"])
  });
}

function looksLikeCadet(row) {
  const text = Object.entries(row).map(([key, value]) => `${key} ${value}`).join(" ").toLowerCase();
  return text.includes("cadet") || text.includes("day 1") || text.includes("day 2") || text.includes("ride") || text.includes("ra");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { if (row.some((value) => String(value).trim())) rows.push(row); row = []; };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === "," || char === "\t") && !quoted) {
      pushField();
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      pushField();
      pushRow();
    } else {
      field += char;
    }
  }
  pushField();
  pushRow();

  const headers = rows.shift()?.map((header) => String(header || "").trim()) || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header || `Column ${index + 1}`, values[index] || ""])));
}

function mergeByName(existing, incoming, normalizer) {
  const map = new Map(existing.map((entry) => [`${normalizeKey(entry.name)}:${normalizeKey(entry.callsign)}`, entry]));
  for (const item of incoming.map(normalizer).filter((entry) => entry.name || entry.callsign)) {
    const key = `${normalizeKey(item.name)}:${normalizeKey(item.callsign)}`;
    const previous = map.get(key);
    map.set(key, previous ? { ...previous, ...item, id: previous.id, notes: previous.notes || item.notes } : item);
  }
  return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function importRows(rows) {
  const cadetRows = [];
  const memberRows = [];
  for (const row of rows) {
    if (looksLikeCadet(row)) cadetRows.push(cadetFromRow(row));
    memberRows.push(memberFromRow(row));
  }
  state.cadets = mergeByName(state.cadets, cadetRows, normalizeCadet);
  state.members = mergeByName(state.members, memberRows, normalizeMember);
  state.lastUpdated = new Date().toISOString();
  saveState();
  render();
  alert(`Imported ${cadetRows.length} cadet row(s) and ${memberRows.length} EMS directory row(s).`);
}

function googleCsvUrl(input) {
  const url = String(input || DEFAULT_SHEET_URL).trim();
  const id = url.match(/\/spreadsheets\/d\/([^/]+)/)?.[1];
  const gid = url.match(/[?#&]gid=(\d+)/)?.[1] || "0";
  if (!id) return url;
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

async function importGoogleSheet() {
  const url = googleCsvUrl(els.googleUrl.value);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google returned ${response.status}`);
    const text = await response.text();
    if (/html|doctype|sign in/i.test(text.slice(0, 300))) throw new Error("The sheet did not return CSV. It may need to be shared or published.");
    importRows(parseCsv(text));
  } catch (error) {
    alert(`Could not import the Google Sheet automatically.\n\n${error.message}\n\nUse File > Download > CSV in Google Sheets, then upload it here.`);
  }
}

function filteredCadets() {
  const query = els.search.value.trim().toLowerCase();
  const filter = els.statusFilter.value;
  return state.cadets.filter((cadet) => {
    const text = `${cadet.name} ${cadet.callsign} ${cadet.rank} ${cadet.status} ${cadet.needsWork} ${cadet.notes}`.toLowerCase();
    if (query && !text.includes(query)) return false;
    if (filter === "needs-ra" && !needsRa(cadet)) return false;
    if (filter === "limit-risk" && !limitRisk(cadet)) return false;
    if (filter === "needs-training" && (cadet.day1 && cadet.day2)) return false;
    if (filter === "active" && !String(cadet.status).toLowerCase().includes("active")) return false;
    return true;
  });
}

function needsRa(cadet) {
  return String(cadet.status).toLowerCase().includes("active") && !cadet.raCompleted;
}

function limitRisk(cadet) {
  const day14 = daysUntil(cadet.day14Due);
  const day28 = daysUntil(cadet.day28Due);
  return (day14 !== null && day14 <= 3) || (day28 !== null && day28 <= 7);
}

function pill(label, stateName = "") {
  return `<span class="pill ${stateName}">${escapeHtml(label)}</span>`;
}

function limitPill(label, dueDate, dangerAt) {
  const days = daysUntil(dueDate);
  if (days === null) return pill(`${label}: not set`, "warn");
  const stateName = days < 0 ? "bad" : days <= dangerAt ? "warn" : "good";
  const text = days < 0 ? `${label}: ${Math.abs(days)} days overdue` : `${label}: ${days} days left`;
  return pill(text, stateName);
}

function cadetCard(cadet) {
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>${escapeHtml(cadet.name || "Unnamed cadet")}</h3>
          <p class="muted">${escapeHtml(cadet.callsign || "No callsign")} ${cadet.rank ? `- ${escapeHtml(cadet.rank)}` : ""}</p>
        </div>
        ${pill(cadet.status || "Active", String(cadet.status).toLowerCase().includes("active") ? "good" : "warn")}
      </div>
      <div class="pill-row">
        ${needsRa(cadet) ? pill("Needs RA", "bad") : pill("RA done", "good")}
        ${cadet.day1 ? pill("Day 1", "good") : pill("No Day 1", "warn")}
        ${cadet.day2 ? pill("Day 2", "good") : pill("No Day 2", "warn")}
        ${limitPill("14 day", cadet.day14Due, 3)}
        ${limitPill("28 day", cadet.day28Due, 7)}
      </div>
      <p><strong>Work on:</strong> ${escapeHtml(cadet.needsWork || "Nothing logged yet.")}</p>
      <p class="muted"><strong>My notes:</strong> ${escapeHtml(cadet.notes || "No local notes yet.")}</p>
      <div class="card-actions">
        <button data-edit-cadet="${cadet.id}" type="button">Edit</button>
        <button data-note-cadet="${cadet.id}" type="button">Add note</button>
        <button data-ra-done="${cadet.id}" type="button">Mark RA done</button>
      </div>
    </article>
  `;
}

function renderStats() {
  const cadets = state.cadets;
  const needsRaCount = cadets.filter(needsRa).length;
  const limitCount = cadets.filter(limitRisk).length;
  const trainingCount = cadets.filter((cadet) => !cadet.day1 || !cadet.day2).length;
  els.stats.innerHTML = [
    ["Cadets", cadets.length],
    ["Need RA", needsRaCount],
    ["Limit Risk", limitCount],
    ["Need Training", trainingCount],
    ["EMS Listed", state.members.length]
  ].map(([label, value]) => `<article class="stat"><span>${label}</span><strong>${value}</strong></article>`).join("");
  els.lastUpdated.textContent = state.lastUpdated ? `Last import ${new Date(state.lastUpdated).toLocaleString("en-GB")}` : "No imports yet";
}

function renderOverview() {
  const cadets = filteredCadets();
  const needsRaItems = cadets.filter(needsRa);
  const limitItems = cadets.filter(limitRisk);
  const workItems = cadets.filter((cadet) => cadet.needsWork || !cadet.day1 || !cadet.day2 || needsRa(cadet));
  els.needsRaCount.textContent = needsRaItems.length;
  els.limitCount.textContent = limitItems.length;
  els.workCount.textContent = workItems.length;
  els.needsRaList.innerHTML = needsRaItems.length ? needsRaItems.map(cadetCard).join("") : empty("No cadets currently need an RA.");
  els.limitList.innerHTML = limitItems.length ? limitItems.map(cadetCard).join("") : empty("No cadets are close to their 14/28 day limits.");
  els.workList.innerHTML = workItems.length ? workItems.map(cadetCard).join("") : empty("No cadet work items found.");
}

function renderCadets() {
  const cadets = filteredCadets();
  els.cadetGrid.innerHTML = cadets.length ? cadets.map(cadetCard).join("") : empty("No cadets found. Import a sheet or add one manually.");
}

function renderDirectory() {
  const query = els.search.value.trim().toLowerCase();
  const members = state.members.filter((member) => !query || `${member.name} ${member.callsign} ${member.rank} ${member.role}`.toLowerCase().includes(query));
  els.directoryCount.textContent = members.length;
  els.directory.innerHTML = members.length ? members.map((member) => `
    <div class="directory-row">
      <strong>${escapeHtml(member.name || "Unnamed")}</strong>
      <span>${escapeHtml(member.callsign || "No callsign")}</span>
      <span class="muted">${escapeHtml([member.rank, member.role].filter(Boolean).join(" - "))}</span>
      <button data-edit-member="${member.id}" type="button">Edit</button>
    </div>
  `).join("") : empty("No EMS directory entries yet.");
}

function renderNotes() {
  const notes = [...state.notes].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  els.notesCount.textContent = notes.length;
  els.notesList.innerHTML = notes.length ? notes.map((note) => `
    <div class="note-row">
      <strong>${escapeHtml(note.cadetName || "General note")}</strong>
      <span>${escapeHtml(note.note)}</span>
      <span class="muted">${new Date(note.createdAt).toLocaleString("en-GB")}</span>
    </div>
  `).join("") : empty("No local notes yet.");
}

function empty(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function render() {
  renderStats();
  renderOverview();
  renderCadets();
  renderDirectory();
  renderNotes();
}

function field(name, label, value = "", type = "text", extra = "") {
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra} /></label>`;
}

function checkbox(name, label, checked = false) {
  return `<label><span>${label}</span><input name="${name}" type="checkbox" ${checked ? "checked" : ""} /></label>`;
}

function openCadetForm(cadet = null) {
  const item = normalizeCadet(cadet || {});
  els.dialogTitle.textContent = cadet ? "Edit Cadet" : "Add Cadet";
  els.dialogBody.innerHTML = `
    <div class="form-grid">
      ${field("name", "Name", item.name, "text", "required")}
      ${field("callsign", "Callsign", item.callsign)}
      ${field("rank", "Rank", item.rank)}
      ${field("status", "Status", item.status)}
      ${field("trainer", "Trainer", item.trainer)}
      ${field("startDate", "Start date", item.startDate, "date")}
      ${field("day14Due", "14 day due", item.day14Due, "date")}
      ${field("day28Due", "28 day due", item.day28Due, "date")}
      ${field("lastRaDate", "Last RA date", item.lastRaDate, "date")}
      ${checkbox("raCompleted", "RA completed", item.raCompleted)}
      ${checkbox("day1", "Day 1 trained", item.day1)}
      ${checkbox("day2", "Day 2 trained", item.day2)}
      <label class="full">Needs to work on<textarea name="needsWork">${escapeHtml(item.needsWork)}</textarea></label>
      <label class="full">My local notes<textarea name="notes">${escapeHtml(item.notes)}</textarea></label>
      ${field("sheetUrl", "Cadet sheet URL", item.sheetUrl, "url", 'class="full"')}
    </div>
  `;
  els.dialog.dataset.mode = "cadet";
  els.dialog.dataset.id = cadet?.id || "";
  els.dialog.showModal();
}

function openMemberForm(member = null) {
  const item = normalizeMember(member || {});
  els.dialogTitle.textContent = member ? "Edit EMS Member" : "Add EMS Member";
  els.dialogBody.innerHTML = `
    <div class="form-grid">
      ${field("name", "Name", item.name, "text", "required")}
      ${field("callsign", "Callsign", item.callsign)}
      ${field("rank", "Rank", item.rank)}
      ${field("role", "Role", item.role)}
      ${field("status", "Status", item.status)}
      <label class="full">Notes<textarea name="notes">${escapeHtml(item.notes)}</textarea></label>
    </div>
  `;
  els.dialog.dataset.mode = "member";
  els.dialog.dataset.id = member?.id || "";
  els.dialog.showModal();
}

function openNoteForm(cadet) {
  els.dialogTitle.textContent = `Add Note - ${cadet.name || "Cadet"}`;
  els.dialogBody.innerHTML = `<label>Note<textarea name="note" required></textarea></label>`;
  els.dialog.dataset.mode = "note";
  els.dialog.dataset.id = cadet.id;
  els.dialog.showModal();
}

function saveDialog() {
  const data = Object.fromEntries(new FormData(els.dialogForm).entries());
  const id = els.dialog.dataset.id;
  if (els.dialog.dataset.mode === "cadet") {
    const cadet = normalizeCadet({
      ...data,
      id: id || crypto.randomUUID(),
      raCompleted: Boolean(data.raCompleted),
      day1: Boolean(data.day1),
      day2: Boolean(data.day2)
    });
    state.cadets = id ? state.cadets.map((entry) => entry.id === id ? cadet : entry) : [...state.cadets, cadet];
  }
  if (els.dialog.dataset.mode === "member") {
    const member = normalizeMember({ ...data, id: id || crypto.randomUUID() });
    state.members = id ? state.members.map((entry) => entry.id === id ? member : entry) : [...state.members, member];
  }
  if (els.dialog.dataset.mode === "note") {
    const cadet = state.cadets.find((entry) => entry.id === id);
    const note = normalizeNote({ cadetId: id, cadetName: cadet?.name || "", note: data.note });
    state.notes.push(note);
    if (cadet) cadet.notes = [cadet.notes, data.note].filter(Boolean).join("\n");
  }
  saveState();
  render();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportNotes() {
  downloadCsv("ems-notes-to-add-to-sheets.csv", [
    ["Cadet", "Note", "Created At"],
    ...state.notes.map((note) => [note.cadetName, note.note, note.createdAt])
  ]);
}

function exportAll() {
  downloadCsv("ems-dashboard-export.csv", [
    ["Type", "Name", "Callsign", "Rank", "Status", "Day 1", "Day 2", "RA Completed", "14 Day Due", "28 Day Due", "Needs Work", "Notes"],
    ...state.cadets.map((cadet) => ["Cadet", cadet.name, cadet.callsign, cadet.rank, cadet.status, cadet.day1 ? "Yes" : "No", cadet.day2 ? "Yes" : "No", cadet.raCompleted ? "Yes" : "No", cadet.day14Due, cadet.day28Due, cadet.needsWork, cadet.notes]),
    ...state.members.map((member) => ["EMS", member.name, member.callsign, member.rank || member.role, member.status, "", "", "", "", "", "", member.notes])
  ]);
}

document.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "import-google") importGoogleSheet();
  if (action === "import-file") {
    const file = els.csvFile.files?.[0];
    if (!file) return alert("Choose a CSV file first.");
    importRows(parseCsv(await file.text()));
  }
  if (action === "paste-csv") {
    const text = prompt("Paste CSV from your sheet here:");
    if (text) importRows(parseCsv(text));
  }
  if (action === "export-notes") exportNotes();
  if (action === "export-all") exportAll();
  if (action === "add-cadet") openCadetForm();
  if (action === "add-member") openMemberForm();

  const tab = event.target.closest("[data-tab]");
  if (tab) {
    activeTab = tab.dataset.tab;
    els.tabs.forEach((button) => button.classList.toggle("active", button === tab));
    els.views.forEach((view) => view.classList.toggle("is-hidden", view.dataset.view !== activeTab));
  }

  const editCadet = event.target.closest("[data-edit-cadet]");
  if (editCadet) openCadetForm(state.cadets.find((cadet) => cadet.id === editCadet.dataset.editCadet));

  const editMember = event.target.closest("[data-edit-member]");
  if (editMember) openMemberForm(state.members.find((member) => member.id === editMember.dataset.editMember));

  const noteCadet = event.target.closest("[data-note-cadet]");
  if (noteCadet) openNoteForm(state.cadets.find((cadet) => cadet.id === noteCadet.dataset.noteCadet));

  const raDone = event.target.closest("[data-ra-done]");
  if (raDone) {
    const cadet = state.cadets.find((entry) => entry.id === raDone.dataset.raDone);
    if (cadet) {
      cadet.raCompleted = true;
      cadet.lastRaDate = new Date().toISOString().slice(0, 10);
      saveState();
      render();
    }
  }
});

els.search.addEventListener("input", render);
els.statusFilter.addEventListener("change", render);
els.dialogForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "save") saveDialog();
});

render();
