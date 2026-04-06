'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type NavEntry = { type: 'project'; id: string } | { type: 'person'; id: string }

interface DialogNavCtx {
  stack:     NavEntry[]
  current:   NavEntry | null
  canGoBack: boolean
  /** Start a fresh stack (called from pages) */
  open:  (entry: NavEntry) => void
  /** Drill down within a dialog */
  push:  (entry: NavEntry) => void
  /** Go back one level */
  pop:   () => void
  /** Close entirely */
  close: () => void
}

const Ctx = createContext<DialogNavCtx | null>(null)

export function DialogNavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<NavEntry[]>([])

  const current   = stack.length > 0 ? stack[stack.length - 1] : null
  const canGoBack = stack.length > 1

  function open(entry: NavEntry)  { setStack([entry]) }
  function push(entry: NavEntry)  { setStack(prev => [...prev, entry]) }
  function pop()                  { setStack(prev => prev.length <= 1 ? [] : prev.slice(0, -1)) }
  function close()                { setStack([]) }

  return (
    <Ctx.Provider value={{ stack, current, canGoBack, open, push, pop, close }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDialogNav() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDialogNav must be used within DialogNavProvider')
  return ctx
}
