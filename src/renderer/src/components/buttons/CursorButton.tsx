import React from 'react'

type Direction = 'up' | 'down' | 'left' | 'right'

const ARROWS: Record<Direction, string> = {
  up: '▲',
  down: '▼',
  left: '◄',
  right: '►',
}

interface CursorButtonProps {
  direction: Direction
  onPress?: () => void
}

export function CursorButton({ direction, onPress }: CursorButtonProps) {
  return (
    <button
      onClick={onPress}
      className="hw-button w-9 h-9 flex items-center justify-center text-base"
    >
      {ARROWS[direction]}
    </button>
  )
}
