import React, { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'
import { LedIndicator } from '../controls/LedIndicator'

interface SimpleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  subLabel?: string
  ledColor?: 'green' | 'amber' | 'red' | 'off' | null
  wide?: boolean
  active?: boolean
}

export function SimpleButton({ label, subLabel, ledColor, wide, active, className, ...props }: SimpleButtonProps) {
  return (
    <button
      className={cn(
        'hw-button py-2 px-2 flex flex-col items-center gap-1 text-[10px]',
        wide ? 'min-w-[60px]' : 'min-w-[44px]',
        active && 'shadow-button-down translate-y-px',
        className
      )}
      {...props}
    >
      {ledColor != null && <LedIndicator color={ledColor} />}
      <span>{label}</span>
      {subLabel && <span className="text-silk/60 text-[8px]">{subLabel}</span>}
    </button>
  )
}
