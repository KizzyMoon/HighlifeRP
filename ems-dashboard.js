const STORAGE_KEY = "highlife-ems-dashboard-v1";
const ACTIVE_TAB_KEY = "highlife-ems-active-tab";
const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1g3XXntoqyA9XMgEcXwq89RyqBUymJCpVbG1vlE4BSPY/edit?gid=1321749468#gid=1321749468";
const DEFAULT_ROSTER_URL = "https://docs.google.com/spreadsheets/d/1b9RV4HZh2Klex6jEq8YarlpzpDMt0F4ohV_GscHbSb8/edit?gid=647224122#gid=647224122";
const DEFAULT_MY_CALLSIGN = "M3-18";
const GOOGLE_CLIENT_ID = "210656397822-druudgp358pepcj342slktvmfj5f9ok2.apps.googleusercontent.com";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const RA_VERIFICATION_VERSION = "callsign-row-v3";
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
const TRAINING_SECTIONS = [
  "General",
  "Day 1 Training",
  "F5 Menu",
  "Object Menu",
  "EMT Actions",
  "Basic Treatments/Procedures",
  "Day 2 Training",
  "Intermediate Treatments",
  "PD Scenes",
  "Field Training",
  "10-Codes/Radio"
];

const state = loadState();
let activeTab = localStorage.getItem(ACTIVE_TAB_KEY) || "overview";
let googleTokenClient = null;
let googleAccessToken = "";

const els = {
  lastUpdated: document.querySelector("[data-last-updated]"),
  toolbar: document.querySelector(".toolbar"),
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
  dialogSave: document.querySelector("[data-dialog-save]"),
  myCallsign: document.querySelector("[data-my-callsign]"),
  settingsSummary: document.querySelector("[data-settings-summary]"),
  googleEmail: document.querySelector("[data-google-email]")
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
    myCallsign: normalizeCallsign(raw.myCallsign || DEFAULT_MY_CALLSIGN),
    googleEmail: String(raw.googleEmail || "").trim()
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
  const trainingOverallAverage = raw.trainingOverallAverage === null || raw.trainingOverallAverage === undefined || raw.trainingOverallAverage === "" ? null : Number(raw.trainingOverallAverage);
  return {
    id: raw.id || crypto.randomUUID(),
    employeeNumber: raw.employeeNumber || "",
    name: raw.name || "",
    callsign: raw.callsign || "",
    discordId: raw.discordId || "",
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
    myRaVerified: Boolean(raw.myRaVerified) && raw.myRaVerificationVersion === RA_VERIFICATION_VERSION,
    myRaVerificationVersion: raw.myRaVerificationVersion || "",
    trainingAverage: Number.isNaN(trainingAverage) ? null : trainingAverage,
    trainingOverallAverage: Number.isNaN(trainingOverallAverage) ? null : trainingOverallAverage,
    trainingTrend: raw.trainingTrend || "none",
    trainingRaCount: Number(raw.trainingRaCount || 0),
    trainingAssessments: Number(raw.trainingAssessments || 0),
    latestStruggles: normalizeFocusGroups(raw.latestStruggles),
    unassessedItems: normalizeFocusGroups(raw.unassessedItems),
    day1: Boolean(raw.day1),
    day2: Boolean(raw.day2),
    needsWork: raw.needsWork || "",
    sheetUrl: raw.sheetUrl || "",
    notes: raw.notes || "",
    raOffers: Array.isArray(raw.raOffers) ? raw.raOffers.map(normalizeRaOffer).filter((offer) => offer.createdAt) : [],
    sheetNotes: Array.isArray(raw.sheetNotes) ? raw.sheetNotes.filter(Boolean) : []
  };
}

