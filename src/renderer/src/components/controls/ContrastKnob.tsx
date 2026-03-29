import React from 'react'
import { useMC80Store } from '../../stores/mc80Store'
import { ValueDial } from './ValueDial'

export function ContrastKnob() {
  const lcdContrast = useMC80Store((s) => s.lcdContrast)
  const setLcdContrast = useMC80Store((s) => s.setLcdContrast)

  return (
    <div className="flex flex-col items-center gap-1">
      <ValueDial
        value={lcdContrast}
        onChange={(delta) => setLcdContrast(Math.max(20, Math.min(100, lcdContrast + delta)))}
        className="w-10 h-10"
      />
      <span className="text-silk/40 text-[8px] font-silk uppercase">CONTRAST</span>
    </div>
  )
}
