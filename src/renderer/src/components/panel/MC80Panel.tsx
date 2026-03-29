import React from 'react'
import { LcdDisplay } from '../lcd/LcdDisplay'
import { ContrastKnob } from '../controls/ContrastKnob'
import { SoftKey } from '../buttons/SoftKey'
import { ModeButton } from '../buttons/ModeButton'
import { CursorButton } from '../buttons/CursorButton'
import { ValueDial } from '../controls/ValueDial'
import { TransportButton } from '../buttons/TransportButton'
import { TrackButton } from '../buttons/TrackButton'
import { SimpleButton } from '../buttons/SimpleButton'
import { useMC80Store } from '../../stores/mc80Store'

export function MC80Panel() {
  const shiftHeld = useMC80Store((s) => s.shiftHeld)
  const setShiftHeld = useMC80Store((s) => s.setShiftHeld)
  const soloMuteActive = useMC80Store((s) => s.soloMuteActive)
  const toggleSoloMute = useMC80Store((s) => s.toggleSoloMute)
  const minusOneActive = useMC80Store((s) => s.minusOneActive)
  const toggleMinusOne = useMC80Store((s) => s.toggleMinusOne)
  const transposeActive = useMC80Store((s) => s.transposeActive)
  const toggleTranspose = useMC80Store((s) => s.toggleTranspose)
  const popScreen = useMC80Store((s) => s.popScreen)

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, #3A3A3A 0%, #2D2D2D 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
        minWidth: '1100px',
      }}
    >
      {/* ZONE 1: LCD + Soft Keys */}
      <div className="flex gap-3 items-start">
        <div className="flex-1 flex flex-col gap-1">
          <div style={{ height: '100px' }}>
            <LcdDisplay />
          </div>
          {/* Soft Keys Row */}
          <div className="flex gap-1">
            {([1, 2, 3, 4, 5, 6] as const).map((i) => (
              <SoftKey key={i} index={i} />
            ))}
          </div>
        </div>
        <ContrastKnob />
      </div>

      {/* ZONE 2+3+4+5: Mode, Navigation, Entry, Transport */}
      <div className="flex gap-3 items-center">
        {/* Zone 2: Mode */}
        <div className="panel-section">
          <div className="section-label">MODE</div>
          <div className="flex flex-col gap-1">
            <ModeButton mode="sequencer" label="SEQUENCER" />
            <ModeButton mode="pattern" label="PATTERN" />
            <ModeButton mode="disk" label="DISK" />
            <ModeButton mode="utility" label="UTILITY" />
          </div>
        </div>

        {/* Zone 3: Navigation */}
        <div className="panel-section">
          <div className="section-label">NAVIGATION</div>
          <div className="flex flex-col items-center gap-1">
            <CursorButton direction="up" />
            <div className="flex gap-1">
              <CursorButton direction="left" />
              <ValueDial onChange={() => {}} />
              <CursorButton direction="right" />
            </div>
            <CursorButton direction="down" />
          </div>
        </div>

        {/* Zone 4: Entry */}
        <div className="panel-section">
          <div className="section-label">ENTRY</div>
          <div className="flex flex-col gap-1 items-center">
            <div className="flex gap-1">
              <SimpleButton label="INC" subLabel="+" />
              <SimpleButton label="DEC" subLabel="-" />
            </div>
            <SimpleButton
              label="SHIFT"
              active={shiftHeld}
              wide
              onMouseDown={() => setShiftHeld(true)}
              onMouseUp={() => setShiftHeld(false)}
              onMouseLeave={() => setShiftHeld(false)}
            />
            <SimpleButton label="ENTER" subLabel="YES" wide onClick={() => {}} />
            <SimpleButton label="EXIT" subLabel="NO" wide onClick={popScreen} />
          </div>
        </div>

        {/* Zone 5: Transport */}
        <div className="panel-section">
          <div className="section-label">TRANSPORT</div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <TransportButton action="top" />
              <TransportButton action="rew" />
              <TransportButton action="ff" />
            </div>
            <div className="flex gap-1">
              <TransportButton action="stop" />
              <TransportButton action="play" />
              <TransportButton action="rec" />
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 6: Track & Performance Controls */}
      <div className="panel-section">
        <div className="section-label">TRACKS &amp; PERFORMANCE</div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Track buttons 1-16 */}
          <div className="flex gap-1">
            {Array.from({ length: 16 }, (_, i) => (
              <TrackButton key={i + 1} number={i + 1} />
            ))}
          </div>

          {/* Performance buttons */}
          <div className="flex gap-1 ml-2 flex-wrap">
            <SimpleButton
              label="SOLO"
              subLabel="MUTE"
              ledColor={soloMuteActive ? 'green' : 'off'}
              active={soloMuteActive}
              onClick={toggleSoloMute}
            />
            <SimpleButton
              label="MINUS"
              subLabel="ONE"
              ledColor={minusOneActive ? 'amber' : 'off'}
              active={minusOneActive}
              onClick={toggleMinusOne}
            />
            <SimpleButton label="MARK" onClick={() => {}} />
            <SimpleButton label="JUMP" onClick={() => {}} />
            <SimpleButton
              label="TRANS"
              subLabel="POSE"
              ledColor={transposeActive ? 'amber' : 'off'}
              active={transposeActive}
              onClick={toggleTranspose}
            />
            <SimpleButton label="FADE" subLabel="OUT" onClick={() => {}} />
            <SimpleButton label="UNDO" subLabel="REDO" onClick={() => {}} />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="flex justify-between items-end">
        <div>
          <div className="text-silk/20 text-[10px] font-silk tracking-widest uppercase">Roland</div>
          <div className="text-silk/60 text-sm font-silk font-bold tracking-widest">MC-80</div>
          <div className="text-silk/30 text-[9px] font-silk tracking-wide">MicroComposer</div>
        </div>
        <div className="text-silk/20 text-[8px] font-silk tracking-widest">VIRTUAL EMULATOR</div>
      </div>
    </div>
  )
}
