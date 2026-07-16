const STORAGE_KEY = "highlife-ems-dashboard-v1";
const ACTIVE_TAB_KEY = "highlife-ems-active-tab";
const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1g3XXntoqyA9XMgEcXwq89RyqBUymJCpVbG1vlE4BSPY/edit?gid=1321749468#gid=1321749468";
const DEFAULT_ROSTER_URL = "https://docs.google.com/spreadsheets/d/1b9RV4HZh2Klex6jEq8YarlpzpDMt0F4ohV_GscHbSb8/edit?gid=647224122#gid=647224122";
const DEFAULT_MY_CALLSIGN = "M3-18";
const GOOGLE_CLIENT_ID = "210656397822-druudgp358pepcj342slktvmfj5f9ok2.apps.googleusercontent.com";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const RANK_ORDER = [
  "Chief",
  "Deputy Chief",
  "Captain",
  "Lieutenant",
  "Sergeant",
  "Senior EMT",
  "EMT IV",
  "EMT III",
  "EMT II",
  "EMT I",
  "Probationer",
  "Cadet"
];

const state = loadState();
let activeTab = localStorage.getItem(ACTIVE_TAB_KEY) || "overview";
let googleTokenClient = null;
let googleAccessToken = "";

const els = {
  lastUpdated: document.querySelector("[data-last-updated]"),
  stats: document.querySelector("[data-stats]"),
  googleUrl: document.querySelector("[data-google-url]"),
  rosterUrl: document.querySelector("[data-roster-url]"),
  csvFile: document.querySelector("[data-csv-file]"),
  search: document.querySelector("[data-search]"),
  statusFilter: document.querySelector("[data-status-filter]"),
  views: document.querySelectorAll("[data-view]"),
  tabs: document.querySelectorAll("[data-tab]"),
  needsRaList: document.querySelector("[data-needs-ra-list]"),
  limitList: document.querySelector("[data-limit-list]"),
  cadetGrid: document.querySelector("[data-cadet-grid]"),
  directory: document.querySelector("[data-directory]"),
  notesList: document.querySelector("[data-notes-list]"),
  needsRaCount: document.querySelector("[data-count-needs-ra]"),
  limitCount: document.querySelector("[data-count-limits]"),
  directoryCount: document.querySelector("[data-directory-count]"),
  notesCount: document.querySelector("[data-notes-count]"),
  dialog: document.querySelector("[data-dialog]"),
  dialogForm: document.querySelector("[data-dialog-form]"),
  dialogTitle: document.querySelector("[data-dialog-title]"),
  dialogBody: document.querySelector("[data-dialog-body]"),
  myCallsign: document.querySelector("[data-my-callsign]"),
  settingsSummary: document.querySelector("[data-settings-summary]")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      cadets: Array.isArray(saved.cadets) ? saved.cadets.map(normalizeCadet) : [],
      members: Array.isArray(saved.members) ? saved.members.map(normalizeMember) : [],
      notes: Array.isArray(saved.notes) ? saved.notes.map(normalizeNote) : [],
      settings: normalizeSettings(saved.settings),
      lastUpdated: saved.lastUpdated || ""
    };
  } catch {
    return { cadets: [], members: [], notes: [], settings: normalizeSettings(), lastUpdated: "" };
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

function normalizeCallsign(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function cellText(cell = {}) {
  return String(cell.formattedValue || "").trim();
}

function normalizeSettings(raw = {}) {
  return {
    myCallsign: normalizeCallsign(raw.myCallsign || DEFAULT_MY_CALLSIGN)
  };
}

function pick(row, aliases) {
  const keys = Object.keys(row).filter((key) => !key.startsWith("__"));
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
  const number = Number(text);
  if (!Number.isNaN(number)) return number > 0;
  return ["yes", "y", "true", "done", "complete", "completed", "passed", "trained", "1"].includes(text);
}

function parseDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const monthOnly = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,})$/);
  if (monthOnly) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.indexOf(monthOnly[2].slice(0, 3).toLowerCase());
    if (month >= 0) {
      const date = new Date(new Date().getFullYear(), month, Number(monthOnly[1]));
      return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
    }
  }
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

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeCadet(raw = {}) {
  const startDate = parseDate(raw.startDate || raw.start || raw.joined || raw.joinDate);
  const day14Due = parseDate(raw.day14Due || raw.fourteenDayDue || raw["14day"]) || addDays(startDate, 14);
  const day28Due = parseDate(raw.day28Due || raw.twentyEightDayDue || raw["28day"]) || addDays(startDate, 28);
  const trainingAverage = raw.trainingAverage === null || raw.trainingAverage === undefined || raw.trainingAverage === "" ? null : Number(raw.trainingAverage);
  return {
    id: raw.id || crypto.randomUUID(),
    employeeNumber: raw.employeeNumber || "",
    name: raw.name || "",
    callsign: raw.callsign || "",
    rank: raw.rank || "Cadet",
    timezone: raw.timezone || "",
    status: raw.status || "Active",
    trainer: raw.trainer || "",
    startDate,
    day14Due,
    day28Due,
    lastRaDate: parseDate(raw.lastRaDate || raw.lastRA || raw.raDate),
    raCompleted: Boolean(raw.raCompleted),
    myRaCompleted: Boolean(raw.myRaCompleted),
    trainingAverage: Number.isNaN(trainingAverage) ? null : trainingAverage,
    trainingAssessments: Number(raw.trainingAssessments || 0),
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
    employeeNumber: raw.employeeNumber || "",
    name: raw.name || "",
    callsign: raw.callsign || "",
    rank: raw.rank || "",
    steamName: raw.steamName || "",
    discordId: raw.discordId || "",
    timezone: raw.timezone || "",
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
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
  const name = pick(row, ["Name", "Cadet", "Cadet Name"]);
  const callsign = pick(row, ["Callsign", "Call Sign", "Unit", "Radio"]);
  const startDate = pick(row, ["Start Date", "Join Date", "Date Joined", "Cadet Start", "Hired"]);
  const raText = pick(row, ["FTO RA's", "FTO RAs", "Unique FTO RA's", "Unique FTO RAs", "RA", "RA Complete", "RA Completed", "Ride Along", "Ridealong", "Ride Along Complete"]);
  const loa = pick(row, ["LOA", "Leave"]);
  return normalizeCadet({
    employeeNumber: pick(row, ["Employee Number", "Employee #", "Employee ID", "ID"]),
    name,
    callsign,
    rank: pick(row, ["Rank", "Position"]) || "Cadet",
    timezone: pick(row, ["Timezone", "Time Zone", "TZ", "Zone"]),
    status: pick(row, ["Status", "Current Status"]) || (loa && loa !== "-" ? "LOA" : "Active"),
    trainer: pick(row, ["Trainer", "Mentor", "Supervisor"]),
    startDate,
    day14Due: pick(row, ["14 Day", "14 Day Due", "14-Day", "14 Day Limit", "14 day limit"]),
    day28Due: pick(row, ["28 Day", "28 Day Due", "28-Day", "28 Day Limit", "28 day limit"]),
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
    employeeNumber: pick(row, ["Employee Number", "Employee #", "Employee ID", "ID"]),
    name: pick(row, ["Name", "Member", "EMS Name"]),
    callsign: pick(row, ["Callsign", "Call Sign", "Unit", "Radio"]),
    rank: pick(row, ["Rank", "Position"]),
    steamName: pick(row, ["Steam Name", "Steam"]),
    discordId: pick(row, ["Discord ID", "Discord"]),
    timezone: pick(row, ["Timezone", "Time Zone", "TZ"]),
    role: pick(row, ["Role", "Department", "Division"]) || "EMS",
    tags: row.__roleTags || [],
    status: pick(row, ["Status", "Current Status"]) || "Active",
    notes: pick(row, ["Notes", "Comment"])
  });
}

function looksLikeCadet(row) {
  const text = Object.entries(row).map(([key, value]) => `${key} ${value}`).join(" ").toLowerCase();
  return text.includes("employee number") || text.includes("hiring date") || text.includes("14 day limit") || text.includes("28 day limit") || text.includes("cadet") || text.includes("day 1") || text.includes("day 2") || text.includes("ride") || text.includes("ra");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.some((value) => String(value).trim())) rows.push(row);
    row = [];
  };

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

  return rowsToObjects(rows);
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

