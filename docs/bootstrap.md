# MC-80 MicroComposer Software Emulator — Bootstrap Prompt

## Project Identity

**Application Name:** MC-80 Virtual MicroComposer
**Codename:** `mc80-emu`
**Description:** A faithful software emulation of the Roland MC-80 MicroComposer standalone MIDI sequencer, built as a desktop application using Electron.js and React. This project replicates the sequencer-only functionality of the MC-80 (excluding all VE-GS Pro voice expansion board / MC-80EX synthesizer features). The emulator reproduces every physical button, knob, and display element from the hardware front panel, preserving the original workflow, screen hierarchy, and operational behavior.

**Scope Exclusions (MC-80EX / VE-GS Pro):**
- No internal sound generation or SC-88 Pro emulation
- No VE-GS Pro Voice Expansion Board UI screens
- No EXPANSION OUTPUT LEVEL knob functionality
- No Part editing, tone editing, or insertion effects screens from Chapter 11 of the manual
- No "Internal Sound Generator" MIDI OUT routing option

---

## Technology Stack

### Runtime & Framework

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Desktop Shell | Electron.js | Latest stable | Cross-platform desktop app with native MIDI access via `navigator.requestMIDIAccess()` in the renderer process. Matches the xStudioTools architecture pattern. |
| UI Framework | React 18+ | Latest stable | Component-based architecture maps naturally to the MC-80's modular panel layout — each button, knob, and display region becomes a discrete, testable component. |
| Build Tool | Vite | Latest stable | Fast HMR for iterative UI development; excellent Electron integration via `electron-vite`. |
| Language | TypeScript | 5.x | Type safety is critical for modeling the MC-80's complex state machine (sequencer modes, screen hierarchy, MIDI data structures, 480 TPQN timing). |

### UI Component Toolkit: Radix UI Primitives + Tailwind CSS

<!-- RATIONALE:
  Why Radix UI + Tailwind over alternatives like MUI, Ant Design, or Chakra UI:

  1. UNSTYLED PRIMITIVES: The MC-80 emulator needs a custom visual identity that
     faithfully reproduces a hardware device — not a software application. Pre-styled
     component libraries (MUI, Ant Design) impose opinionated Material/Ant aesthetics
     that would fight against the dark-panel, LED-lit, hardware-button look we need.
     Radix provides accessible, behavior-correct primitives (dialogs, toggles, menus,
     tooltips) with ZERO default styling, giving us full control over the visual layer.

  2. TAILWIND FOR HARDWARE AESTHETICS: Tailwind's utility-first approach lets us
     rapidly prototype the exact colors, shadows, gradients, and sizing that replicate
     the MC-80's physical appearance — dark gray panels, backlit LCD green/amber,
     raised button bezels, LED indicators with glow effects — without wrestling against
     a component library's theme system.

  3. ACCESSIBILITY WITHOUT COST: Radix handles keyboard navigation, focus management,
     ARIA attributes, and screen reader support automatically. This matters because the
     MC-80's F1-F6 soft keys, mode buttons, and transport controls must be keyboard-
     navigable for power users who will want hotkey access.

  4. SMALL BUNDLE: Radix primitives are tree-shakeable and individually importable.
     We only pull in what we use (Toggle, Dialog, Tooltip, DropdownMenu, ScrollArea,
     Slider) rather than shipping an entire component library.

  5. COMPOSITION MODEL: Radix's compound component pattern (Root > Trigger > Content)
     maps well to the MC-80's hierarchical UI: a Track Button is a Toggle with an LED
     indicator child; the LCD Display is a ScrollArea with contextual soft-key labels;
     the VALUE dial is a custom Slider with acceleration logic.

  Alternatives considered and rejected:
  - MUI/Material UI: Heavy, opinionated Material Design styling. Would require
    extensive theme overrides to achieve hardware aesthetic. 800KB+ bundle.
  - Ant Design: Enterprise-focused, even more opinionated. CJK-first documentation.
  - Chakra UI: Closer to unstyled but still carries styling opinions. Less mature
    accessibility primitives than Radix.
  - Headless UI (Tailwind Labs): Good alternative but fewer primitives than Radix.
    No Slider, no Toggle, no ScrollArea.
  - shadcn/ui: Built on Radix + Tailwind — we could adopt individual components
    from shadcn/ui as accelerators where they fit, but our base should be raw Radix
    primitives since most shadcn components assume a software-application aesthetic.
-->

| Package | Purpose |
|---|---|
| `@radix-ui/react-toggle` | Track buttons (1-16), mode buttons with LED states |
| `@radix-ui/react-dialog` | Confirmation dialogs (Save, Delete, Format Disk, etc.) |
| `@radix-ui/react-tooltip` | Button labels, parameter descriptions, Help function overlay |
| `@radix-ui/react-dropdown-menu` | Context menus for file operations |
| `@radix-ui/react-scroll-area` | LCD display scrolling content, file browser lists |
| `@radix-ui/react-slider` | VALUE dial emulation (mapped to mouse drag / scroll wheel) |
| `@radix-ui/react-toggle-group` | Mutually-exclusive mode selection (SEQUENCER/PATTERN/DISK/UTILITY) |
| `tailwindcss` | Utility-first styling for hardware-faithful visual design |

### Data Layer

| Layer | Technology | Rationale |
|---|---|---|
| Database | `better-sqlite3` | Synchronous SQLite access from the Electron main process. Emulates the MC-80's internal storage (hard drive / Zip drive / floppy). WAL mode for concurrent read performance. |
| IPC Bridge | Electron IPC (contextBridge) | Renderer ↔ Main process communication for all database operations and MIDI I/O. |
| State Management | Zustand | Lightweight, TypeScript-native store. The MC-80's state is a deep tree (current screen, cursor position, track states, playback position, tempo, recording mode, etc.) — Zustand's slice pattern handles this cleanly without Redux boilerplate. |
| MIDI Engine | Web MIDI API + custom scheduler | High-resolution MIDI output scheduling at 480 TPQN using `performance.now()` and a lookahead buffer pattern. |

### Storage Architecture (SQLite as Virtual Hard Drive)