function normalizeRaOffer(raw = {}) {
  return {
    id: raw.id || crypto.randomUUID(),
    createdAt: raw.createdAt || ""
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
    discordId: pick(row, ["Discord", "Discord ID", "Discord Name", "Discord Username"]),
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
    return match ? { ...match, ...item, id: match.id, notes: match.notes || item.notes, raOffers: match.raOffers || item.raOffers } : item;
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

async function ensureGoogleAccessToken(options = {}) {
  const prompt = options.prompt ?? "";
  const loginHint = String(options.loginHint || state.settings?.googleEmail || "").trim();
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "PASTE_GOOGLE_CLIENT_ID_HERE") {
    throw new Error("Google sign-in needs a Google OAuth Client ID added to ems-dashboard.js first.");
  }
  if (googleAccessToken) return googleAccessToken;
  await waitForGoogleIdentity();
  return new Promise((resolve, reject) => {
    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SHEETS_SCOPE,
      include_granted_scopes: true,
      login_hint: loginHint || undefined,
      error_callback: (error) => reject(new Error(error?.message || error?.type || "Google sign-in was blocked."))
    });
    googleTokenClient.callback = (response) => {
      if (response.error) return reject(new Error(response.error_description || response.error));
      googleAccessToken = response.access_token || "";
      if (!googleAccessToken) return reject(new Error("Google did not return an access token."));
      resolve(googleAccessToken);
    };
    googleTokenClient.requestAccessToken({ prompt });
  });
}