function replaceByName(existing, incoming, normalizer) {
  const previous = new Map(existing.map((entry) => [`${normalizeKey(entry.name)}:${normalizeKey(entry.callsign)}`, entry]));
  return incoming.map(normalizer).filter((entry) => entry.name || entry.callsign).map((item) => {
    const key = `${normalizeKey(item.name)}:${normalizeKey(item.callsign)}`;
    const match = previous.get(key);
    return match ? { ...match, ...item, id: match.id, notes: match.notes || item.notes } : item;
  }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function memberKey(member) {
  return normalizeKey(member.employeeNumber || "") || `${normalizeKey(member.name)}:${normalizeKey(member.callsign)}`;
}

function replaceMembers(existing, incoming) {
  const previous = new Map(existing.map((entry) => [memberKey(entry), entry]));
  const unique = new Map();
  for (const item of incoming.map(normalizeMember).filter((entry) => entry.name || entry.callsign || entry.employeeNumber)) {
    const key = memberKey(item);
    const match = previous.get(key);
    unique.set(key, match ? { ...match, ...item, id: match.id, notes: match.notes || item.notes } : item);
  }
  return [...unique.values()].sort((a, b) => {
    const callCompare = String(a.callsign || "").localeCompare(String(b.callsign || ""), undefined, { numeric: true });
    return callCompare || String(a.name).localeCompare(String(b.name));
  });
}

function importRows(rows) {
  const cadetRows = [];
  for (const row of rows) {
    if (looksLikeCadet(row)) cadetRows.push(cadetFromRow(row));
  }
  state.cadets = cadetRows.length ? replaceByName(state.cadets, cadetRows, normalizeCadet) : state.cadets;
  state.lastUpdated = new Date().toISOString();
  saveState();
  render();
  return cadetRows.length;
}

function importRosterRows(rows) {
  const memberRows = rows.map(memberFromRow).filter((member) => member.name || member.callsign || member.employeeNumber);
  state.members = replaceMembers(state.members, memberRows);
  state.lastUpdated = new Date().toISOString();
  saveState();
  render();
  return memberRows.length;
}

function sheetInfoFromUrl(input) {
  const url = String(input || DEFAULT_SHEET_URL).trim();
  const id = url.match(/\/spreadsheets\/d\/([^/]+)/)?.[1];
  const gid = url.match(/[?#&]gid=(\d+)/)?.[1] || "0";
  if (!id) throw new Error("That does not look like a Google Sheets link.");
  return { id, gid };
}

function googleCsvUrl(input) {
  const { id, gid } = sheetInfoFromUrl(input);
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

function waitForGoogleIdentity() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.google?.accounts?.oauth2) return resolve();
      if (Date.now() - started > 8000) return reject(new Error("Google sign-in did not load. Check your connection or content blockers."));
      setTimeout(tick, 100);
    };
    tick();
  });
}

