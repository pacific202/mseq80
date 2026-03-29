import React, { useRef, useCallback } from 'react'
import { cn } from '../../utils/cn'

interface ValueDialProps {
  value?: number
  onChange?: (delta: number) => void
  className?: string
}

export function ValueDial({ value = 0, onChange, className }: ValueDialProps) {
  const lastY = useRef<number | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    lastY.current = e.clientY
    const handleMouseMove = (e: MouseEvent) => {
      if (lastY.current === null) return
      const delta = lastY.current - e.clientY
      if (Math.abs(delta) >= 2) {
        onChange?.(Math.sign(delta) * (Math.abs(delta) > 10 ? 10 : 1))
        lastY.current = e.clientY
      }
    }
    const handleMouseUp = () => {
      lastY.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [onChange])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -1 : 1
    onChange?.(e.shiftKey ? delta * 10 : delta)
  }, [onChange])

  const rotation = (value % 360) * 2

  return (
    <div
      className={cn(
        'w-14 h-14 rounded-full bg-panel-light border-2 border-black/40 cursor-ns-resize',
        'flex items-center justify-center relative select-none',
        'shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]',
        className
      )}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      <div
        className="absolute w-0.5 h-5 bg-silk/80 rounded-full top-1 left-1/2 -translate-x-1/2 origin-bottom"
        style={{ transform: `translateX(-50%) rotate(${rotation}deg)`, transformOrigin: '50% 100%' }}
      />
      <span className="text-silk/50 text-[8px] mt-6 font-silk uppercase">VALUE</span>
    </div>
  )
}
