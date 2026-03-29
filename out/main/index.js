"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const Database = require("better-sqlite3");
let db = null;
function initDatabase() {
  const dbPath = path.join(electron.app.getPath("userData"), "mc80emu.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
}
function runMigrations(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS virtual_fs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id     INTEGER REFERENCES virtual_fs(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL CHECK(type IN ('folder','file')),
      file_type     TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      modified_at   TEXT DEFAULT (datetime('now')),
      UNIQUE(parent_id, name)
    );

    CREATE TABLE IF NOT EXISTS songs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fs_id         INTEGER REFERENCES virtual_fs(id) ON DELETE CASCADE,
      name          TEXT NOT NULL DEFAULT 'NewSong',
      copyright     TEXT DEFAULT '',
      tempo         REAL NOT NULL DEFAULT 120.0,
      time_sig_num  INTEGER NOT NULL DEFAULT 4,
      time_sig_den  INTEGER NOT NULL DEFAULT 4,
      tpqn          INTEGER NOT NULL DEFAULT 480,
      total_measures INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      modified_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id       INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      track_number  INTEGER NOT NULL,
      name          TEXT DEFAULT '',
      midi_channel  INTEGER NOT NULL DEFAULT 1,
      midi_port     INTEGER NOT NULL DEFAULT 0,
      mute          INTEGER NOT NULL DEFAULT 0,
      solo          INTEGER NOT NULL DEFAULT 0,
      has_data      INTEGER NOT NULL DEFAULT 0,
      UNIQUE(song_id, track_number)
    );

    CREATE TABLE IF NOT EXISTS events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id      INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      tick          INTEGER NOT NULL,
      event_type    TEXT NOT NULL,
      channel       INTEGER,
      data1         INTEGER,
      data2         INTEGER,
      duration      INTEGER,
      raw_data      BLOB
    );
    CREATE INDEX IF NOT EXISTS idx_events_track_tick ON events(track_id, tick);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(track_id, event_type);

    CREATE TABLE IF NOT EXISTS patterns (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id       INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      pattern_number INTEGER NOT NULL,
      name          TEXT DEFAULT '',
      length_measures INTEGER NOT NULL DEFAULT 4,
      time_sig_num  INTEGER NOT NULL DEFAULT 4,
      time_sig_den  INTEGER NOT NULL DEFAULT 4,
      UNIQUE(song_id, pattern_number)
    );

    CREATE TABLE IF NOT EXISTS pattern_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_id    INTEGER NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
      track_number  INTEGER NOT NULL DEFAULT 1,
      tick          INTEGER NOT NULL,
      event_type    TEXT NOT NULL,
      channel       INTEGER,
      data1         INTEGER,
      data2         INTEGER,
      duration      INTEGER,
      raw_data      BLOB
    );
    CREATE INDEX IF NOT EXISTS idx_pattern_events ON pattern_events(pattern_id, tick);

    CREATE TABLE IF NOT EXISTS chains (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fs_id         INTEGER REFERENCES virtual_fs(id) ON DELETE CASCADE,
      name          TEXT NOT NULL DEFAULT 'NewChain'
    );

    CREATE TABLE IF NOT EXISTS chain_entries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id      INTEGER NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
      position      INTEGER NOT NULL,
      song_fs_id    INTEGER REFERENCES virtual_fs(id),
      song_name     TEXT NOT NULL,
      UNIQUE(chain_id, position)
    );

    CREATE TABLE IF NOT EXISTS markers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id       INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      marker_number INTEGER NOT NULL,
      tick          INTEGER NOT NULL,
      UNIQUE(song_id, marker_number)
    );

    CREATE TABLE IF NOT EXISTS groove_templates (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fs_id         INTEGER REFERENCES virtual_fs(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      template_type TEXT NOT NULL CHECK(template_type IN ('preset','user')),
      data          BLOB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configurations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fs_id         INTEGER REFERENCES virtual_fs(id) ON DELETE CASCADE,
      name          TEXT NOT NULL DEFAULT 'Config',
      settings_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS undo_stack (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id       INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      operation     TEXT NOT NULL,
      undo_data     BLOB NOT NULL,
      redo_data     BLOB,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 700,
    minWidth: 1200,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#2D2D2D",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.mc80emu");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  try {
    initDatabase();
  } catch (e) {
    console.error("Database init failed (will retry later):", e);
  }
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