async function ensureGoogleAccessToken() {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "PASTE_GOOGLE_CLIENT_ID_HERE") {
    throw new Error("Google sign-in needs a Google OAuth Client ID added to ems-dashboard.js first.");
  }
  if (googleAccessToken) return googleAccessToken;
  await waitForGoogleIdentity();
  return new Promise((resolve, reject) => {
    googleTokenClient = googleTokenClient || google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SHEETS_SCOPE
    });
    googleTokenClient.callback = (response) => {
      if (response.error) return reject(new Error(response.error_description || response.error));
      googleAccessToken = response.access_token || "";
      if (!googleAccessToken) return reject(new Error("Google did not return an access token."));
      resolve(googleAccessToken);
    };
    googleTokenClient.requestAccessToken({ prompt: "consent" });
  });
}

async function fetchSheetJson(url) {
  const token = await ensureGoogleAccessToken();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.status === 401 || response.status === 403) {
    googleAccessToken = "";
    throw new Error("Your Google account does not have access to this sheet, or permission expired.");
  }
  if (!response.ok) throw new Error(`Google Sheets returned ${response.status}.`);
  return response.json();
}

async function sheetTitleFromInfo(id, gid) {
  const metadata = await fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?fields=sheets.properties(sheetId,title)`);
  const sheet = (metadata.sheets || []).find((entry) => String(entry.properties?.sheetId) === String(gid)) || metadata.sheets?.[0];
  const title = sheet?.properties?.title;
  if (!title) throw new Error("Could not find that sheet tab.");
  return title;
}

async function sheetMetadata(id) {
  return fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?fields=sheets.properties(sheetId,title)`);
}