<!-- RATIONALE:
  The MC-80 stores data on floppy disks, Zip drives, or an internal IDE hard drive
  using a folder-based file structure. SQLite replaces this physical storage layer:

  - Songs, Patterns, Chains, Groove Templates, and Configuration files are stored
    as structured rows, not opaque blobs, enabling query and search capabilities
    the hardware never had.
  - The "Disk" metaphor is preserved: each SQLite database file represents a
    virtual disk. Users can create, format, copy, and switch between virtual disks
    just as they would swap floppies or partition a hard drive.
  - File operations (Save, Load, Copy, Delete, Move, Rename) map to SQL operations
    on the virtual filesystem tables.
-->

```sql
-- Virtual filesystem (emulates MC-80 folder/file structure)
CREATE TABLE virtual_fs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id     INTEGER REFERENCES virtual_fs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK(type IN ('folder','file')),
  file_type     TEXT, -- 'SVQ' (MC-80 Song), 'MID' (Standard MIDI), 'SVC' (Chain), 'SVT' (Groove Template), 'SVF' (Configuration)
  created_at    TEXT DEFAULT (datetime('now')),
  modified_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(parent_id, name)
);

-- Song storage (one song in memory at a time, like the hardware)
CREATE TABLE songs (
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

-- Track configuration (16 phrase tracks + Tempo + Time Signature + Pattern)
CREATE TABLE tracks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id       INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  track_number  INTEGER NOT NULL, -- 1-16 for phrase tracks, 17=Tempo, 18=TimeSig, 19=Pattern
  name          TEXT DEFAULT '',
  midi_channel  INTEGER NOT NULL DEFAULT 1, -- 1-32 (two MIDI outputs × 16 channels)
  midi_port     INTEGER NOT NULL DEFAULT 0, -- 0=MIDI OUT A, 1=MIDI OUT B
  mute          INTEGER NOT NULL DEFAULT 0,
  solo          INTEGER NOT NULL DEFAULT 0,
  has_data      INTEGER NOT NULL DEFAULT 0, -- LED indicator state
  UNIQUE(song_id, track_number)
);

-- MIDI event storage (the core sequencer data)
CREATE TABLE events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id      INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  tick          INTEGER NOT NULL, -- Absolute tick position (480 TPQN)
  event_type    TEXT NOT NULL, -- 'note_on','note_off','cc','pc','pitch_bend','aftertouch','sysex','tempo','time_sig'
  channel       INTEGER, -- MIDI channel 0-15
  data1         INTEGER, -- Note number / CC number / Program number
  data2         INTEGER, -- Velocity / CC value
  duration      INTEGER, -- Gate time in ticks (for note events only)
  raw_data      BLOB     -- For SysEx and other variable-length data
);
CREATE INDEX idx_events_track_tick ON events(track_id, tick);
CREATE INDEX idx_events_type ON events(track_id, event_type);

-- Pattern storage (reusable phrases)
CREATE TABLE patterns (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id       INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  pattern_number INTEGER NOT NULL, -- Pattern index
  name          TEXT DEFAULT '',
  length_measures INTEGER NOT NULL DEFAULT 4,
  time_sig_num  INTEGER NOT NULL DEFAULT 4,
  time_sig_den  INTEGER NOT NULL DEFAULT 4,
  UNIQUE(song_id, pattern_number)
);

-- Pattern events (same structure as track events)
CREATE TABLE pattern_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id    INTEGER NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  track_number  INTEGER NOT NULL DEFAULT 1, -- Patterns have their own track concept
  tick          INTEGER NOT NULL,
  event_type    TEXT NOT NULL,
  channel       INTEGER,
  data1         INTEGER,
  data2         INTEGER,
  duration      INTEGER,
  raw_data      BLOB
);
CREATE INDEX idx_pattern_events ON pattern_events(pattern_id, tick);

-- Chain storage (ordered song playlists)
CREATE TABLE chains (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fs_id         INTEGER REFERENCES virtual_fs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'NewChain'
);

CREATE TABLE chain_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id      INTEGER NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  song_fs_id    INTEGER REFERENCES virtual_fs(id),
  song_name     TEXT NOT NULL,
  UNIQUE(chain_id, position)
);

-- Marker storage (Mark/Jump points within a song)
CREATE TABLE markers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id       INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  marker_number INTEGER NOT NULL, -- 0-99
  tick          INTEGER NOT NULL,
  UNIQUE(song_id, marker_number)
);

-- Groove template storage
CREATE TABLE groove_templates (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fs_id         INTEGER REFERENCES virtual_fs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK(template_type IN ('preset','user')),
  data          BLOB NOT NULL -- Quantize offset data
);

-- Configuration storage (system settings)
CREATE TABLE configurations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fs_id         INTEGER REFERENCES virtual_fs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Config',
  settings_json TEXT NOT NULL DEFAULT '{}' -- Serialized configuration
);

-- Undo/Redo history stack
CREATE TABLE undo_stack (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id       INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  operation     TEXT NOT NULL,
  undo_data     BLOB NOT NULL, -- Serialized state snapshot
  redo_data     BLOB,
  created_at    TEXT DEFAULT (datetime('now'))
);
```

---

## MC-80 Front Panel — Complete Button & Control Inventory

The following is a complete enumeration of every physical control on the MC-80 MicroComposer top panel. Each must be implemented as a React component with faithful behavior.

### Panel Layout Zones

The MC-80 front panel is organized into six functional zones, read left-to-right, top-to-bottom:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [ZONE 1: LCD DISPLAY]                                                     │
│  ┌───────────────────────────────────────────────────┐                      │
│  │                                                   │                      │
│  │            240×64 GRAPHIC LCD DISPLAY              │      [CONTRAST]     │
│  │            (Backlit, green/amber)                  │         knob        │
│  │                                                   │                      │
│  └───────────────────────────────────────────────────┘                      │
│  [F1]    [F2]    [F3]    [F4]    [F5]    [F6]          ← Soft keys         │
│                                                                             │
│  [ZONE 2: MODE]   [ZONE 3: NAVIGATION]   [ZONE 4: ENTRY]   [ZONE 5: XPORT]│
│  [SEQUENCER]      [▲]                    [SHIFT]        [TOP]  [REW] [FF]  │
│  [PATTERN]     [◄] [►]      [VALUE ◎]   [ENTER/YES]    [STOP] [PLAY][REC] │
│  [DISK]           [▼]                    [EXIT/NO]                          │
│  [UTILITY]                    [INC][DEC]                                    │
│                                                                             │
│  [ZONE 6: TRACK & PERFORMANCE CONTROLS]                                    │
│  [1][2][3][4][5][6][7][8][9][10][11][12][13][14][15][16]  ← Track buttons  │
│  [SOLO/MUTE]  [MINUS ONE]  [MARK] [JUMP]                                  │
│  [TRANSPOSE]  [FADE OUT]   [UNDO/REDO]                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Zone 1: LCD Display & Soft Keys

