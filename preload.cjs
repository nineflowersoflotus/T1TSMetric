const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("diskApp", {
  qa: process.argv.includes("--t1tsmetric-qa"),
  info: () => ipcRenderer.invoke("info"),
  choose: () => ipcRenderer.invoke("choose"),
  scan: (root, duplicates) => ipcRenderer.invoke("scan", root, duplicates),
  cancel: () => ipcRenderer.invoke("cancel"),
  list: (filter, offset) => ipcRenderer.invoke("list", filter, offset),
  language: (language) => ipcRenderer.invoke("language", language),
  trash: (ids) => ipcRenderer.invoke("trash", ids),
  reveal: (id) => ipcRenderer.invoke("reveal", id),
  recycle: () => ipcRenderer.invoke("recycle"),
  model: () => ipcRenderer.invoke("model"),
  credit: () => ipcRenderer.invoke("credit"),
  progress: (callback) => {
    ipcRenderer.on("progress", (_, p) => callback(p));
  },
  command: (callback) => {
    ipcRenderer.on("command", (_, command) => callback(command));
  },
  visibility: (callback) => {
    ipcRenderer.on("active", (_, active) => callback(active));
  }
});