function findSheetTitle(sheets = [], gid) {
  const sheet = sheets.find((entry) => String(entry.properties?.sheetId) === String(gid)) || sheets[0];
  const title = sheet?.properties?.title;
  if (!title) throw new Error("Could not find that sheet tab.");
  return title;
}

function sheetRange(title, range = "A1:Z220") {
  return `'${String(title).replace(/'/g, "''")}'!${range}`;
}

async function applyMyRaFromCadetTabs(spreadsheetId, sheets = []) {
  const myCallsign = normalizeCallsign(state.settings?.myCallsign);
  const titles = new Set(sheets.map((entry) => entry.properties?.title).filter(Boolean));
  const targets = state.cadets
    .filter((cadet) => cadet.callsign && titles.has(cadet.callsign))
    .map((cadet) => ({ cadet, range: sheetRange(cadet.callsign, "A1:Z130") }));
  if (!targets.length) return;
  const ranges = targets.map((target) => `ranges=${encodeURIComponent(target.range)}`).join("&");
  const fields = encodeURIComponent("sheets(properties(title),data(rowData(values(formattedValue,effectiveFormat(backgroundColor,backgroundColorStyle(rgbColor))))))");
  const data = await fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?includeGridData=true&${ranges}&fields=${fields}`);
  const byTitle = new Map((data.sheets || []).map((sheet) => [sheet.properties?.title, sheet]));
  targets.forEach(({ cadet }) => {
    const sheet = byTitle.get(cadet.callsign);
    const cells = sheet?.data?.[0]?.rowData || [];
    if (myCallsign) cadet.myRaCompleted = cadetHasRaCallsign(cells, myCallsign);
    const score = cadetTrainingScore(sheet);
    cadet.trainingAverage = score.average;
    cadet.trainingAssessments = score.count;
  });
  saveState();
  render();
}

function rowsFromValues(values = []) {
  return rowsToObjects(values);
}

function rowsFromGridSheet(sheet = {}) {
  const rowData = sheet.data?.[0]?.rowData || [];
  const cellRows = rowData.map((row) => row.values || []);
  const values = cellRows.map((cells) => cells.map((cell) => cell.formattedValue || ""));
  return rowsToObjects(values, cellRows);
}

function headerScore(row = []) {
  const text = row.map(normalizeKey);
  const has = (label) => text.includes(normalizeKey(label));
  let score = 0;
  if (has("Employee Number")) score += 4;
  if (has("Callsign")) score += 4;
  if (has("Name")) score += 4;
  if (has("Rank")) score += 3;
  if (has("Timezone")) score += 3;
  if (has("Hiring Date")) score += 3;
  if (has("14 day limit")) score += 3;
  if (has("28 day limit")) score += 3;
  if (has("Day 1")) score += 2;
  if (has("Day 2")) score += 2;
  if (has("FTO RA's") || has("Unique FTO RA's")) score += 2;
  if (has("FTO")) score += 2;
  if (has("HART")) score += 2;
  if (has("MET")) score += 2;
  if (has("Doctor")) score += 2;
  return score;
}

function cellColor(cell = {}) {
  return cell.effectiveFormat?.backgroundColorStyle?.rgbColor || cell.effectiveFormat?.backgroundColor || null;
}

function isGreenCell(cell = {}) {
  const color = cellColor(cell);
  if (!color) return false;
  const red = color.red ?? 0;
  const green = color.green ?? 0;
  const blue = color.blue ?? 0;
  return green > 0.55 && green > red + 0.08 && green > blue + 0.08;
}

function cadetHasRaCallsign(rows = [], myCallsign = "") {
  const target = normalizeCallsign(myCallsign);
  if (!target) return false;
  const callsignRow = rows.find((row) => (
    (row.values || []).some((cell) => normalizeKey(cellText(cell)).includes("callsignhere"))
  ));
  if (!callsignRow) return false;
  const values = callsignRow.values || [];
  const labelIndex = values.findIndex((cell) => normalizeKey(cellText(cell)).includes("callsignhere"));
  return values
    .slice(Math.max(labelIndex + 1, 0))
    .some((cell) => normalizeCallsign(cellText(cell)) === target);
}

function assessmentScoreFromCell(cell = {}, rowIndex = 0, columnIndex = 0) {
  if (rowIndex < 10 || columnIndex < 6) return null;
  const color = cellColor(cell);
  if (!color) return null;
  const red = color.red ?? 0;
  const green = color.green ?? 0;
  const blue = color.blue ?? 0;
  if (red > 0.75 && green < 0.35 && blue < 0.35) return 3;
  if (red > 0.75 && green >= 0.35 && green < 0.78 && blue < 0.35) return 2;
  if (green > 0.45 && green > red + 0.08 && green > blue + 0.08) return 1;
  return null;
}

function cadetTrainingScore(sheet = {}) {
  let total = 0;
  let count = 0;
  const rows = sheet.data?.[0]?.rowData || [];
  rows.forEach((row, rowIndex) => {
    (row.values || []).forEach((cell, columnIndex) => {
      const score = assessmentScoreFromCell(cell, rowIndex, columnIndex);
      if (score !== null) {
        total += score;
        count += 1;
      }
    });
  });
  return {
    average: count ? Number((total / count).toFixed(2)) : null,
    count
  };
}

function roleFlag(cell = {}) {
  return boolValue(cell.formattedValue) || isGreenCell(cell);
}

function rowsToObjects(values = [], cellRows = []) {
  if (!values.length) return [];
  const headerIndex = values.slice(0, 15).reduce((best, row, index) => headerScore(row) > headerScore(values[best] || []) ? index : best, 0);
  const seen = new Map();
  const headers = (values[headerIndex] || []).map((header, index) => {
    const base = String(header || `Column ${index + 1}`).trim();
    const key = normalizeKey(base);
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    return count ? `${base} ${index + 1}` : base;
  });
  return values.slice(headerIndex + 1)
    .filter((row) => row.some((value) => String(value || "").trim()))
    .map((row, rowOffset) => {
      const object = Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]));
      const cells = cellRows[headerIndex + 1 + rowOffset] || [];
      object.__roleTags = headers
        .map((header, index) => ["FTO", "HART", "MET", "Doctor"].includes(header) && roleFlag(cells[index]) ? header : "")
        .filter(Boolean);
      return object;
    });
}

async function importPrivateGoogleSheet() {
  const { id, gid } = sheetInfoFromUrl(els.googleUrl.value);
  const metadata = await sheetMetadata(id);
  const title = findSheetTitle(metadata.sheets || [], gid);
  const range = encodeURIComponent(`'${title.replace(/'/g, "''")}'`);
  const values = await fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${range}?majorDimension=ROWS`);
  const count = importRows(rowsFromValues(values.values || []));
  await applyMyRaFromCadetTabs(id, metadata.sheets || []);
  return count;
}

async function importPrivateRosterSheet() {
  const { id, gid } = sheetInfoFromUrl(els.rosterUrl?.value || DEFAULT_ROSTER_URL);
  const title = await sheetTitleFromInfo(id, gid);
  const range = encodeURIComponent(`'${title.replace(/'/g, "''")}'`);
  const fields = encodeURIComponent("sheets(properties(sheetId,title),data(rowData(values(formattedValue,effectiveFormat(backgroundColor,backgroundColorStyle(rgbColor))))))");
  const spreadsheet = await fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?includeGridData=true&ranges=${range}&fields=${fields}`);
  const sheet = (spreadsheet.sheets || []).find((entry) => String(entry.properties?.sheetId) === String(gid)) || spreadsheet.sheets?.[0];
  return importRosterRows(rowsFromGridSheet(sheet || {}));
}

async function importGoogleSheet() {
  let cadetCount = 0;
  let rosterCount = 0;
  const errors = [];
  try {
    cadetCount = await importPrivateGoogleSheet();
  } catch (privateError) {
    try {
      const url = googleCsvUrl(els.googleUrl.value);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Google returned ${response.status}`);
      const text = await response.text();
      if (/html|doctype|sign in/i.test(text.slice(0, 300))) throw new Error("The sheet did not return CSV. It may need to be shared or published.");
      cadetCount = importRows(parseCsv(text));
    } catch (publicError) {
      errors.push(`Cadet sheet: ${privateError.message}; CSV fallback: ${publicError.message}`);
    }
  }
  try {
    rosterCount = await importPrivateRosterSheet();
  } catch (rosterError) {
    errors.push(`Roster sheet: ${rosterError.message}`);
  }
  if (errors.length) {
    alert(`Synced with issues.\n\nImported ${cadetCount} cadet row(s) and ${rosterCount} roster row(s).\n\n${errors.join("\n")}`);
  } else {
    alert(`Synced ${cadetCount} cadet row(s) and ${rosterCount} roster row(s).`);
  }
}