| # | Control | Type | Component | Behavior |
|---|---|---|---|---|
| 1 | **LCD Display** | 240×64 pixel graphic display | `<LcdDisplay />` | Renders all screen content: song position, track status, parameter values, file browsers, micro-edit event lists, help text. Must support the MC-80's screen hierarchy (screens grouped by function). Implement as a canvas or SVG element with a monospaced pixel font replicating the original dot-matrix character set. Background: dark green/gray. Text: light green or amber (user-selectable). |
| 2 | **CONTRAST knob** | Rotary potentiometer | `<ContrastKnob />` | Adjusts LCD display contrast/brightness. In the emulator, controls the opacity and color intensity of the LCD rendering. |
| 3 | **F1** | Momentary pushbutton (soft key) | `<SoftKey index={1} />` | Context-sensitive function key. Label displayed on LCD directly above the button changes per screen. |
| 4 | **F2** | Momentary pushbutton (soft key) | `<SoftKey index={2} />` | Same as F1. |
| 5 | **F3** | Momentary pushbutton (soft key) | `<SoftKey index={3} />` | Same as F1. |
| 6 | **F4** | Momentary pushbutton (soft key) | `<SoftKey index={4} />` | Same as F1. |
| 7 | **F5** | Momentary pushbutton (soft key) | `<SoftKey index={5} />` | Same as F1. |
| 8 | **F6** | Momentary pushbutton (soft key) | `<SoftKey index={6} />` | Same as F1. |

### Zone 2: Mode Selection

| # | Control | Type | Component | Behavior |
|---|---|---|---|---|
| 9 | **SEQUENCER** | Latching pushbutton with LED | `<ModeButton mode="sequencer" />` | Enters the sequencer's basic screen (SONG PLAY screen). LED lights when active. This is the primary operating mode. Pressing when already in sequencer mode returns to the SONG PLAY top-level screen. |
| 10 | **PATTERN** | Latching pushbutton with LED | `<ModeButton mode="pattern" />` | Enters Pattern mode for creating/editing reusable musical phrases. LED lights when active. |
| 11 | **DISK** | Latching pushbutton with LED | `<ModeButton mode="disk" />` | Enters Disk operations mode (Save, Load, Copy, Delete, Move, Rename, Folder management, Disk Info, Volume Label, Disk Copy, Format). LED lights when active. |
| 12 | **UTILITY** | Latching pushbutton with LED | `<ModeButton mode="utility" />` | Enters system settings (MIDI configuration, metronome settings, footswitch assignment, MIDI filter, sync settings). LED lights when active. |

### Zone 3: Navigation

| # | Control | Type | Component | Behavior |
|---|---|---|---|---|
| 13 | **Cursor ▲ (Up)** | Momentary pushbutton | `<CursorButton direction="up" />` | Moves cursor up in parameter lists, event lists, file browsers. In value fields, may increment value. Auto-repeats when held. |
| 14 | **Cursor ▼ (Down)** | Momentary pushbutton | `<CursorButton direction="down" />` | Moves cursor down. Auto-repeats when held. |
| 15 | **Cursor ◄ (Left)** | Momentary pushbutton | `<CursorButton direction="left" />` | Moves cursor left between parameter fields. In Micro Edit, moves to previous event. |
| 16 | **Cursor ► (Right)** | Momentary pushbutton | `<CursorButton direction="right" />` | Moves cursor right between parameter fields. In Micro Edit, moves to next event. |
| 17 | **VALUE dial** | Continuous rotary encoder (infinite rotation) | `<ValueDial />` | Primary data entry control. Clockwise = increment, counter-clockwise = decrement. Speed-sensitive: faster rotation = larger value jumps. Implement as a mouse-drag rotary or scroll-wheel mapped control. SHIFT + VALUE dial = coarse adjustment (10x step). |

### Zone 4: Data Entry & Confirm/Cancel

| # | Control | Type | Component | Behavior |
|---|---|---|---|---|
| 18 | **INC (+)** | Momentary pushbutton | `<IncDecButton direction="inc" />` | Increments the currently selected parameter value by 1. Auto-repeats when held. Alternative to VALUE dial for precise single-step changes. |
| 19 | **DEC (−)** | Momentary pushbutton | `<IncDecButton direction="dec" />` | Decrements the currently selected parameter value by 1. Auto-repeats when held. |
| 20 | **SHIFT** | Modifier pushbutton (hold) | `<ShiftButton />` | Held simultaneously with other buttons to access secondary functions. SHIFT + TOP = Panic (sends All Notes Off + All Controllers Off). SHIFT + F-keys = access additional screen functions. SHIFT + VALUE = coarse value adjustment. SHIFT + PLAY = Quick Play from disk. Visual indicator when held. |
| 21 | **ENTER / YES** | Momentary pushbutton | `<EnterButton />` | Confirms operations, executes commands, enters sub-screens. Answers "Yes" to confirmation dialogs. Finalizes song file selection in Quick Play. |
| 22 | **EXIT / NO** | Momentary pushbutton | `<ExitButton />` | Cancels operations, backs out of sub-screens, returns to parent screen. Answers "No" to confirmation dialogs. Pressing repeatedly navigates back up the screen hierarchy. |

### Zone 5: Transport Controls

