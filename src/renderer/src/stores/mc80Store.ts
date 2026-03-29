import { create } from 'zustand'

export type Mode = 'sequencer' | 'pattern' | 'disk' | 'utility'
export type ScreenId =
  | 'song_play'
  | 'track_status'
  | 'micro_edit'
  | 'track_edit'
  | 'pattern_play'
  | 'disk_ops'
  | 'utility'
  | 'arpeggiator'
  | 'phrase_sequence'
  | 'quantize'
  | 'file_browser'
  | 'song_info'
  | 'chain_play'
  | 'help'

export interface TrackState {
  number: number
  name: string
  midiChannel: number
  midiPort: number
  mute: boolean
  solo: boolean
  hasData: boolean
}

export interface PlaybackState {
  isPlaying: boolean
  isRecording: boolean
  recArmed: boolean
  currentTick: number
  currentMeasure: number
  currentBeat: number
  tempo: number
  loopStart: number | null
  loopEnd: number | null
  recordingMode: 'replace' | 'overdub' | 'mix'
  countInMeasures: number
}

interface MC80State {
  mode: Mode
  currentScreen: ScreenId
  screenStack: ScreenId[]
  cursorRow: number
  cursorCol: number
  shiftHeld: boolean
  playback: PlaybackState
  tracks: TrackState[]
  softKeyLabels: [string, string, string, string, string, string]
  soloMuteActive: boolean
  minusOneActive: boolean
  transposeActive: boolean
  transposeAmount: number
  arpeggiatorActive: boolean
  undoAvailable: boolean
  redoAvailable: boolean
  lcdContrast: number
  // Actions
  setMode: (mode: Mode) => void
  setScreen: (screen: ScreenId) => void
  pushScreen: (screen: ScreenId) => void
  popScreen: () => void
  setShiftHeld: (held: boolean) => void
  setPlayback: (state: Partial<PlaybackState>) => void
  toggleTrackMute: (trackNumber: number) => void
  setSoftKeyLabels: (labels: [string, string, string, string, string, string]) => void
  toggleSoloMute: () => void
  toggleMinusOne: () => void
  toggleTranspose: () => void
  setLcdContrast: (value: number) => void
}

const defaultTracks = (): TrackState[] =>
  Array.from({ length: 16 }, (_, i) => ({
    number: i + 1,
    name: '',
    midiChannel: i + 1,
    midiPort: 0,
    mute: false,
    solo: false,
    hasData: false,
  }))

export const useMC80Store = create<MC80State>((set, get) => ({
  mode: 'sequencer',
  currentScreen: 'song_play',
  screenStack: [],
  cursorRow: 0,
  cursorCol: 0,
  shiftHeld: false,
  playback: {
    isPlaying: false,
    isRecording: false,
    recArmed: false,
    currentTick: 0,
    currentMeasure: 1,
    currentBeat: 1,
    tempo: 120.0,
    loopStart: null,
    loopEnd: null,
    recordingMode: 'replace',
    countInMeasures: 1,
  },
  tracks: defaultTracks(),
  softKeyLabels: ['SONG', 'TRACK', 'MICRO', 'EDIT', 'RPS', 'ARP'],
  soloMuteActive: false,
  minusOneActive: false,
  transposeActive: false,
  transposeAmount: 0,
  arpeggiatorActive: false,
  undoAvailable: false,
  redoAvailable: false,
  lcdContrast: 80,

  setMode: (mode) => {
    const screenMap: Record<Mode, ScreenId> = {
      sequencer: 'song_play',
      pattern: 'pattern_play',
      disk: 'disk_ops',
      utility: 'utility',
    }
    set({ mode, currentScreen: screenMap[mode], screenStack: [] })
  },

  setScreen: (screen) => set({ currentScreen: screen }),

  pushScreen: (screen) => {
    const { currentScreen, screenStack } = get()
    set({ currentScreen: screen, screenStack: [...screenStack, currentScreen] })
  },

  popScreen: () => {
    const { screenStack } = get()
    if (screenStack.length === 0) return
    const prev = screenStack[screenStack.length - 1]
    set({ currentScreen: prev, screenStack: screenStack.slice(0, -1) })
  },

  setShiftHeld: (held) => set({ shiftHeld: held }),

  setPlayback: (state) =>
    set((s) => ({ playback: { ...s.playback, ...state } })),

  toggleTrackMute: (trackNumber) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.number === trackNumber ? { ...t, mute: !t.mute } : t
      ),
    })),

  setSoftKeyLabels: (labels) => set({ softKeyLabels: labels }),

  toggleSoloMute: () => set((s) => ({ soloMuteActive: !s.soloMuteActive })),
  toggleMinusOne: () => set((s) => ({ minusOneActive: !s.minusOneActive })),
  toggleTranspose: () => set((s) => ({ transposeActive: !s.transposeActive })),
  setLcdContrast: (value) => set({ lcdContrast: value }),
}))
