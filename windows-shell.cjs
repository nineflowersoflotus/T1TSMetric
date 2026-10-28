const path = require("node:path");
const { spawn } = require("node:child_process");
const CREDIT_URL = "https://github.com/nineflowersoflotus";
const RECYCLE_URI = "shell:RecycleBinFolder";
const RECYCLE_CLSID = "::{645FF040-5081-101B-9F08-00AA002F954E}";
async function openRecycleBin(shell, launch = spawn, windowsRoot = process.env.SystemRoot || "C:\\Windows") {
  try {
    await shell.openExternal(RECYCLE_URI);
    return { method: "shell-execute" };
  } catch (primary) {
    return new Promise((resolve, reject) => {
      const child = launch(path.join(windowsRoot, "explorer.exe"), [RECYCLE_CLSID], { detached: true, stdio: "ignore", windowsHide: false });
      child.once("error", (error) => reject(new Error(`Recycle Bin: ${error.message}. Shell: ${primary.message}`)));
      child.once("spawn", () => {
        child.unref();
        resolve({ method: "explorer-clsid" });
      });
    });
  }
}
module.exports = { openRecycleBin, CREDIT_URL, RECYCLE_URI, RECYCLE_CLSID };
