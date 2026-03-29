import React, { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface ButtonBaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean
  className?: string
  children: React.ReactNode
}

export function ButtonBase({ pressed, className, children, ...props }: ButtonBaseProps) {
  return (
    <button
      className={cn(
        'hw-button',
        pressed && 'shadow-button-down translate-y-px',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
