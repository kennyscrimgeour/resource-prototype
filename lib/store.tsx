'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { people as initialPeople, Person, Assignment } from '@/data/people'
import { projects as initialProjects, Project } from '@/data/projects'

interface StoreContextValue {
  people: Person[]
  projects: Project[]
  theme: 'light' | 'dark'
  toggleTheme: () => void
  addAssignment: (personId: string, assignment: Assignment) => void
  removeAssignment: (personId: string, projectId: string) => void
  updateAssignment: (personId: string, projectId: string, updates: Partial<Assignment>) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>(initialPeople)
  const [projects]          = useState<Project[]>(initialProjects)
  const [theme, setTheme]   = useState<'light' | 'dark'>('light')

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

  return (
    <StoreContext.Provider value={{ people, projects, theme, toggleTheme, addAssignment, removeAssignment, updateAssignment }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