function filteredCadets() {
  const query = els.search.value.trim().toLowerCase();
  const filter = els.statusFilter.value;
  return state.cadets.filter((cadet) => {
    const text = `${cadet.name} ${cadet.callsign} ${cadet.rank} ${cadet.timezone} ${cadet.status} ${cadet.needsWork} ${cadet.notes}`.toLowerCase();
    if (query && !text.includes(query)) return false;
    if (filter === "needs-ra" && !needsRa(cadet)) return false;
    if (filter === "limit-risk" && !limitRisk(cadet)) return false;
    if (filter === "needs-training" && (cadet.day1 && cadet.day2)) return false;
    if (filter === "active" && !String(cadet.status).toLowerCase().includes("active")) return false;
    return true;
  });
}

function needsRa(cadet) {
  return String(cadet.status).toLowerCase().includes("active") && !cadet.myRaCompleted;
}

function limitRisk(cadet) {
  const day14 = daysUntil(cadet.day14Due);
  const day28 = daysUntil(cadet.day28Due);
  return (day14 !== null && day14 >= 0 && day14 <= 3) || (day28 !== null && day28 >= 0 && day28 <= 7);
}

function pill(label, stateName = "") {
  return `<span class="pill ${stateName}">${escapeHtml(label)}</span>`;
}

