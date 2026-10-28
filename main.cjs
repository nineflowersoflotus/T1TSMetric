const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const { Worker } = require("node:worker_threads");
const { openRecycleBin, CREDIT_URL } = require("./windows-shell.cjs");
const { validateFile } = require("./scanner.cjs");
const { filePage } = require("./file-page.cjs");
let language = "en";
const L = (en, pt) => language === "pt" ? pt : en;
let win, worker, lastScan = null, busy = false;
app.setName("T1TSMetric");
const smokeOutput = process.env.T1TS_QA_DIR || __dirname;
if (process.env.DISK_SMOKE === "1") app.setPath("userData", path.join(smokeOutput, ".smoke-data"));
const protectedRoots = () => [process.env.SystemRoot, process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.ProgramData, app.getAppPath()];
let driveRoots = null, driveDiscovery = 0;
async function drives() {
  const discover = !driveRoots || Date.now() - driveDiscovery > 6e4;
  const roots = discover ? [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letter) => letter + ":\\") : driveRoots;
  const found = (await Promise.all(roots.map(async (root) => {
    try {
      const s = await fs.statfs(root);
      return s.blocks > 0 ? { root, total: s.blocks * s.bsize, free: s.bfree * s.bsize } : null;
    } catch {
      return null;
    }
  }))).filter(Boolean);
  if (discover) {
    driveRoots = found.map((d) => d.root);
    driveDiscovery = Date.now();
  }
  return found;
}
function createMenu() {
  const send = (command) => win?.webContents.send("command", command);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: L("File", "Arquivo"), submenu: [{ label: L("Choose folder...", "Escolher pasta..."), accelerator: "Ctrl+O", click: () => send("choose") }, { label: L("Temporary files", "Tempor\xE1rios"), click: () => send("temp") }, { type: "separator" }, { label: L("Analyze", "Analisar"), accelerator: "F5", click: () => send("scan") }, { label: L("Stop", "Parar"), accelerator: "F6", click: () => send("cancel") }, { type: "separator" }, { label: L("Recycle Bin", "Lixeira"), click: () => send("recycle") }, { type: "separator" }, { label: L("Exit", "Sair"), role: "quit" }] },
    { label: L("Options", "Op\xE7\xF5es"), submenu: [{ label: L("Options...", "Op\xE7\xF5es..."), accelerator: "Ctrl+,", click: () => send("options") }, { label: L("Import VRM...", "Importar VRM..."), click: () => send("import") }, { label: L("Reset camera", "Restaurar c\xE2mera"), click: () => send("reset") }] },
    { label: L("Help", "Ajuda"), submenu: [{ label: L("About T1TSMetric", "Sobre T1TSMetric"), click: () => send("about") }] }
  ]));
}
app.whenReady().then(() => {
  createMenu();
  const smoke = process.env.DISK_SMOKE === "1";
  win = new BrowserWindow({ show: !smoke, width: 1200, height: 820, minWidth: 940, minHeight: 600, backgroundColor: "#f7e3e7", title: "T1TSMetric", webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: !smoke, additionalArguments: smoke ? ["--t1tsmetric-qa"] : [], ...smoke ? { offscreen: true } : {} } });
  win.on("minimize", () => win.webContents.send("active", false));
  win.on("restore", () => win.webContents.send("active", true));
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.loadFile("ui/index.html");
  if (process.env.DISK_SMOKE === "1") require("./qa.cjs").run({ win, app, out: smokeOutput });
});
app.on("window-all-closed", () => {
  worker?.terminate();
  app.quit();
});
ipcMain.handle("info", async () => ({ drives: await drives(), downloads: app.getPath("downloads"), temp: os.tmpdir() }));
ipcMain.handle("language", (_e, value) => {
  language = value === "pt" ? "pt" : "en";
  createMenu();
});
ipcMain.handle("list", (_e, filter, offset) => filePage(lastScan?.files || [], filter, offset));
ipcMain.handle("choose", async () => {
  const r = await dialog.showOpenDialog(win, { title: L("Choose a folder to analyze", "Escolha a pasta para analisar"), properties: ["openDirectory"] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle("scan", async (_e, root, duplicates) => {
  if (busy) throw Error("Aguarde a opera\xE7\xE3o atual.");
  if (typeof root !== "string") throw Error("Pasta inv\xE1lida.");
  worker?.terminate();
  lastScan = null;
  return new Promise((resolve, reject) => {
    let settled = false;
    const w = new Worker(path.join(__dirname, "scan-worker.cjs"), { workerData: { root, options: { protectedRoots: protectedRoots(), tempRoot: os.tmpdir(), duplicates: !!duplicates } } });
    worker = w;
    w.on("message", (m) => {
      if (m.type === "progress") win?.webContents.send("progress", m.data);
      if (m.type === "done") {
        lastScan = m.data;
        settled = true;
        const { files, ...summary } = m.data;
        resolve({ ...summary, count: files.length });
        w.terminate();
        if (worker === w) worker = null;
      }
      if (m.type === "error") {
        settled = true;
        reject(Error(m.message));
        w.terminate();
        if (worker === w) worker = null;
      }
    });
    w.on("error", reject);
    w.on("exit", () => {
      if (!settled) reject(Error("An\xE1lise cancelada."));
    });
  });
});
ipcMain.handle("cancel", () => {
  worker?.terminate();
  worker = null;
});
ipcMain.handle("reveal", (_e, id) => {
  const f = lastScan?.files.find((f2) => f2.id === id);
  if (f) shell.showItemInFolder(f.path);
});
ipcMain.handle("recycle", () => openRecycleBin(shell));
ipcMain.handle("credit", () => shell.openExternal(CREDIT_URL));
ipcMain.handle("model", async () => {
  const r = await dialog.showOpenDialog(win, { title: L("Import adult VRM character", "Importar personagem VRM adulta"), filters: [{ name: "VRM", extensions: ["vrm"] }], properties: ["openFile"] });
  if (r.canceled) return null;
  const s = await fs.stat(r.filePaths[0]);
  if (s.size > 100 * 1024 * 1024) throw Error("Limite de 100 MB por modelo.");
  return new Uint8Array(await fs.readFile(r.filePaths[0]));
});
ipcMain.handle("trash", async (_e, ids) => {
  if (busy || worker || !lastScan) throw Error("Finalize a an\xE1lise primeiro.");
  if (!Array.isArray(ids) || !ids.length || ids.length > 1e3) throw Error("Selecione entre 1 e 1000 arquivos.");
  const files = [...new Set(ids)].map((id) => lastScan.files.find((f) => f.id === id));
  if (files.some((f) => !f)) throw Error("Sele\xE7\xE3o inv\xE1lida.");
  busy = true;
  try {
    const total = files.reduce((n, f) => n + f.size, 0);
    const confirm = await dialog.showMessageBox(win, { type: "warning", title: L("Review cleanup", "Revisar limpeza"), message: L(`Move ${files.length} file(s) to Recycle Bin?`, `Enviar ${files.length} arquivo(s) para a Lixeira?`), detail: `${(total / 1024 ** 2).toFixed(1)} MB. ${L("Space is freed only after emptying the Windows Recycle Bin.", "O espa\xE7o s\xF3 ser\xE1 liberado ao esvaziar a Lixeira pelo Windows.")}

${files.slice(0, 15).map((f) => f.path).join("\n")}${files.length > 15 ? L("\n\u2026 and other selected files.", "\n\u2026 e outros arquivos selecionados.") : ""}`, buttons: [L("Cancel", "Cancelar"), L("Move to Recycle Bin", "Enviar para a Lixeira")], defaultId: 0, cancelId: 0, noLink: true });
    if (confirm.response !== 1) return { canceled: true };
    const removed = [], errors = [];
    for (const file of files) try {
      await validateFile(file, lastScan.root, protectedRoots());
      await shell.trashItem(file.path);
      removed.push(file.id);
    } catch (e) {
      errors.push({ name: file.name, message: e.message });
    }
    lastScan.files = lastScan.files.filter((f) => !removed.includes(f.id));
    return { removed, errors, count: lastScan.files.length, bytes: lastScan.files.reduce((n, f) => n + f.size, 0) };
  } finally {
    busy = false;
  }
});
