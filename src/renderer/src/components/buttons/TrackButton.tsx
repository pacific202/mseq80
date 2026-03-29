import React from 'react'
import { useMC80Store } from '../../stores/mc80Store'
import { LedIndicator } from '../controls/LedIndicator'
import { cn } from '../../utils/cn'

interface TrackButtonProps {
  number: number
}

export function TrackButton({ number }: TrackButtonProps) {
  const track = useMC80Store((s) => s.tracks.find((t) => t.number === number))
  const soloMuteActive = useMC80Store((s) => s.soloMuteActive)
  const toggleTrackMute = useMC80Store((s) => s.toggleTrackMute)

  if (!track) return null

  const getLedColor = () => {
    if (track.mute) return 'off'
    if (track.hasData) return 'green'
    return 'off'
  }

  return (
    <button
      onClick={() => soloMuteActive ? toggleTrackMute(number) : undefined}
      className={cn(
        'hw-button-led w-10 h-10 text-xs',
        track.mute && 'opacity-50'
      )}
    >
      <LedIndicator color={getLedColor()} />
      <span>{number}</span>
    </button>
  )
}