function rolePill(label) {
  const className = {
    FTO: "fto",
    HART: "hart",
    MET: "met",
    Doctor: "doctor"
  }[label] || "ems";
  return pill(label, className);
}

function roleTagRow(tags = []) {
  const current = new Set(tags);
  return ["FTO", "HART", "MET", "Doctor"].map((role) => (
    current.has(role) ? rolePill(role) : `<span class="pill role-placeholder" aria-hidden="true">${role}</span>`
  )).join("");
}

function directoryRank(member) {
  return member.rank || "Unranked";
}

function rankOrderIndex(rank) {
  const index = RANK_ORDER.findIndex((item) => normalizeKey(item) === normalizeKey(rank));
  return index >= 0 ? index : RANK_ORDER.length;
}

function directoryRankGroup(rank, members) {
  return `
    <section class="directory-group">
      <div class="directory-rank">
        <span>${escapeHtml(rank)}</span>
        <strong>${members.length}</strong>
      </div>
      ${members.map(directoryRow).join("")}
    </section>
  `;
}

function directoryRow(member) {
  return `
    <div class="directory-row">
      <strong>${escapeHtml(member.name || "Unnamed")}</strong>
      <span>${escapeHtml(member.callsign || "No callsign")}</span>
      <span>${escapeHtml(member.employeeNumber || "No employee #")}</span>
      <span class="muted">${escapeHtml(member.timezone || "No timezone")}</span>
      <span class="tag-row">${roleTagRow(member.tags || [])}</span>
    </div>
  `;
}

function limitPill(label, dueDate, dangerAt) {
  const days = daysUntil(dueDate);
  if (days === null) return pill(`${label}: not set`, "warn");
  if (days < 0) return "";
  const stateName = days <= dangerAt ? "warn" : "good";
  const text = `${label}: ${days}d left`;
  return pill(text, stateName);
}