async function fetchSheetJson(url, options = {}) {
  const token = await ensureGoogleAccessToken(options);
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

async function sheetTitleFromInfo(id, gid, options = {}) {
  const metadata = await fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?fields=sheets.properties(sheetId,title)`, options);
  const sheet = (metadata.sheets || []).find((entry) => String(entry.properties?.sheetId) === String(gid)) || metadata.sheets?.[0];
  const title = sheet?.properties?.title;
  if (!title) throw new Error("Could not find that sheet tab.");
  return title;
}

async function sheetMetadata(id, options = {}) {
  return fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?fields=sheets.properties(sheetId,title)`, options);
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

async function applyMyRaFromCadetTabs(spreadsheetId, sheets = [], options = {}) {
  const myCallsign = normalizeCallsign(state.settings?.myCallsign);
  const titles = new Set(sheets.map((entry) => entry.properties?.title).filter(Boolean));
  state.cadets.forEach((cadet) => {
    cadet.myRaCompleted = false;
    cadet.myRaVerified = false;
    cadet.myRaVerificationVersion = "";
  });
  const targets = state.cadets
    .filter((cadet) => cadet.callsign && titles.has(cadet.callsign))
    .map((cadet) => ({ cadet, range: sheetRange(cadet.callsign, "A1:Z260") }));
  if (!targets.length) {
    saveState();
    render();
    return;
  }
  const ranges = targets.map((target) => `ranges=${encodeURIComponent(target.range)}`).join("&");
  const fields = encodeURIComponent("sheets(properties(title),data(rowData(values(formattedValue,effectiveValue,effectiveFormat(backgroundColor,backgroundColorStyle(rgbColor))))))");
  const data = await fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?includeGridData=true&${ranges}&fields=${fields}`, options);
  const byTitle = new Map((data.sheets || []).map((sheet) => [sheet.properties?.title, sheet]));
  targets.forEach(({ cadet }) => {
    const sheet = byTitle.get(cadet.callsign);
    const cells = sheet?.data?.[0]?.rowData || [];
    cadet.myRaVerified = true;
    cadet.myRaVerificationVersion = RA_VERIFICATION_VERSION;
    cadet.myRaCompleted = myCallsign ? cadetHasRaCallsign(cells, myCallsign) : false;
    const score = cadetTrainingScore(sheet);
    cadet.trainingAverage = score.average;
    cadet.trainingOverallAverage = score.overallAverage;
    cadet.trainingTrend = score.trend;
    cadet.trainingRaCount = score.raCount;
    cadet.trainingAssessments = score.count;
    cadet.latestStruggles = score.latestStruggles;
    cadet.unassessedItems = score.unassessedItems;
    cadet.sheetNotes = cadetSheetNotes(sheet);
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
  const rowIndex = rows.findIndex((row, index) => {
    const values = row.values || [];
    const hasCallsignHeader = values.some((cell) => normalizeKey(cellText(cell)) === "callsignhere");
    if (!hasCallsignHeader) return false;
    const previousRow = rows[index - 1]?.values || [];
    const nextRow = rows[index + 1]?.values || [];
    const hasEmployeeHeader = previousRow.some((cell) => normalizeKey(cellText(cell)) === "ehere");
    const hasDateHeader = nextRow.some((cell) => normalizeKey(cellText(cell)) === "dategoeshere");
    return hasEmployeeHeader && hasDateHeader;
  });
  if (rowIndex < 0) return false;
  const callsignRow = rows[rowIndex];
  const values = callsignRow.values || [];
  const labelIndex = values.findIndex((cell) => normalizeKey(cellText(cell)) === "callsignhere");
  return values
    .slice(Math.max(labelIndex + 1, 0))
    .some((cell) => normalizeCallsign(cellText(cell)) === target);
}

function cadetSheetNotes(sheet = {}) {
  const rows = sheet.data?.[0]?.rowData || [];
  const noteRows = rows.map((row) => (
    (row.values || [])
      .map(cellText)
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  ));
  let startIndex = noteRows.findIndex((text) => {
    const key = normalizeKey(text);
    return key.includes("commentssummary") || key.includes("summaryduringtheridealong");
  });
  startIndex = startIndex >= 0 ? startIndex + 1 : Math.max(0, noteRows.length - 35);
  return noteRows
    .slice(startIndex)
    .filter((text) => text && !normalizeKey(text).includes("commentssummary") && !isAdminSheetNote(text))
    .slice(0, 24);
}

function isAdminSheetNote(text = "") {
  const key = normalizeKey(text);
  return key.includes("sopphrasesent")
    || key.includes("day1training")
    || key.includes("day1trained")
    || key.includes("day2training")
    || key.includes("day2trained");
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

function cellChecked(cell = {}) {
  if (cell.effectiveValue?.boolValue === true) return true;
  return boolValue(cellText(cell));
}

function trainingLabelCandidates(cells = []) {
  return cells
    .slice(0, 6)
    .map(cellText)
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((text) => {
      const key = normalizeKey(text);
      return key
        && key !== "dontcolorthis"
        && key !== "color"
        && key !== "whatitmeans"
        && key !== "general"
        && !["1", "2", "3", "blank", "true", "false", "yes", "no"].includes(key);
    });
}

function trainingSectionLabel(cells = []) {
  const candidates = trainingLabelCandidates(cells);
  const found = candidates.find((label) => TRAINING_SECTIONS.some((section) => normalizeKey(section) === normalizeKey(label)));
  if (!found) return "";
  return TRAINING_SECTIONS.find((section) => normalizeKey(section) === normalizeKey(found)) || found;
}

function trainingRowLabel(cells = []) {
  if (trainingSectionLabel(cells)) return "";
  const labels = trainingLabelCandidates(cells);
  const label = labels[labels.length - 1] || "";
  const key = normalizeKey(label);
  if (!label || key.includes("training") || key.includes("treatmentsprocedures") || key.includes("pdscenes") || key.includes("emtactions") || key.includes("objectmenu")) {
    return "";
  }
  return label;
}

function isRequiredTrainingRow(cells = []) {
  return cells.slice(0, 6).some(cellChecked);
}

function averageScore(scores = []) {
  if (!scores.length) return null;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
}

function groupFocusItems(rows = []) {
  const groups = new Map();
  rows.forEach(({ group, item }) => {
    const groupName = group || "Other";
    if (!groups.has(groupName)) groups.set(groupName, new Set());
    groups.get(groupName).add(item);
  });
  return [...groups.entries()].map(([group, items]) => ({ group, items: [...items] }));
}

function normalizeFocusGroups(raw = []) {
  if (!Array.isArray(raw)) return [];
  if (raw.some((entry) => entry && typeof entry === "object" && Array.isArray(entry.items))) {
    return raw
      .map((entry) => ({
        group: String(entry.group || "Other"),
        items: Array.isArray(entry.items) ? entry.items.filter(Boolean) : []
      }))
      .filter((entry) => entry.items.length);
  }
  return raw.filter(Boolean);
}

function cadetTrainingScore(sheet = {}) {
  let total = 0;
  let count = 0;
  const columnScores = new Map();
  const rowDetails = [];
  const rows = sheet.data?.[0]?.rowData || [];
  let currentSection = "General";
  rows.forEach((row, rowIndex) => {
    const cells = row.values || [];
    const section = trainingSectionLabel(cells);
    if (section) currentSection = section;
    const label = trainingRowLabel(cells);
    let latestScore = null;
    let latestColumn = null;
    let hasAnyScore = false;
    (row.values || []).forEach((cell, columnIndex) => {
      const score = assessmentScoreFromCell(cell, rowIndex, columnIndex);
      if (score !== null) {
        total += score;
        count += 1;
        columnScores.set(columnIndex, [...(columnScores.get(columnIndex) || []), score]);
        hasAnyScore = true;
        latestScore = score;
        latestColumn = columnIndex;
      }
    });
    if (label) rowDetails.push({ label, group: currentSection, required: isRequiredTrainingRow(cells), hasAnyScore, latestScore, latestColumn });
  });
  const raAverages = [...columnScores.entries()]
    .sort(([columnA], [columnB]) => columnA - columnB)
    .map(([columnIndex, scores]) => ({ columnIndex, average: averageScore(scores), count: scores.length }))
    .filter((entry) => entry.count);
  const first = raAverages[0]?.average ?? null;
  const latest = raAverages[raAverages.length - 1]?.average ?? null;
  const latestColumn = raAverages[raAverages.length - 1]?.columnIndex ?? null;
  const change = first !== null && latest !== null ? Number((first - latest).toFixed(2)) : 0;
  const trend = raAverages.length < 2 ? "single" : change >= 0.25 ? "improving" : change <= -0.25 ? "slipping" : "steady";
  const latestStruggles = rowDetails
    .filter((row) => row.latestColumn === latestColumn && row.latestScore >= 2)
    .map((row) => ({ group: row.group, item: `${row.label} (${row.latestScore === 3 ? "red" : "orange"})` }));
  const unassessedItems = rowDetails
    .filter((row) => row.required && !row.hasAnyScore)
    .map((row) => ({ group: row.group, item: row.label }));
  return {
    average: latest,
    overallAverage: count ? Number((total / count).toFixed(2)) : null,
    count,
    raCount: raAverages.length,
    firstAverage: first,
    trend,
    latestStruggles: groupFocusItems(latestStruggles),
    unassessedItems: groupFocusItems(unassessedItems)
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

async function importPrivateGoogleSheet(options = {}) {
  const { id, gid } = sheetInfoFromUrl(els.googleUrl.value);
  const metadata = await sheetMetadata(id, options);
  const title = findSheetTitle(metadata.sheets || [], gid);
  const range = encodeURIComponent(`'${title.replace(/'/g, "''")}'`);
  const values = await fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${range}?majorDimension=ROWS`, options);
  const count = importRows(rowsFromValues(values.values || []));
  await applyMyRaFromCadetTabs(id, metadata.sheets || [], options);
  return count;
}

async function importPrivateRosterSheet(options = {}) {
  const { id, gid } = sheetInfoFromUrl(els.rosterUrl?.value || DEFAULT_ROSTER_URL);
  const title = await sheetTitleFromInfo(id, gid, options);
  const range = encodeURIComponent(`'${title.replace(/'/g, "''")}'`);
  const fields = encodeURIComponent("sheets(properties(sheetId,title),data(rowData(values(formattedValue,effectiveFormat(backgroundColor,backgroundColorStyle(rgbColor))))))");
  const spreadsheet = await fetchSheetJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?includeGridData=true&ranges=${range}&fields=${fields}`, options);
  const sheet = (spreadsheet.sheets || []).find((entry) => String(entry.properties?.sheetId) === String(gid)) || spreadsheet.sheets?.[0];
  return importRosterRows(rowsFromGridSheet(sheet || {}));
}

async function importGoogleSheet(options = {}) {
  const silent = Boolean(options.silent);
  const tokenOptions = { prompt: options.prompt ?? "" };
  let cadetCount = 0;
  let rosterCount = 0;
  const errors = [];
  try {
    cadetCount = await importPrivateGoogleSheet(tokenOptions);
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
    rosterCount = await importPrivateRosterSheet(tokenOptions);
  } catch (rosterError) {
    errors.push(`Roster sheet: ${rosterError.message}`);
  }
  if (silent) return { cadetCount, rosterCount, errors };
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
    const text = `${cadet.name} ${cadet.callsign} ${cadet.discordId} ${cadet.rank} ${cadet.timezone} ${cadet.status} ${cadet.needsWork} ${cadet.notes}`.toLowerCase();
    if (query && !text.includes(query)) return false;
    if (filter === "needs-ra" && !needsRa(cadet)) return false;
    if (filter === "limit-risk" && !limitRisk(cadet)) return false;
    if (filter === "needs-training" && (cadet.day1 && cadet.day2)) return false;
    if (filter === "active" && !String(cadet.status).toLowerCase().includes("active")) return false;
    return true;
  });
}

function needsRa(cadet) {
  return String(cadet.status).toLowerCase().includes("active") && !hasVerifiedRa(cadet);
}

function hasVerifiedRa(cadet) {
  return cadet.myRaVerified && cadet.myRaVerificationVersion === RA_VERIFICATION_VERSION && cadet.myRaCompleted;
}

function raStatusPill(cadet) {
  return hasVerifiedRa(cadet) ? pill("My RA done", "good") : pill("Needs my RA", "bad");
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
  if (average < 1.5) return "good";
  if (average < 2.5) return "warn";
  return "bad";
}

function trainingPill(cadet) {
  const average = Number(cadet.trainingAverage);
  if (!average || Number.isNaN(average)) return pill("No avg", "zone");
  const level = trainingLevel(cadet);
  const trend = cadet.trainingTrend || "none";
  const base = level === "good" ? "Good" : level === "warn" ? "Needs time" : "Struggling";
  const label = trend === "improving" ? "Improving" : trend === "slipping" ? "Needs attention" : base;
  const raText = cadet.trainingRaCount > 1 ? ` latest ${average.toFixed(2)}` : ` avg ${average.toFixed(2)}`;
  return pill(`${label}${raText}`, level);
}

function raOfferCount(cadet) {
  return Array.isArray(cadet.raOffers) ? cadet.raOffers.length : 0;
}

function raOfferButton(cadet) {
  return `<button class="ra-offer-button" data-ra-offered="${cadet.id}" type="button">RA Offered</button>`;
}

function cadetCard(cadet, options = {}) {
  const dayPills = [
    cadet.day1 ? options.onlyMissingTraining ? "" : pill("Day 1", "good") : pill("No Day 1", "warn"),
    cadet.day2 ? options.onlyMissingTraining ? "" : pill("Day 2", "good") : pill("No Day 2", "warn")
  ].join("");
  const raPill = options.hideRaPill ? "" : raStatusPill(cadet);
  return `
    <article class="card training-${trainingLevel(cadet)}" data-view-sheet-notes="${cadet.id}" tabindex="0" role="button" aria-label="View sheet notes for ${escapeHtml(cadet.name || "cadet")}">
      ${raOfferButton(cadet)}
      <div class="card-head">
        <div>
          <h3>${escapeHtml(cadet.name || "Unnamed cadet")}</h3>
          <p class="muted">${escapeHtml([cadet.callsign || "No callsign", cadet.employeeNumber ? `#${cadet.employeeNumber}` : "", cadet.rank].filter(Boolean).join(" - "))}</p>
          ${cadet.discordId ? `<p class="muted discord-line">${escapeHtml(cadet.discordId)}</p>` : ""}
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
    <article class="card training-${trainingLevel(cadet)}" data-view-sheet-notes="${cadet.id}" tabindex="0" role="button" aria-label="View sheet notes for ${escapeHtml(cadet.name || "cadet")}">
      ${raOfferButton(cadet)}
      <div class="card-head">
        <div>
          <h3>${escapeHtml(cadet.name || "Unnamed cadet")}</h3>
          <p class="muted">${escapeHtml([cadet.callsign || "No callsign", cadet.employeeNumber ? `#${cadet.employeeNumber}` : "", cadet.rank].filter(Boolean).join(" - "))}</p>
          ${cadet.discordId ? `<p class="muted discord-line">${escapeHtml(cadet.discordId)}</p>` : ""}
        </div>
        <div class="status-pills">
          ${cadet.timezone ? pill(cadet.timezone, "zone") : ""}
        </div>
      </div>
      <div class="pill-row">
        ${options.showRaPill ? raStatusPill(cadet) : ""}
        ${missingTraining}
        ${limitPill("14 day", cadet.day14Due, 3)}
        ${limitPill("28 day", cadet.day28Due, 7)}
      </div>
    </article>
  `;
}

function renderStats() {
  const cadets = state.cadets;
  const overviewCadets = cadets.filter((cadet) => cadet.day1);
  const needsRaCount = overviewCadets.filter(needsRa).length;
  const limitCount = overviewCadets.filter(limitRisk).length;
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
  const cadets = filteredCadets().filter((cadet) => cadet.day1);
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
  if (els.googleEmail) els.googleEmail.value = state.settings?.googleEmail || "";
  if (els.settingsSummary) {
    const email = state.settings?.googleEmail ? ` Google will prefer ${state.settings.googleEmail}.` : " Add your Gmail here so Google can choose the right account.";
    els.settingsSummary.textContent = `Current RA callsign check: ${state.settings?.myCallsign || DEFAULT_MY_CALLSIGN}.${email}`;
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
  const isCheatSheet = activeTab === "cheat-sheet";
  els.toolbar.classList.toggle("is-hidden", isCheatSheet);
  els.stats.classList.toggle("is-hidden", isCheatSheet);
}

function field(name, label, value = "", type = "text", extra = "") {
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra} /></label>`;
}

