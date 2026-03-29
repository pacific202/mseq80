import React from 'react'
import { cn } from '../../utils/cn'

type LedColor = 'green' | 'amber' | 'red' | 'off'

interface LedIndicatorProps {
  color?: LedColor
  size?: 'sm' | 'md'
}

export function LedIndicator({ color = 'off', size = 'sm' }: LedIndicatorProps) {
  return (
    <div
      className={cn(
        'rounded-full',
        size === 'sm' ? 'w-2 h-2' : 'w-3 h-3',
        color === 'off' && 'bg-led-off',
        color === 'green' && 'bg-led-green shadow-led-green',
        color === 'amber' && 'bg-led-amber shadow-led-amber',
        color === 'red' && 'bg-led-red shadow-led-red',
      )}
    />
  )
}
