import React from 'react'
import { useMC80Store } from '../../stores/mc80Store'
import { LedIndicator } from '../controls/LedIndicator'
import { cn } from '../../utils/cn'

type TransportAction = 'top' | 'rew' | 'ff' | 'stop' | 'play' | 'rec'

const TRANSPORT_LABELS: Record<TransportAction, string> = {
  top: '|◀',
  rew: '◀◀',
  ff: '▶▶',
  stop: '■',
  play: '▶',
  rec: '●',
}

interface TransportButtonProps {
  action: TransportAction
}

export function TransportButton({ action }: TransportButtonProps) {
  const playback = useMC80Store((s) => s.playback)
  const setPlayback = useMC80Store((s) => s.setPlayback)

  const hasLed = action === 'play' || action === 'rec'

  const getLedColor = () => {
    if (action === 'play') return playback.isPlaying ? 'green' : 'off'
    if (action === 'rec') return playback.isRecording ? 'red' : playback.recArmed ? 'red' : 'off'
    return 'off'
  }

  const handleClick = () => {
    switch (action) {
      case 'play':
        if (!playback.isPlaying) setPlayback({ isPlaying: true, recArmed: false })
        break
      case 'stop':
        setPlayback({ isPlaying: false, isRecording: false, recArmed: false })
        break
      case 'rec':
        setPlayback({ recArmed: !playback.recArmed })
        break
      case 'top':
        setPlayback({ currentTick: 0, currentMeasure: 1, currentBeat: 1 })
        break
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'hw-button px-3 py-2 min-w-[44px] text-base font-bold',
        (action === 'play' && playback.isPlaying) && 'shadow-button-down translate-y-px',
        (action === 'rec' && (playback.isRecording || playback.recArmed)) && 'shadow-button-down translate-y-px',
        hasLed && 'flex flex-col items-center gap-1'
      )}
    >
      {hasLed && <LedIndicator color={getLedColor()} />}
      <span>{TRANSPORT_LABELS[action]}</span>
    </button>
  )
}
