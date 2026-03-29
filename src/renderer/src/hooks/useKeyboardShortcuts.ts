import { useEffect } from 'react'
import { useMC80Store } from '../stores/mc80Store'

export function useKeyboardShortcuts() {
  const setMode = useMC80Store((s) => s.setMode)
  const setShiftHeld = useMC80Store((s) => s.setShiftHeld)
  const setPlayback = useMC80Store((s) => s.setPlayback)
  const popScreen = useMC80Store((s) => s.popScreen)
  const playback = useMC80Store((s) => s.playback)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) setShiftHeld(true)

      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      switch (e.key) {
        case '1': setMode('sequencer'); break
        case '2': setMode('pattern'); break
        case '3': setMode('disk'); break
        case '4': setMode('utility'); break
        case ' ':
          e.preventDefault()
          if (playback.isPlaying) {
            setPlayback({ isPlaying: false, isRecording: false })
          } else {
            setPlayback({ isPlaying: true })
          }
          break
        case 'r': case 'R':
          setPlayback({ recArmed: !playback.recArmed })
          break
        case 'Home':
          setPlayback({ currentTick: 0, currentMeasure: 1, currentBeat: 1 })
          break
        case 'Escape':
          popScreen()
          break
        case 'm': case 'M':
          useMC80Store.getState().toggleSoloMute()
          break
        case 'o': case 'O':
          useMC80Store.getState().toggleMinusOne()
          break
        case 't': case 'T':
          useMC80Store.getState().toggleTranspose()
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) setShiftHeld(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [playback, setMode, setShiftHeld, setPlayback, popScreen])
}