function checkbox(name, label, checked = false) {
  return `<label><span>${label}</span><input name="${name}" type="checkbox" ${checked ? "checked" : ""} /></label>`;
}

function openCadetForm(cadet = null) {
  const item = normalizeCadet(cadet || {});
  setDialogReadonly(false);
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
  setDialogReadonly(false);
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
  setDialogReadonly(false);
  els.dialogTitle.textContent = `Add Note - ${cadet.name || "Cadet"}`;
  els.dialogBody.innerHTML = `<label>Note<textarea name="note" required></textarea></label>`;
  els.dialog.dataset.mode = "note";
  els.dialog.dataset.id = cadet.id;
  els.dialog.showModal();
}

function setDialogReadonly(readonly) {
  if (els.dialogSave) els.dialogSave.classList.toggle("is-hidden", readonly);
}

function sheetList(items = [], emptyText = "Nothing listed yet.") {
  if (items.some((item) => item && typeof item === "object" && Array.isArray(item.items))) {
    const groups = items
      .map((group) => ({
        group: group.group || "Other",
        items: cleanFocusItems(group.items || [])
      }))
      .filter((group) => group.items.length);
    return groups.length
      ? `<div class="focus-groups">${groups.map((group) => `
        <div class="focus-group">
          <h4>${escapeHtml(group.group)}</h4>
          <ul>${group.items.map((item) => `<li class="${focusItemClass(item)}">${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      `).join("")}</div>`
      : `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }
  const cleanItems = cleanFocusItems(items);
  return cleanItems.length
    ? `<ul>${cleanItems.map((item) => `<li class="${focusItemClass(item)}">${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="muted">${escapeHtml(emptyText)}</p>`;
}

function cleanFocusItems(items = []) {
  const cleanItems = items.filter((item) => {
    const key = normalizeKey(item);
    return key && !["true", "false", "truered", "falseorange", "falsered"].includes(key);
  });
  return [...new Set(cleanItems)];
}

function focusItemClass(item = "") {
  const key = normalizeKey(item);
  if (key.includes("red")) return "focus-red";
  if (key.includes("orange")) return "focus-orange";
  return "";
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function raOfferHistory(cadet) {
  const offers = [...(cadet.raOffers || [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return offers.length ? `
    <div class="ra-offer-history">
      ${offers.map((offer) => `
        <div class="ra-offer-row">
          <span>${escapeHtml(formatDateTime(offer.createdAt))}</span>
          <button data-delete-ra-offer="${cadet.id}:${offer.id}" type="button">Delete</button>
        </div>
      `).join("")}
    </div>
  ` : `<p class="muted">No RA offers logged yet.</p>`;
}

function openCadetSheetNotes(cadet) {
  if (!cadet) return;
  setDialogReadonly(true);
  const notes = Array.isArray(cadet.sheetNotes) ? cadet.sheetNotes : [];
  const struggles = Array.isArray(cadet.latestStruggles) ? cadet.latestStruggles : [];
  const unassessed = Array.isArray(cadet.unassessedItems) ? cadet.unassessedItems : [];
  els.dialogTitle.textContent = `${cadet.name || "Cadet"} - RA Focus`;
  els.dialogBody.innerHTML = `
    <div class="cadet-focus">
      <div class="ra-offer-total">
        <span>RAs Offered</span>
        <strong>${raOfferCount(cadet)}</strong>
      </div>
      <section>
        <h3>Most Recent RA Struggles</h3>
        ${sheetList(struggles, "No red or orange items found on their most recent RA.")}
      </section>
      <section>
        <h3>Still Needs To Do</h3>
        ${sheetList(unassessed, "All required checked items have at least one assessment.")}
      </section>
      <section>
        <h3>Bottom Sheet Notes</h3>
        ${notes.length ? `<div class="sheet-note-list">${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</div>` : `<p class="muted">No personal sheet notes synced yet. Click Sync Sheet after signing in, or check that ${escapeHtml(cadet.callsign || "this cadet")} has notes at the bottom of their sheet.</p>`}
      </section>
      <section>
        <h3>RA Offered Notes</h3>
        ${raOfferHistory(cadet)}
      </section>
    </div>
  `;
  els.dialog.dataset.mode = "sheet-notes";
  els.dialog.dataset.id = cadet.id;
  if (!els.dialog.open) els.dialog.showModal();
}

function saveDialog() {
  const data = Object.fromEntries(new FormData(els.dialogForm).entries());
  const id = els.dialog.dataset.id;
  if (els.dialog.dataset.mode === "cadet") {
    const existingCadet = state.cadets.find((entry) => entry.id === id);
    const cadet = normalizeCadet({
      ...data,
      id: id || crypto.randomUUID(),
      raCompleted: Boolean(data.raCompleted),
      day1: Boolean(data.day1),
      day2: Boolean(data.day2),
      raOffers: existingCadet?.raOffers || []
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
  state.settings = normalizeSettings({
    myCallsign: els.myCallsign?.value || DEFAULT_MY_CALLSIGN,
    googleEmail: els.googleEmail?.value || ""
  });
  googleAccessToken = "";
  googleTokenClient = null;
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
      try {
        await ensureGoogleAccessToken({ prompt: "" });
      } catch {
        await ensureGoogleAccessToken({ prompt: "consent" });
      }
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

  const raOffered = event.target.closest("[data-ra-offered]");
  if (raOffered) {
    const cadet = state.cadets.find((entry) => entry.id === raOffered.dataset.raOffered);
    if (cadet) {
      cadet.raOffers = [...(cadet.raOffers || []), normalizeRaOffer({ createdAt: new Date().toISOString() })];
      saveState();
      render();
    }
  }

  const deleteRaOffer = event.target.closest("[data-delete-ra-offer]");
  if (deleteRaOffer) {
    const [cadetId, offerId] = deleteRaOffer.dataset.deleteRaOffer.split(":");
    const cadet = state.cadets.find((entry) => entry.id === cadetId);
    if (cadet) {
      cadet.raOffers = (cadet.raOffers || []).filter((offer) => offer.id !== offerId);
      saveState();
      render();
      openCadetSheetNotes(cadet);
    }
  }

  const editCadet = event.target.closest("[data-edit-cadet]");
  if (editCadet) openCadetForm(state.cadets.find((cadet) => cadet.id === editCadet.dataset.editCadet));

  const editMember = event.target.closest("[data-edit-member]");
  if (editMember) openMemberForm(state.members.find((member) => member.id === editMember.dataset.editMember));

  const noteCadet = event.target.closest("[data-note-cadet]");
  if (noteCadet) openNoteForm(state.cadets.find((cadet) => cadet.id === noteCadet.dataset.noteCadet));

  const sheetNotesCard = event.target.closest("[data-view-sheet-notes]");
  const clickedControl = event.target.closest("button, a, input, select, textarea, label");
  if (sheetNotesCard && !clickedControl) {
    openCadetSheetNotes(state.cadets.find((cadet) => cadet.id === sheetNotesCard.dataset.viewSheetNotes));
  }

  const raDone = event.target.closest("[data-ra-done]");
  if (raDone) {
    const cadet = state.cadets.find((entry) => entry.id === raDone.dataset.raDone);
    if (cadet) {
      cadet.myRaCompleted = true;
      cadet.myRaVerified = false;
      cadet.myRaVerificationVersion = "";
      cadet.raCompleted = true;
      cadet.lastRaDate = new Date().toISOString().slice(0, 10);
      saveState();
      render();
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const sheetNotesCard = event.target.closest("[data-view-sheet-notes]");
  if (!sheetNotesCard) return;
  event.preventDefault();
  openCadetSheetNotes(state.cadets.find((cadet) => cadet.id === sheetNotesCard.dataset.viewSheetNotes));
});

async function autoSyncGoogleSheets() {
  try {
    await importGoogleSheet({ silent: true, prompt: "" });
  } catch {
    // Auto-sync is best-effort. Manual Google Sign In / Sync Sheet will show useful errors.
  }
}

els.search.addEventListener("input", render);
els.statusFilter.addEventListener("change", render);

els.dialogForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "save") saveDialog();
});

render();
setActiveTab(activeTab);
autoSyncGoogleSheets();
