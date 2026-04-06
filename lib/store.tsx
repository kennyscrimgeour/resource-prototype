'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { people as initialPeople, Person, Assignment } from '@/data/people'
import { projects as initialProjects, Project } from '@/data/projects'

/** Keyed by `${personId}:${projectId}` — pending timeline bar drags not yet applied */
export interface TimelineDraft {
  personId:  string
  projectId: string
  startDate: string
  endDate:   string
}

interface StoreContextValue {
  people: Person[]
  projects: Project[]
  theme: 'light' | 'dark'
  toggleTheme: () => void
  addAssignment: (personId: string, assignment: Assignment) => void
  removeAssignment: (personId: string, projectId: string) => void
  updateAssignment: (personId: string, projectId: string, updates: Partial<Assignment>) => void
  /** Timeline bar drag drafts — shared so ProjectDialog can reflect them */
  timelineDrafts: Map<string, TimelineDraft>
  recordTimelineDraft: (personId: string, projectId: string, startDate: string, endDate: string) => void
  applyTimelineDrafts: () => void
  discardTimelineDrafts: () => void
  clearProjectTimelineDrafts: (projectId: string) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [people, setPeople]           = useState<Person[]>(initialPeople)
  const [projects]                    = useState<Project[]>(initialProjects)
  const [theme, setTheme]             = useState<'light' | 'dark'>('light')
  const [timelineDrafts, setTimelineDrafts] = useState<Map<string, TimelineDraft>>(new Map())

  // Persist + apply theme
  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (stored) setTheme(stored)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  function addAssignment(personId: string, assignment: Assignment) {
    setPeople(prev => prev.map(p =>
      p.id === personId
        ? { ...p, assignments: [...p.assignments, assignment] }
        : p
    ))
  }

  function removeAssignment(personId: string, projectId: string) {
    setPeople(prev => prev.map(p =>
      p.id === personId
        ? { ...p, assignments: p.assignments.filter(a => a.projectId !== projectId) }
        : p
    ))
  }

  function updateAssignment(personId: string, projectId: string, updates: Partial<Assignment>) {
    setPeople(prev => prev.map(p =>
      p.id === personId
        ? { ...p, assignments: p.assignments.map(a => a.projectId === projectId ? { ...a, ...updates } : a) }
        : p
    ))
  }

  function recordTimelineDraft(personId: string, projectId: string, startDate: string, endDate: string) {
    setTimelineDrafts(prev => {
      const next = new Map(prev)
      next.set(`${personId}:${projectId}`, { personId, projectId, startDate, endDate })
      return next
    })
  }

  function applyTimelineDrafts() {
    timelineDrafts.forEach(({ personId, projectId, startDate, endDate }) => {
      updateAssignment(personId, projectId, { startDate, endDate })
    })
    setTimelineDrafts(new Map())
  }

  function discardTimelineDrafts() { setTimelineDrafts(new Map()) }

  function clearProjectTimelineDrafts(projectId: string) {
    setTimelineDrafts(prev => {
      const next = new Map(prev)
      for (const key of next.keys()) {
        if (key.endsWith(`:${projectId}`)) next.delete(key)
      }
      return next
    })
  }

  return (
    <StoreContext.Provider value={{
      people, projects, theme, toggleTheme,
      addAssignment, removeAssignment, updateAssignment,
      timelineDrafts, recordTimelineDraft, applyTimelineDrafts, discardTimelineDrafts, clearProjectTimelineDrafts,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