| # | Control | Type | Component | Behavior |
|---|---|---|---|---|
| 23 | **TOP** | Momentary pushbutton | `<TransportButton action="top" />` | Returns playback position to the beginning of the song (measure 1, beat 1, tick 0). SHIFT + TOP = Panic Function (sends Note Off and Hold Off messages on all channels to all MIDI outputs). |
| 24 | **REW (Rewind)** | Momentary pushbutton (with hold-repeat) | `<TransportButton action="rew" />` | Steps backward by one measure. Hold to rewind continuously with acceleration. SHIFT + REW = jump to previous marker. |
| 25 | **FF (Fast Forward)** | Momentary pushbutton (with hold-repeat) | `<TransportButton action="ff" />` | Steps forward by one measure. Hold to fast-forward continuously with acceleration. SHIFT + FF = jump to next marker. |
| 26 | **STOP** | Momentary pushbutton | `<TransportButton action="stop" />` | Stops playback or recording. Position is retained. Pressing STOP during recording finalizes the recorded data. |
| 27 | **PLAY** | Momentary pushbutton with LED | `<TransportButton action="play" />` | Begins playback from the current position. LED lights solid during playback. SHIFT + PLAY = Quick Play (plays song directly from disk without loading into memory). During recording, LED may blink. |
| 28 | **REC (Record)** | Momentary pushbutton with LED | `<TransportButton action="rec" />` | Arms recording. Press REC then PLAY to begin realtime recording. LED blinks when armed, solid when recording. Supports multiple recording modes: Replace, Overdub, Mix, and Loop recording. SHIFT + REC = Step Recording mode. |

### Zone 6: Track & Performance Controls

