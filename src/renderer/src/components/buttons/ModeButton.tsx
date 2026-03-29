import React from 'react'
import { useMC80Store, Mode } from '../../stores/mc80Store'
import { LedIndicator } from '../controls/LedIndicator'
import { cn } from '../../utils/cn'

interface ModeButtonProps {
  mode: Mode
  label: string
}

export function ModeButton({ mode, label }: ModeButtonProps) {
  const currentMode = useMC80Store((s) => s.mode)
  const setMode = useMC80Store((s) => s.setMode)
  const active = currentMode === mode

  return (
    <button
      onClick={() => setMode(mode)}
      className={cn(
        'hw-button-led px-3 py-2 min-w-[70px]',
        active && 'shadow-button-down translate-y-px'
      )}
    >
      <LedIndicator color={active ? 'green' : 'off'} />
      <span className="text-[10px]">{label}</span>
    </button>
  )
}
