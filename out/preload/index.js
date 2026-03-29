"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // IPC bridge placeholder for Phase 1
  invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args)
});
