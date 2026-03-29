import React from 'react'
import { useMC80Store } from '../../stores/mc80Store'
import { cn } from '../../utils/cn'

interface SoftKeyProps {
  index: 1 | 2 | 3 | 4 | 5 | 6
  onClick?: () => void
}

export function SoftKey({ index, onClick }: SoftKeyProps) {
  const label = useMC80Store((s) => s.softKeyLabels[index - 1])
  return (
    <button
      onClick={onClick}
      className={cn(
        'hw-button px-2 py-1.5 flex-1 text-center',
        'min-w-[50px] text-[10px]'
      )}
    >
      {label || ''}
    </button>
  )
}