| # | Control | Type | Component | Behavior |
|---|---|---|---|---|
| 29–44 | **Track Buttons 1–16** | Momentary pushbuttons with bi-color LEDs | `<TrackButton number={n} />` (×16) | Multi-function buttons for the 16 phrase tracks. **LED behavior:** LED lights when track contains data (has_data flag). LED color/brightness indicates mute state. **Normal mode:** Selects track for recording or editing. **When SOLO/MUTE is active:** Toggles mute state for that track (press = toggle mute). **During Nonstop Loop Recording:** Switches the recording target to the pressed track number without stopping. |
| 45 | **SOLO / MUTE** | Toggle pushbutton with LED | `<SoloMuteButton />` | Activates Solo/Mute mode for the Track buttons. When active (LED on), Track buttons 1-16 toggle individual track mute on/off. In Solo sub-mode (SHIFT + SOLO/MUTE), pressing a Track button solos that track (mutes all others). |
| 46 | **MINUS ONE (Music-Minus-One)** | Toggle pushbutton with LED | `<MinusOneButton />` | Mutes the currently selected track during playback — a "karaoke" function that removes one part (e.g., the melody) so the user can play along. LED indicates active state. |
| 47 | **MARK** | Momentary pushbutton | `<MarkButton />` | Sets a marker at the current playback/cursor position. During playback, press MARK to drop a marker at the current measure in real-time. Up to 100 markers (0-99) can be set per song. Markers are stored in the `markers` table. |
| 48 | **JUMP** | Momentary pushbutton | `<JumpButton />` | Jumps playback to the next marker. Designed for live performance: allows real-time song rearrangement by jumping between marked sections. SHIFT + JUMP = jump to previous marker. Jump timing can be configured (immediate, next beat, next measure). |
| 49 | **TRANSPOSE** | Toggle pushbutton with LED | `<TransposeButton />` | Activates Realtime Transpose mode. When active, played notes and playback are transposed by a configurable interval (-24 to +24 semitones). Specific MIDI channels can be excluded from transposition (e.g., drums on channel 10). |
| 50 | **FADE OUT** | Momentary pushbutton | `<FadeOutButton />` | Initiates a gradual fade-out of all MIDI volume (CC#7) during playback. Configurable fade duration (1-60 seconds). Song stops automatically when fade completes. |
| 51 | **UNDO / REDO** | Momentary pushbutton | `<UndoRedoButton />` | Undoes the last edit or recording operation. Press again to redo. Single-level undo/redo matching the MC-80's original capability. Applies to: realtime recording, step recording, and all track edit operations. |

---

## Screen Hierarchy & Navigation Model

The MC-80 organizes screens by function, accessed via mode buttons and F-keys. This hierarchy must be faithfully replicated.

```
[SEQUENCER] → SONG PLAY (home screen)
  ├─ F1: SONG (file browser / Quick Play song selection)
  ├─ F2: TRACK (track status overview — channel, port, mute, data indicators)
  ├─ F3: MICRO (Microscope Edit — event list editor)
  │   ├─ F1: Filter (display filter — show only specific event types)
  │   ├─ F2: Create (insert new events)
  │   ├─ F3: Erase (delete events)
  │   ├─ F4: Move (move events in time)
  │   ├─ F5: Copy (copy events)
  │   └─ F6: (context-dependent)
  ├─ F4: EDIT (Track Edit operations)
  │   ├─ F1: Erase (erase phrases from tracks)
  │   ├─ F2: Delete (delete measures)
  │   ├─ F3: Copy (copy phrases between tracks/measures)
  │   ├─ F4: Insert (insert blank measures)
  │   ├─ F5: Quantize (Grid/Shuffle/Groove quantize)
  │   │   ├─ Grid Quantize
  │   │   ├─ Shuffle Quantize
  │   │   └─ Groove Quantize (with preset & user groove templates)
  │   └─ F6: More → (additional edit functions)
  │       ├─ Transpose
  │       ├─ Change Velocity
  │       ├─ Change Channel
  │       ├─ Change Gate Time
  │       ├─ Merge (combine two tracks)
  │       ├─ Extract (extract specific data)
  │       ├─ Shift Clock
  │       ├─ Data Thin
  │       ├─ Exchange (swap track contents)
  │       ├─ Time Fit
  │       ├─ Modify Value
  │       └─ Truncate (remove blank leading measures)
  ├─ F5: RPS (Realtime Phrase Sequence setup)
  │   └─ Phrase Sequence parameter configuration
  └─ F6: ARP (Arpeggiator setup)
      ├─ Style selection (33 arpeggio styles)
      ├─ Parameter editing (range, velocity, accent, shuffle)
      └─ Hold mode toggle

[PATTERN] → PATTERN PLAY (pattern selection and playback)
  ├─ F1: Pattern list / selection
  ├─ F2: Pattern track status
  ├─ F3: MICRO (Microscope Edit for pattern)
  ├─ F4: EDIT (Track Edit for pattern)
  └─ F5/F6: (context-dependent)

[DISK] → DISK OPERATIONS
  ├─ F1: Save (Song/Chain/Groove Template/Configuration)
  ├─ F2: Load (Song/Chain/Groove Template/Configuration)
  ├─ F3: File operations (Copy/Delete/Move/Rename)
  ├─ F4: Folder management (Create/Navigate)
  ├─ F5: Disk functions (Disk Info/Volume Label/Disk Copy/Format)
  └─ F6: (context-dependent)

[UTILITY] → SYSTEM SETTINGS
  ├─ F1: MIDI Setup (IN/OUT connector selection, THRU settings)
  ├─ F2: Sync settings (MTC/MMC/MIDI Clock master/slave)
  ├─ F3: Metronome settings (sound, volume, accent, count-in)
  ├─ F4: Footswitch assignment
  ├─ F5: MIDI Filter (ignore specific message types)
  └─ F6: Configuration (Save/Load system configuration)
```

---

## MIDI Sequencer Engine Specification

### Core Timing

- **Resolution:** 480 TPQN (Ticks Per Quarter Note) — matching the hardware exactly
- **Clock source:** `performance.now()` with a lookahead scheduling buffer
- **Lookahead:** 25ms buffer, 10ms scheduling interval
- **Tempo range:** 20.0–250.0 BPM (0.1 BPM increments)
- **Tempo track:** Supports programmed tempo changes at any tick position
- **Time signature track:** Supports time signature changes at any measure boundary

### Playback Engine

```typescript
// Core scheduler architecture (conceptual)
interface SchedulerConfig {
  lookaheadMs: number;    // 25ms — how far ahead to schedule events
  intervalMs: number;     // 10ms — how often the scheduler runs
  tpqn: number;           // 480 — ticks per quarter note
}

interface PlaybackState {
  isPlaying: boolean;
  isRecording: boolean;
  currentTick: number;          // Absolute tick position in song
  currentMeasure: number;       // Derived from tick + time signatures
  currentBeat: number;          // Derived from tick + time signatures
  tempo: number;                // Current tempo in BPM
  tempoTrackMuted: boolean;     // Fixed tempo mode
  loopStart: number | null;     // Loop recording start tick
  loopEnd: number | null;       // Loop recording end tick
  recordingMode: 'replace' | 'overdub' | 'mix';
  countInMeasures: number;      // Pre-recording count (0, 1, or 2 measures)
}
```

### Recording Modes

1. **Realtime Recording (Replace):** Erases existing data on the target track and records new input
2. **Realtime Recording (Overdub/Mix):** Merges new input with existing data on the target track
3. **Nonstop Loop Recording:** Loops a region; pressing Track buttons 1-16 switches the recording target without stopping
4. **Step Recording:** Input events one at a time with explicit duration/position control. No real-time clock — user advances position manually
5. **Rehearsal Mode:** Plays input through to MIDI output without recording — for practice before committing

### MIDI I/O

- **Inputs:** Two virtual MIDI IN ports (selectable per-operation, matching MC-80's dual MIDI IN)
- **Outputs:** Two virtual MIDI OUT ports (A and B), each carrying 16 channels, for 32-channel total capacity
- **MIDI THRU:** Configurable echo of MIDI IN to MIDI OUT (soft thru implementation)
- **Recording channel assignment:** Per-track MIDI channel (1-32). Optional legacy MC-Series mode records 16 channels to 16 tracks automatically
- **MIDI Update:** When starting playback from mid-song, sends all relevant CC, PC, pitch bend, and other state messages to ensure correct sound module configuration

### Event Types

The sequencer must handle all standard MIDI message types:

- Note On / Note Off (with gate time / duration)
- Control Change (CC)
- Program Change (PC)
- Pitch Bend
- Channel Aftertouch
- Polyphonic Key Pressure
- System Exclusive (SysEx)
- Tempo Change (meta-event, stored on Tempo Track)
- Time Signature Change (meta-event, stored on Time Signature Track)

---

## Recording & Editing Operations

### Microscope Edit (Micro Edit)

A per-event editor displaying a scrollable list of all MIDI events on a track, sorted by tick position. This is the MC-80's primary detailed editing interface.

**Display columns:** Measure:Beat:Tick | Event Type | Channel | Data1 | Data2 | Duration/Gate

**Filter modes (display only specific event types):**
- All events
- Notes only
- Control Change only
- Program Change only
- Pitch Bend only
- Aftertouch only
- SysEx only
- Tempo changes (Tempo Track only)
- Time signature changes (Time Sig Track only)

**Operations within Micro Edit:**
- Change any parameter value of any event using VALUE dial / INC / DEC
- Create new events at any position
- Erase individual events
- Move events in time (shift tick position)
- Copy events to a new position or track

### Track Edit Operations

Bulk operations on measures and tracks:

| Operation | Description |
|---|---|
| **Erase** | Clears performance data from a range of measures on one or more tracks, leaving empty measures |
| **Delete** | Removes measures entirely, shifting subsequent measures backward |
| **Truncate** | Deletes blank measures from the beginning of the song |
| **Copy** | Copies phrase data between tracks, patterns, and measure ranges |
| **Insert Measure** | Inserts blank measures at a position, pushing existing data forward |
| **Transpose** | Shifts note pitch by semitones across a range (with channel exclusion for drums) |
| **Change Velocity** | Adjusts note velocities (add/subtract offset, scale percentage, limit min/max, set fixed value) |
| **Change Channel** | Reassigns MIDI channel for events in a range |
| **Change Gate Time** | Adjusts note duration (add/subtract offset, scale percentage, limit min/max) |
| **Merge** | Combines two tracks or patterns into a single track |
| **Extract** | Moves specific event types from one track to another |
| **Shift Clock** | Shifts all events forward or backward by a tick offset |
| **Data Thin** | Reduces density of continuous controller data (pitch bend, aftertouch, CC) by removing intermediate values |
| **Exchange** | Swaps the contents of two tracks or patterns |
| **Time Fit** | Stretches or compresses timing to fit a target duration |
| **Modify Value** | Transforms CC or velocity values using mathematical operations |

### Quantize Engine

Three quantize modes, matching the MC-80 hardware:

1. **Grid Quantize:** Snaps events to the nearest grid position. Grid resolution: whole note through 32nd-note triplets. Strength parameter (0-100%) controls how far events move toward the grid.

2. **Shuffle Quantize:** Offsets every other grid position to create swing. Shuffle ratio parameter controls the offset amount.

3. **Groove Quantize:** Applies timing, velocity, and duration offsets from a groove template. Supports both preset templates (borrowed from the XP-80 workstation) and user-defined templates loaded from Standard MIDI Files. Template parameters: timing strength, velocity strength, duration strength.

---

## File Format Compatibility

The emulator must support loading and saving these file types:

| Format | Extension | Read | Write | Notes |
|---|---|---|---|---|
| MC-80 Native Song | `.SVQ` | ✓ | ✓ | Primary format. Full song data with all MC-80 features. |
| Standard MIDI File | `.MID` | ✓ | ✓ | Type 0 (single track) and Type 1 (multi-track). Import and export. |
| MC-80 Chain | `.SVC` | ✓ | ✓ | Ordered playlist of songs. |
| MC-80 Groove Template | `.SVT` | ✓ | ✓ | User-defined quantize groove data. |
| MC-80 Configuration | `.SVF` | ✓ | ✓ | System settings snapshot. |
| MC-50mkII Song | `.MCP` | ✓ | ✗ | Legacy import only (read and convert). |
| XP-50/60/80 Song | `.XSQ` | ✓ | ✗ | Legacy import only (read and convert). |

---

## Component Architecture

### Top-Level Component Tree

```
<App>
  <ElectronTitleBar />
  <MC80Panel>                         <!-- Main hardware panel container -->
    <LcdDisplayZone>
      <LcdDisplay />                  <!-- 240×64 emulated LCD -->
      <SoftKeyRow>                    <!-- F1–F6 below LCD -->
        <SoftKey index={1..6} />
      </SoftKeyRow>
      <ContrastKnob />
    </LcdDisplayZone>

    <ControlsZone>
      <ModeButtonGroup>               <!-- Radix ToggleGroup (exclusive) -->
        <ModeButton mode="sequencer" />
        <ModeButton mode="pattern" />
        <ModeButton mode="disk" />
        <ModeButton mode="utility" />
      </ModeButtonGroup>

      <NavigationCluster>
        <CursorButton direction="up|down|left|right" />  <!-- ×4 -->
        <ValueDial />
        <IncDecButton direction="inc|dec" />              <!-- ×2 -->
      </NavigationCluster>

      <EntryCluster>
        <ShiftButton />
        <EnterButton />
        <ExitButton />
      </EntryCluster>

      <TransportBar>
        <TransportButton action="top|rew|ff|stop|play|rec" />  <!-- ×6 -->
      </TransportBar>
    </ControlsZone>

    <TrackZone>
      <TrackButtonRow>
        <TrackButton number={1..16} />  <!-- ×16 with LEDs -->
      </TrackButtonRow>
      <PerformanceControls>
        <SoloMuteButton />
        <MinusOneButton />
        <MarkButton />
        <JumpButton />
        <TransposeButton />
        <FadeOutButton />
        <UndoRedoButton />
      </PerformanceControls>
    </TrackZone>
  </MC80Panel>
</App>
```

### State Management (Zustand Slices)

```typescript
// Suggested Zustand store architecture
interface MC80Store {
  // Hardware state (what the physical unit would track in RAM)
  mode: 'sequencer' | 'pattern' | 'disk' | 'utility';
  currentScreen: ScreenId;           // Active screen in hierarchy
  screenStack: ScreenId[];           // Navigation breadcrumb for EXIT
  cursorPosition: CursorPosition;    // Row, column in current screen
  shiftHeld: boolean;

  // Playback engine state
  playback: PlaybackState;

  // Song in memory (only one at a time, like the hardware)
  song: Song | null;
  songModified: boolean;             // Dirty flag for "save before loading?"

  // Track states
  tracks: TrackState[];              // 16 phrase tracks + meta tracks

  // LCD state
  lcd: {
    softKeyLabels: [string, string, string, string, string, string];
    displayBuffer: LcdBuffer;        // Pixel-level or character-level buffer
  };

  // Feature states
  soloMuteActive: boolean;
  minusOneActive: boolean;
  transposeActive: boolean;
  transposeAmount: number;           // -24 to +24 semitones
  transposeExcludeChannels: Set<number>;
  arpeggiatorActive: boolean;
  arpeggiatorConfig: ArpeggiatorConfig;
  phraseSequenceActive: boolean;

  // Disk state
  currentDiskPath: string[];         // Virtual filesystem navigation path

  // Undo
  undoAvailable: boolean;
  redoAvailable: boolean;
}
```

---

## Keyboard Shortcut Mapping

Map the MC-80's physical buttons to keyboard shortcuts for efficient desktop operation:

| MC-80 Button | Primary Key | Alternate |
|---|---|---|
| F1–F6 | `F1`–`F6` | — |
| SEQUENCER | `1` | — |
| PATTERN | `2` | — |
| DISK | `3` | — |
| UTILITY | `4` | — |
| Cursor ▲▼◄► | Arrow keys | — |
| VALUE dial | Mouse scroll wheel | `]` / `[` |
| INC / DEC | `+` / `-` | `=` / `-` |
| SHIFT | `Shift` | — |
| ENTER / YES | `Enter` | — |
| EXIT / NO | `Escape` | — |
| TOP | `Home` | — |
| REW | `Page Up` | — |
| FF | `Page Down` | — |
| STOP | `Space` (when playing) | `S` |
| PLAY | `Space` (when stopped) | `P` |
| REC | `R` | — |
| Track 1–9 | `Numpad 1`–`9` | — |
| Track 10–16 | `Shift+Numpad 1`–`7` | — |
| SOLO/MUTE | `M` | — |
| MINUS ONE | `O` | — |
| MARK | `K` | — |
| JUMP | `J` | — |
| TRANSPOSE | `T` | — |
| FADE OUT | `F` | — |
| UNDO/REDO | `Ctrl+Z` / `Ctrl+Shift+Z` | `U` |

---

## Visual Design Direction

### Hardware-Faithful Aesthetic

The UI must evoke the physical MC-80 unit:

- **Panel background:** Dark charcoal gray (`#2D2D2D` to `#3A3A3A`), subtle texture simulating the painted metal surface
- **Button style:** Raised 3D buttons with beveled edges, lighter gray tops (`#5A5A5A`), with press-down visual feedback (inset shadow on click)
- **LED indicators:** Small circles that glow green (data present), amber (active/selected), red (recording). Use CSS `box-shadow` with color-matched glow for the bloom effect
- **LCD display:** Dark green-gray background (`#1A2B1A`) with light green (`#7FCC7F`) or amber (`#CCAA44`) text, pixel-grid overlay for CRT/dot-matrix effect, slight vignette at edges
- **Typography:** Monospaced pixel font for LCD content (use a custom web font or canvas rendering). Sans-serif labels for button silk-screening
- **Transport buttons:** Slightly larger than other buttons, with standard transport icons (◀◀ ▶▶ ■ ▶ ●)
- **Track buttons:** Uniform row of 16 small square buttons with integrated LED dots
- **VALUE dial:** Circular element with a position indicator line, responds to click-drag (vertical or rotary gesture) and scroll wheel

### Tailwind Custom Theme Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        panel: {
          dark: '#2D2D2D',
          mid: '#3A3A3A',
          light: '#5A5A5A',
          highlight: '#6B6B6B',
        },
        lcd: {
          bg: '#1A2B1A',
          text: '#7FCC7F',
          amber: '#CCAA44',
          dim: '#2A3B2A',
        },
        led: {
          green: '#22C55E',
          amber: '#F59E0B',
          red: '#EF4444',
          off: '#4A4A4A',
          glow: {
            green: '0 0 6px #22C55E, 0 0 12px #22C55E44',
            amber: '0 0 6px #F59E0B, 0 0 12px #F59E0B44',
            red: '0 0 6px #EF4444, 0 0 12px #EF444444',
          }
        },
        silk: '#B0B0B0', // Silkscreen label text color
      },
      fontFamily: {
        lcd: ['"MC80LCD"', 'monospace'],    // Custom pixel font
        silk: ['"Inter"', 'sans-serif'],     // Button labels
      },
      boxShadow: {
        'button-up': 'inset 0 -2px 4px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.1)',
        'button-down': 'inset 0 2px 4px rgba(0,0,0,0.6)',
      }
    }
  }
}
```

---

## Project Structure

```
mc80-emu/
├── electron/
│   ├── main.ts                    # Electron main process entry
│   ├── preload.ts                 # Context bridge (IPC API exposure)
│   ├── database/
│   │   ├── connection.ts          # SQLite connection manager (better-sqlite3)
│   │   ├── migrations/            # Schema versioning
│   │   │   └── 001_initial.sql
│   │   ├── repositories/
│   │   │   ├── songRepo.ts        # Song CRUD operations
│   │   │   ├── trackRepo.ts       # Track CRUD operations
│   │   │   ├── eventRepo.ts       # MIDI event storage/retrieval
│   │   │   ├── patternRepo.ts     # Pattern management
│   │   │   ├── chainRepo.ts       # Chain playlist management
│   │   │   ├── markerRepo.ts      # Marker management
│   │   │   ├── filesystemRepo.ts  # Virtual filesystem operations
│   │   │   └── configRepo.ts      # Configuration persistence
│   │   └── virtualDisk.ts         # Disk metaphor layer (format, copy, info)
│   └── midi/
│       ├── midiManager.ts         # Web MIDI API abstraction
│       └── midiRouter.ts          # IN/OUT/THRU routing logic
├── src/
│   ├── App.tsx                    # Root component
│   ├── main.tsx                   # React entry point
│   ├── stores/
│   │   ├── mc80Store.ts           # Main Zustand store
│   │   ├── playbackSlice.ts       # Playback engine state
│   │   ├── screenSlice.ts         # Screen navigation state machine
│   │   ├── trackSlice.ts          # Track state management
│   │   └── editSlice.ts           # Edit operation state
│   ├── engine/
│   │   ├── scheduler.ts           # High-resolution MIDI event scheduler
│   │   ├── recorder.ts            # Realtime & step recording engine
│   │   ├── quantize.ts            # Grid/Shuffle/Groove quantize algorithms
│   │   ├── arpeggiator.ts         # Arpeggiator engine (33 styles)
│   │   ├── phraseSequence.ts      # RPS (Realtime Phrase Sequence) engine
│   │   ├── midiUpdate.ts          # Chase/update state on mid-song start
│   │   └── fadeOut.ts             # Volume fade-out controller
│   ├── components/
│   │   ├── panel/
│   │   │   └── MC80Panel.tsx      # Top-level panel layout
│   │   ├── lcd/
│   │   │   ├── LcdDisplay.tsx     # LCD canvas/SVG renderer
│   │   │   ├── LcdPixelFont.ts    # Dot-matrix character rendering
│   │   │   └── screens/           # One component per LCD screen
│   │   │       ├── SongPlayScreen.tsx
│   │   │       ├── TrackStatusScreen.tsx
│   │   │       ├── MicroEditScreen.tsx
│   │   │       ├── TrackEditScreen.tsx
│   │   │       ├── PatternPlayScreen.tsx
│   │   │       ├── DiskOperationsScreen.tsx
│   │   │       ├── UtilityScreen.tsx
│   │   │       ├── ArpeggiatorScreen.tsx
│   │   │       ├── PhraseSequenceScreen.tsx
│   │   │       ├── QuantizeScreen.tsx
│   │   │       ├── FileBrowserScreen.tsx
│   │   │       ├── SongInfoScreen.tsx
│   │   │       ├── ChainPlayScreen.tsx
│   │   │       └── HelpScreen.tsx
│   │   ├── buttons/
│   │   │   ├── SoftKey.tsx         # F1-F6 context-sensitive buttons
│   │   │   ├── ModeButton.tsx      # SEQUENCER/PATTERN/DISK/UTILITY
│   │   │   ├── CursorButton.tsx    # ▲▼◄►
│   │   │   ├── TransportButton.tsx # TOP/REW/FF/STOP/PLAY/REC
│   │   │   ├── TrackButton.tsx     # Track 1-16 with LED
│   │   │   ├── ShiftButton.tsx     # SHIFT modifier
│   │   │   ├── EnterButton.tsx     # ENTER/YES
│   │   │   ├── ExitButton.tsx      # EXIT/NO
│   │   │   ├── IncDecButton.tsx    # INC(+) / DEC(-)
│   │   │   ├── SoloMuteButton.tsx
│   │   │   ├── MinusOneButton.tsx
│   │   │   ├── MarkButton.tsx
│   │   │   ├── JumpButton.tsx
│   │   │   ├── TransposeButton.tsx
│   │   │   ├── FadeOutButton.tsx
│   │   │   └── UndoRedoButton.tsx
│   │   ├── controls/
│   │   │   ├── ValueDial.tsx       # Rotary encoder emulation
│   │   │   ├── ContrastKnob.tsx    # LCD contrast/brightness
│   │   │   └── LedIndicator.tsx    # Reusable LED component
│   │   └── shared/
│   │       ├── ButtonBase.tsx      # Common button styling & interaction
│   │       └── PanelSection.tsx    # Layout container with silkscreen labels
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts # Global hotkey bindings
│   │   ├── useMidiDevices.ts       # MIDI device enumeration & connection
│   │   ├── useAutoRepeat.ts        # Hold-to-repeat for buttons (cursor, REW, FF)
│   │   └── useValueDial.ts         # Mouse drag / scroll wheel → value changes
│   ├── utils/
│   │   ├── tickMath.ts            # Tick ↔ Measure:Beat:Tick conversions
│   │   ├── midiConstants.ts       # Note names, CC names, GM instrument names
│   │   ├── smfParser.ts           # Standard MIDI File reader
│   │   ├── smfWriter.ts           # Standard MIDI File writer
│   │   └── mc80FileFormat.ts      # MC-80 native format (.SVQ) parser/writer
│   └── styles/
│       ├── globals.css            # Tailwind imports + LCD font-face
│       └── lcd-effects.css        # Scanline overlay, vignette, pixel grid
├── assets/
│   ├── fonts/
│   │   └── MC80LCD.woff2          # Custom pixel font for LCD rendering
│   └── images/
│       └── panel-texture.png      # Subtle metallic texture for panel background
├── tailwind.config.js
├── vite.config.ts
├── electron-builder.yml           # Packaging configuration
├── package.json
└── tsconfig.json
```

---

## Implementation Phases

### Phase 1: Shell & Panel (Weeks 1–2)
- Electron + React + Vite project scaffolding
- Full panel layout with all 51 controls rendered (non-functional visually complete buttons)
- LCD display component with pixel font rendering
- Keyboard shortcut framework
- SQLite database initialization with schema

### Phase 2: Core Sequencer Engine (Weeks 3–5)
- MIDI scheduler with 480 TPQN timing
- Playback engine (Play, Stop, transport position tracking)
- Web MIDI API integration (device enumeration, IN/OUT routing)
- Song and track data model in SQLite
- Basic SONG PLAY screen with position display and tempo

### Phase 3: Recording (Weeks 6–7)
- Realtime recording (Replace and Overdub modes)
- Step recording
- Nonstop Loop recording with track switching
- Count-in metronome
- Rehearsal mode
- Undo/Redo for recording operations

### Phase 4: Editing (Weeks 8–10)
- Microscope Edit (full event list editor with filtering)
- All 14 Track Edit operations
- Quantize engine (Grid, Shuffle, Groove with template support)
- Pattern creation and editing
- Undo/Redo for edit operations

### Phase 5: Performance Features (Weeks 11–12)
- Solo/Mute with Track button integration
- Music-Minus-One
- Mark/Jump with configurable timing
- Realtime Transpose with channel exclusion
- Fade Out
- Chain Play
- Arpeggiator (33 styles)
- Realtime Phrase Sequence (RPS)

### Phase 6: File Management (Weeks 13–14)
- Virtual filesystem with folder hierarchy in SQLite
- Save/Load for all file types (.SVQ, .MID, .SVC, .SVT, .SVF)
- Standard MIDI File import/export
- MC-50mkII and XP-series song import
- Disk operations (Info, Format, Copy, Volume Label)
- Quick Play (direct-from-disk playback)

### Phase 7: Polish & Packaging (Weeks 15–16)
- Help function (context-sensitive help text per screen)
- MIDI Update / Chase on mid-song start
- Configuration save/load
- LCD visual effects (scanlines, vignette, pixel grid)
- Electron packaging for macOS, Windows, Linux
- Icon, splash screen, installer branding

---

## Critical Implementation Notes

1. **Single Song in Memory:** The MC-80 holds exactly one song in RAM at a time. Loading a new song replaces the current one. The emulator must prompt "Save current song?" when loading if the song has been modified. This is not a limitation to work around — it is fundamental to the workflow.

2. **Screen State Machine:** The MC-80's screen navigation is a strict hierarchy, not free-form. Each mode button resets to that mode's top-level screen. F-keys navigate within a mode. EXIT backs up one level. The `screenStack` in the store tracks breadcrumbs. Implement this as a finite state machine, not ad-hoc conditionals.

3. **VALUE Dial Acceleration:** The physical VALUE dial is speed-sensitive. Slow rotation changes values by 1. Fast rotation jumps by 10 or 100. Implement velocity detection on the mouse scroll / drag gesture.

4. **Soft Key Labels:** F1–F6 labels on the LCD change with every screen and sometimes within a screen based on cursor position or SHIFT state. The LCD component must render these labels in a fixed row at the bottom of the display, updating from the current screen's label definitions.

5. **Track LEDs Are Data Indicators:** Track button LEDs light up when a track contains MIDI data — not merely when selected. During playback, LEDs may flash or pulse to indicate activity. This is critical visual feedback that users of the hardware rely on.

6. **MC-Series Compatibility Mode:** The MC-80 has an optional recording mode that matches the MC-50/MC-500/MC-300 behavior, where performance data on 16 MIDI channels is automatically recorded to the corresponding 16 tracks. This mode must be implemented as a toggle in UTILITY settings.

7. **Panic Function:** SHIFT + TOP must immediately send Note Off (CC#123) and All Controllers Off (CC#121) on all 32 MIDI channels (both ports). This is a safety feature — never defer or debounce it.

8. **MIDI THRU Latency:** When MIDI THRU is enabled, input must be echoed to output with minimal latency. Use a dedicated high-priority handler, not the general event processing pipeline.

---

## End of Bootstrap Prompt

This document provides complete specifications for building the MC-80 Virtual MicroComposer. Every button, screen, and behavior described here is derived from the Roland MC-80 MicroComposer Owner's Manual and the physical hardware's documented functionality, scoped exclusively to the sequencer (non-EX) feature set.