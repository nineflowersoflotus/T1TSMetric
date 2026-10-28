import { t, locale, errorText } from "./i18n.js";
import { initOptions } from "./options.js";
import { initViewer } from "./viewer.js";
const $ = (id) => document.getElementById(id), api = window.diskApp;
window.__diagnostics = { modelLoaded: false, errors: [] };
addEventListener("error", (e) => window.__diagnostics.errors.push(e.message));
addEventListener("unhandledrejection", (e) => window.__diagnostics.errors.push(String(e.reason)));
const fmt = (n) => {
  if (n < 1024) return n + " B";
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), 4);
  return (n / 1024 ** i).toLocaleString(locale(), { maximumFractionDigits: 1 }) + " " + ["B", "KB", "MB", "GB", "TB"][i];
};
let files = [], selected = /* @__PURE__ */ new Map(), offset = 0, filteredCount = 0, drives = [], usage = 0, scanning = false, refreshing = false, summary = null, listRequest = 0;
function status(message) {
  $("status").textContent = message;
}
function summaryText() {
  if (!summary) {
    $("summary").textContent = t("noScan");
    return;
  }
  const d = summary;
  $("summary").textContent = fmt(d.bytes) + " " + t("in") + " " + d.count.toLocaleString(locale()) + " " + t("files") + " \xB7 " + d.skipped + " " + t("ignored") + (d.partial ? " \xB7 " + t("partial") : "") + (d.hashSkipped ? " \xB7 " + d.hashSkipped + " " + t("hashSkipped") : "");
}
async function refresh(initial = false) {
  if (refreshing) return;
  refreshing = true;
  try {
    const info = await api.info();
    drives = info.drives;
    const previous = $("drive").value;
    $("drive").replaceChildren(...drives.map((d) => {
      const o = document.createElement("option");
      o.value = d.root;
      o.textContent = d.root;
      return o;
    }));
    if (drives.some((d) => d.root === previous)) $("drive").value = previous;
    if (initial) $("folder").value = info.downloads;
    updateDisk();
    window.__diagnostics.drives = drives;
  } catch (e) {
    status(errorText(e));
  } finally {
    refreshing = false;
  }
}
function updateDisk() {
  const d = drives.find((d2) => d2.root === $("drive").value);
  if (!d) return;
  usage = 1 - d.free / d.total;
  $("used").textContent = fmt(d.total - d.free);
  $("capacity").textContent = fmt(d.total);
  $("free").textContent = fmt(d.free);
  $("percent").textContent = Math.round(usage * 100) + "%";
  $("fill").style.width = usage * 100 + "%";
  document.querySelector(".track").setAttribute("aria-valuenow", Math.round(usage * 100));
}
$("drive").onchange = updateDisk;
$("choose").onclick = async () => {
  try {
    const p = await api.choose();
    if (p) $("folder").value = p;
  } catch (e) {
    status(errorText(e));
  }
};
$("temp").onclick = async () => {
  $("folder").value = (await api.info()).temp;
};
$("scan").onclick = async () => {
  if (scanning) return;
  scanning = true;
  selected.clear();
  files = [];
  offset = 0;
  filteredCount = 0;
  render();
  $("count").textContent = "0";
  $("scan").disabled = true;
  $("choose").disabled = true;
  $("temp").disabled = true;
  $("cancel").disabled = false;
  try {
    summary = await api.scan($("folder").value, $("duplicates").checked);
    $("count").textContent = summary.count.toLocaleString(locale());
    summaryText();
    status(t(summary.partial ? "partial" : "done"));
    await loadPage();
    window.__diagnostics.lastScan = { count: summary.count, bytes: summary.bytes };
  } catch (e) {
    status(errorText(e));
    summary = null;
    summaryText();
  } finally {
    scanning = false;
    $("scan").disabled = false;
    $("choose").disabled = false;
    $("temp").disabled = false;
    $("cancel").disabled = true;
    render();
  }
};
$("cancel").onclick = () => api.cancel();
api.progress((p) => status(t(p.phase === "Lendo arquivos" ? "reading" : "hashing") + " \xB7 " + p.count.toLocaleString(locale()) + " " + t("files") + " \xB7 " + fmt(p.bytes)));
function selection() {
  let bytes = 0;
  for (const value of selected.values()) bytes += value;
  $("selected").textContent = selected.size + " " + t("selected") + " \xB7 " + fmt(bytes);
  $("trash").disabled = !selected.size || scanning;
}
async function loadPage() {
  const request = ++listRequest;
  try {
    const data = await api.list($("filter").value, offset);
    if (request !== listRequest) return;
    files = data.rows;
    filteredCount = data.count;
    render();
    window.__diagnostics.rendererFileCount = files.length;
  } catch (e) {
    status(errorText(e));
  }
}
function render() {
  const fragment = document.createDocumentFragment();
  for (const file of files) {
    const row = document.createElement("div");
    row.className = "file";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = selected.has(file.id);
    check.setAttribute("aria-label", t("select") + " " + file.name);
    check.onchange = () => {
      check.checked ? selected.set(file.id, file.size) : selected.delete(file.id);
      selection();
    };
    const text = document.createElement("div");
    text.className = "filetext";
    const name = document.createElement("strong");
    name.textContent = file.name;
    const detail = document.createElement("small");
    detail.textContent = file.path;
    detail.title = file.path;
    text.append(name, detail);
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = file.kind === "duplicate" ? t("copy") + " " + file.group : file.kind === "original" ? t("reference") + " " + file.group : file.kind === "temp" ? t("tempTag") : "";
    if (tag.textContent) text.append(tag);
    const size = document.createElement("span");
    size.className = "size";
    size.textContent = fmt(file.size);
    const reveal = document.createElement("button");
    reveal.textContent = "\u2197";
    reveal.title = t("reveal");
    reveal.onclick = () => api.reveal(file.id);
    row.append(check, text, size, reveal);
    fragment.append(row);
  }
  if (!files.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t(summary ? "noMatch" : "empty");
    fragment.append(empty);
  }
  $("files").replaceChildren(fragment);
  $("pageInfo").textContent = filteredCount ? offset + 1 + "\u2013" + Math.min(offset + 120, filteredCount) + " / " + filteredCount.toLocaleString(locale()) : "0 / 0";
  $("previous").disabled = offset === 0 || scanning;
  $("next").disabled = offset + 120 >= filteredCount || scanning;
  selection();
}
$("filter").onchange = () => {
  offset = 0;
  loadPage();
};
$("next").onclick = () => {
  offset += 120;
  loadPage();
};
$("previous").onclick = () => {
  offset = Math.max(0, offset - 120);
  loadPage();
};
$("trash").onclick = async () => {
  $("trash").disabled = true;
  try {
    const r = await api.trash([...selected.keys()]);
    if (!r.canceled) {
      for (const id of r.removed) selected.delete(id);
      if (summary) {
        summary.count = r.count;
        summary.bytes = r.bytes;
        $("count").textContent = r.count.toLocaleString(locale());
      }
      offset = 0;
      await loadPage();
      status(r.removed.length + " " + t("sent") + (r.errors.length ? " " + r.errors.length + " " + t("failed") + ": " + errorText(r.errors[0].message) : ""));
      $("summary").textContent = t("updated");
      await refresh();
    }
  } catch (e) {
    status(errorText(e));
  } finally {
    selection();
  }
};
$("recycle").onclick = async () => {
  try {
    const result = await api.recycle();
    window.__diagnostics.recycle = result;
  } catch (e) {
    status(errorText(e));
    window.__diagnostics.recycleError = errorText(e);
  }
};
$("credit").onclick = async (e) => {
  e.preventDefault();
  try {
    await api.credit();
  } catch (error) {
    status(errorText(error));
  }
};
addEventListener("preferenceschange", (event) => {
  if (!event.detail?.languageChanged) return;
  updateDisk();
  summaryText();
  $("count").textContent = summary ? summary.count.toLocaleString(locale()) : "0";
  render();
  if (!scanning) status(t("ready"));
});
initOptions();
const viewer = initViewer({ usage: () => usage, status });
api.command((command) => {
  const ids = { options: "options", about: "about", choose: "choose", temp: "temp", scan: "scan", cancel: "cancel", import: "import", recycle: "recycle", reset: "resetCamera" };
  const target = $(ids[command]);
  if (target && !target.disabled) target.click();
});
refresh(true);
setInterval(() => {
  if (!document.hidden && !viewer.suspended()) refresh();
}, 1e4);
