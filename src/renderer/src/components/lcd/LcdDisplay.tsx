import React from 'react'
import { useMC80Store } from '../../stores/mc80Store'

export function LcdDisplay() {
  const playback = useMC80Store((s) => s.playback)
  const currentScreen = useMC80Store((s) => s.currentScreen)
  const tracks = useMC80Store((s) => s.tracks)
  const lcdContrast = useMC80Store((s) => s.lcdContrast)

  const opacity = lcdContrast / 100

  const formatPosition = () => {
    const m = String(playback.currentMeasure).padStart(3, ' ')
    const b = playback.currentBeat
    return `${m}:${b}:  0`
  }

  const formatTempo = () => {
    return playback.tempo.toFixed(1)
  }

  const renderScreen = () => {
    if (currentScreen === 'song_play') {
      return (
        <div className="p-2 font-lcd text-sm" style={{ opacity }}>
          <div className="flex justify-between text-lcd-text mb-1">
            <span>&#9834;={formatTempo()}</span>
            <span className="text-lcd-amber">{playback.isPlaying ? '&#9654; PLAY' : playback.recArmed ? '&#9679; ARM' : '&#9632; STOP'}</span>
          </div>
          <div className="text-lcd-text text-lg tracking-widest text-center mb-1">
            {formatPosition()}
          </div>
          <div className="flex gap-1 flex-wrap mt-1">
            {tracks.map((t) => (
              <span
                key={t.number}
                className={`text-[9px] w-4 text-center ${t.hasData ? 'text-lcd-text' : 'text-lcd-dim'} ${t.mute ? 'line-through' : ''}`}
              >
                {t.number}
              </span>
            ))}
          </div>
        </div>
      )
    }

    if (currentScreen === 'track_status') {
      return (
        <div className="p-2 font-lcd text-xs" style={{ opacity }}>
          <div className="text-lcd-amber mb-1">TRACK STATUS</div>
          {tracks.slice(0, 8).map((t) => (
            <div key={t.number} className="flex gap-2 text-lcd-text text-[10px]">
              <span className="w-4">{t.number}</span>
              <span className="w-16">{t.name || `TRACK${t.number}`}</span>
              <span className="w-8">CH{t.midiChannel}</span>
              <span>{t.mute ? 'MUTE' : '    '}</span>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="p-2 font-lcd text-sm text-lcd-text" style={{ opacity }}>
        <div className="text-lcd-amber">{currentScreen.toUpperCase().replace('_', ' ')}</div>
        <div className="text-lcd-dim text-xs mt-2">&#8212; Screen content &#8212;</div>
      </div>
    )
  }

  return (
    <div
      className="lcd-screen w-full h-full rounded border border-black/60 overflow-hidden relative"
      style={{ minHeight: '96px' }}
    >
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        }}
      />
      {renderScreen()}
    </div>
  )
}