function trainingLevel(cadet) {
  const average = Number(cadet.trainingAverage);
  if (!average || Number.isNaN(average)) return "none";
  if (average <= 1.35) return "good";
  if (average <= 1.9) return "warn";
  return "bad";
}

function trainingPill(cadet) {
  const average = Number(cadet.trainingAverage);
  if (!average || Number.isNaN(average)) return pill("No avg", "zone");
  const label = trainingLevel(cadet) === "good" ? "Confident" : trainingLevel(cadet) === "warn" ? "Developing" : "Needs attention";
  return pill(`${label} ${average.toFixed(2)}`, trainingLevel(cadet));
}

function cadetCard(cadet, options = {}) {
  const dayPills = [
    cadet.day1 ? options.onlyMissingTraining ? "" : pill("Day 1", "good") : pill("No Day 1", "warn"),
    cadet.day2 ? options.onlyMissingTraining ? "" : pill("Day 2", "good") : pill("No Day 2", "warn")
  ].join("");
  const raPill = options.hideRaPill ? "" : needsRa(cadet) ? pill("Needs my RA", "bad") : pill("My RA done", "good");
  return `
    <article class="card training-${trainingLevel(cadet)}">
      <div class="card-head">
        <div>
          <h3>${escapeHtml(cadet.name || "Unnamed cadet")}</h3>
          <p class="muted">${escapeHtml([cadet.callsign || "No callsign", cadet.employeeNumber ? `#${cadet.employeeNumber}` : "", cadet.rank].filter(Boolean).join(" - "))}</p>
        </div>
        <div class="status-pills">
          ${pill(cadet.status || "Active", String(cadet.status).toLowerCase().includes("active") ? "good" : "warn")}
          ${cadet.timezone ? pill(cadet.timezone, "zone") : ""}
        </div>
      </div>
      <div class="pill-row">
        ${raPill}
        ${dayPills}
        ${trainingPill(cadet)}
        ${limitPill("14 day", cadet.day14Due, 3)}
        ${limitPill("28 day", cadet.day28Due, 7)}
      </div>
      <p><strong>Work on:</strong> ${escapeHtml(cadet.needsWork || "Nothing logged yet.")}</p>
      <p class="muted"><strong>My notes:</strong> ${escapeHtml(cadet.notes || "No local notes yet.")}</p>
      <div class="card-actions">
        <button data-edit-cadet="${cadet.id}" type="button">Edit</button>
        <button data-note-cadet="${cadet.id}" type="button">Add note</button>
        <button data-ra-done="${cadet.id}" type="button">RA done</button>
      </div>
    </article>
  `;
}

function overviewCadetCard(cadet, options = {}) {
  const missingTraining = [
    cadet.day1 ? "" : pill("No Day 1", "warn"),
    cadet.day2 ? "" : pill("No Day 2", "warn")
  ].join("");
  return `
    <article class="card training-${trainingLevel(cadet)}">
      <div class="card-head">
        <div>
          <h3>${escapeHtml(cadet.name || "Unnamed cadet")}</h3>
          <p class="muted">${escapeHtml([cadet.callsign || "No callsign", cadet.employeeNumber ? `#${cadet.employeeNumber}` : "", cadet.rank].filter(Boolean).join(" - "))}</p>
        </div>
        <div class="status-pills">
          ${cadet.timezone ? pill(cadet.timezone, "zone") : ""}
        </div>
      </div>
      <div class="pill-row">
        ${options.showRaPill ? needsRa(cadet) ? pill("Needs my RA", "bad") : pill("My RA done", "good") : ""}
        ${missingTraining}
        ${trainingPill(cadet)}
        ${limitPill("14 day", cadet.day14Due, 3)}
        ${limitPill("28 day", cadet.day28Due, 7)}
      </div>
      <p><strong>Work on:</strong> ${escapeHtml(cadet.needsWork || "Nothing logged yet.")}</p>
      <p class="muted"><strong>My notes:</strong> ${escapeHtml(cadet.notes || "No local notes yet.")}</p>
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
    ["Need My RA", needsRaCount],
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
  els.needsRaCount.textContent = needsRaItems.length;
  els.limitCount.textContent = limitItems.length;
  els.needsRaList.innerHTML = needsRaItems.length ? needsRaItems.map((cadet) => overviewCadetCard(cadet)).join("") : empty("No cadets currently need an RA.");
  els.limitList.innerHTML = limitItems.length ? limitItems.map((cadet) => overviewCadetCard(cadet, { showRaPill: true })).join("") : empty("No cadets are close to their 14/28 day limits.");
}

