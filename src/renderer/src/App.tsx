import React from 'react'
import { MC80Panel } from './components/panel/MC80Panel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App() {
  useKeyboardShortcuts()

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <MC80Panel />
    </div>
  )
}