function renderCadets() {
  const cadets = filteredCadets();
  els.cadetGrid.innerHTML = cadets.length ? cadets.map(cadetCard).join("") : empty("No cadets found. Import a sheet or add one manually.");
}

function renderDirectory() {
  const query = els.search.value.trim().toLowerCase();
  const members = state.members.filter((member) => !query || `${member.name} ${member.callsign} ${member.rank} ${member.employeeNumber} ${member.timezone} ${(member.tags || []).join(" ")}`.toLowerCase().includes(query));
  els.directoryCount.textContent = members.length;
  const groups = new Map();
  for (const member of members) {
    const rank = directoryRank(member);
    groups.set(rank, [...(groups.get(rank) || []), member]);
  }
  const sortedGroups = [...groups.entries()].sort(([rankA], [rankB]) => {
    const orderCompare = rankOrderIndex(rankA) - rankOrderIndex(rankB);
    return orderCompare || String(rankA).localeCompare(String(rankB));
  });
  els.directory.innerHTML = members.length ? sortedGroups.map(([rank, rankMembers]) => directoryRankGroup(rank, rankMembers)).join("") : empty("No EMS directory entries yet.");
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

function renderSettings() {
  if (els.myCallsign) els.myCallsign.value = state.settings?.myCallsign || DEFAULT_MY_CALLSIGN;
  if (els.settingsSummary) {
    els.settingsSummary.textContent = `Current RA callsign check: ${state.settings?.myCallsign || DEFAULT_MY_CALLSIGN}`;
  }
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
  renderSettings();
}

function setActiveTab(tabName) {
  const tabExists = [...els.tabs].some((button) => button.dataset.tab === tabName);
  activeTab = tabExists ? tabName : "overview";
  localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  els.tabs.forEach((button) => button.classList.toggle("active", button.dataset.tab === activeTab));
  els.views.forEach((view) => view.classList.toggle("is-hidden", view.dataset.view !== activeTab));
  els.stats.classList.toggle("is-hidden", activeTab === "cheat-sheet");
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

function saveSettings() {
  state.settings = normalizeSettings({ myCallsign: els.myCallsign?.value || DEFAULT_MY_CALLSIGN });
  saveState();
  render();
  alert(`Settings saved. Your RA callsign is ${state.settings.myCallsign}. Sync the sheet again to refresh Needs RA From Me.`);
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
    ["Type", "Name", "Callsign", "Employee Number", "Rank", "Timezone", "Tags", "Status", "Day 1", "Day 2", "RA Completed", "14 Day Due", "28 Day Due", "Needs Work", "Notes"],
    ...state.cadets.map((cadet) => ["Cadet", cadet.name, cadet.callsign, cadet.employeeNumber || "", cadet.rank, cadet.timezone || "", "", cadet.status, cadet.day1 ? "Yes" : "No", cadet.day2 ? "Yes" : "No", cadet.raCompleted ? "Yes" : "No", cadet.day14Due, cadet.day28Due, cadet.needsWork, cadet.notes]),
    ...state.members.map((member) => ["EMS", member.name, member.callsign, member.employeeNumber, member.rank, member.timezone, (member.tags || []).join(" / "), member.status, "", "", "", "", "", "", member.notes])
  ]);
}

document.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "google-sign-in") {
    try {
      await ensureGoogleAccessToken();
      alert("Google sign-in connected. You can now sync the sheet.");
    } catch (error) {
      alert(error.message);
    }
  }
  if (action === "import-google") importGoogleSheet();
  if (action === "save-settings") saveSettings();
  if (action === "import-file") {
    const file = els.csvFile?.files?.[0];
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
    setActiveTab(tab.dataset.tab);
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
      cadet.myRaCompleted = true;
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
setActiveTab(activeTab);
