'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { people as initialPeople, Person, Assignment } from '@/data/people'
import { projects as initialProjects } from '@/data/projects'

// ── Dialog draft types ──────────────────────────────────────────────────────────

export interface TimelineDraft {
  personId:  string
  projectId: string
  startDate: string
  endDate:   string
}

/** PersonDialog draft: all assignments for a person, as the user has edited them */
export interface PersonDialogDraftItem { projectId: string; assignment: Assignment }
/** ProjectDialog draft: all people assigned to a project, as the user has edited them */
export interface ProjectDialogDraftItem { personId: string; assignment: Assignment }

export interface DialogDraftRecord<T> {
  draft:     T[]
  committed: T[]
}

// ── Store context ───────────────────────────────────────────────────────────────

interface StoreContextValue {
  people:   Person[]
  projects: typeof initialProjects
  theme:    'light' | 'dark'
  toggleTheme: () => void
  addAssignment:    (personId: string, assignment: Assignment) => void
  removeAssignment: (personId: string, projectId: string) => void
  updateAssignment: (personId: string, projectId: string, updates: Partial<Assignment>) => void
  // Timeline bar drag drafts
  timelineDrafts:             Map<string, TimelineDraft>
  recordTimelineDraft:        (personId: string, projectId: string, startDate: string, endDate: string) => void
  applyTimelineDrafts:        () => void
  discardTimelineDrafts:      () => void
  clearProjectTimelineDrafts: (projectId: string) => void
  clearPersonTimelineDrafts:  (personId: string) => void
  // Dialog draft parking (for cross-dialog navigation)
  personDialogDrafts:   Map<string, DialogDraftRecord<PersonDialogDraftItem>>
  projectDialogDrafts:  Map<string, DialogDraftRecord<ProjectDialogDraftItem>>
  setPersonDialogDraft:  (personId:  string, record: DialogDraftRecord<PersonDialogDraftItem>) => void
  setProjectDialogDraft: (projectId: string, record: DialogDraftRecord<ProjectDialogDraftItem>) => void
  clearPersonDialogDraft:  (personId:  string) => void
  clearProjectDialogDraft: (projectId: string) => void
  /** Apply ALL pending dialog + timeline drafts to the store and clear them. */
  applyAllDialogDrafts:   () => void
  /** Discard ALL pending dialog + timeline drafts. */
  discardAllDialogDrafts: () => void
  /** Count of distinct person/project dialogs with unsaved changes. */
  pendingChangeCount: () => number
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [people, setPeople]   = useState<Person[]>(initialPeople)
  const [projects]            = useState(initialProjects)
  const [theme, setTheme]     = useState<'light' | 'dark'>('light')
  const [timelineDrafts,    setTimelineDrafts]    = useState<Map<string, TimelineDraft>>(new Map())
  const [personDialogDrafts,  setPersonDialogDrafts]  = useState<Map<string, DialogDraftRecord<PersonDialogDraftItem>>>(new Map())
  const [projectDialogDrafts, setProjectDialogDrafts] = useState<Map<string, DialogDraftRecord<ProjectDialogDraftItem>>>(new Map())

  // ── Theme ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (stored) setTheme(stored)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])
  function toggleTheme() { setTheme(t => t === 'light' ? 'dark' : 'light') }

  // ── Assignment CRUD ───────────────────────────────────────────────────────
  function addAssignment(personId: string, assignment: Assignment) {
    setPeople(prev => prev.map(p =>
      p.id === personId ? { ...p, assignments: [...p.assignments, assignment] } : p
    ))
  }
  function removeAssignment(personId: string, projectId: string) {
    setPeople(prev => prev.map(p =>
      p.id === personId ? { ...p, assignments: p.assignments.filter(a => a.projectId !== projectId) } : p
    ))
  }
  function updateAssignment(personId: string, projectId: string, updates: Partial<Assignment>) {
    setPeople(prev => prev.map(p =>
      p.id === personId
        ? { ...p, assignments: p.assignments.map(a => a.projectId === projectId ? { ...a, ...updates } : a) }
        : p
    ))
  }

  // ── Timeline drafts ───────────────────────────────────────────────────────
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
      for (const key of next.keys()) if (key.endsWith(`:${projectId}`)) next.delete(key)
      return next
    })
  }
  function clearPersonTimelineDrafts(personId: string) {
    setTimelineDrafts(prev => {
      const next = new Map(prev)
      for (const key of next.keys()) if (key.startsWith(`${personId}:`)) next.delete(key)
      return next
    })
  }

  // ── Dialog draft parking ─────────────────────────────────────────────────
  function setPersonDialogDraft(personId: string, record: DialogDraftRecord<PersonDialogDraftItem>) {
    setPersonDialogDrafts(prev => { const n = new Map(prev); n.set(personId, record); return n })
  }
  function setProjectDialogDraft(projectId: string, record: DialogDraftRecord<ProjectDialogDraftItem>) {
    setProjectDialogDrafts(prev => { const n = new Map(prev); n.set(projectId, record); return n })
  }
  function clearPersonDialogDraft(personId: string) {
    setPersonDialogDrafts(prev => { const n = new Map(prev); n.delete(personId); return n })
  }
  function clearProjectDialogDraft(projectId: string) {
    setProjectDialogDrafts(prev => { const n = new Map(prev); n.delete(projectId); return n })
  }

  function applyAllDialogDrafts() {
    // Apply person dialog drafts (authoritative for that person's full assignment list)
    personDialogDrafts.forEach(({ draft, committed }, personId) => {
      // Remove assignments dropped in the dialog
      for (const c of committed)
        if (!draft.some(d => d.projectId === c.projectId)) removeAssignment(personId, c.projectId)
      // Add / update assignments
      for (const d of draft) {
        const c = committed.find(x => x.projectId === d.projectId)
        if (!c) addAssignment(personId, d.assignment)
        else if (JSON.stringify(c.assignment) !== JSON.stringify(d.assignment))
          updateAssignment(personId, d.projectId, d.assignment)
      }
    })

    // Apply project dialog drafts — skip persons already covered by person drafts
    projectDialogDrafts.forEach(({ draft, committed }, projectId) => {
      for (const c of committed) {
        if (personDialogDrafts.has(c.personId)) continue
        if (!draft.some(d => d.personId === c.personId)) removeAssignment(c.personId, projectId)
      }
      for (const d of draft) {
        if (personDialogDrafts.has(d.personId)) continue
        const c = committed.find(x => x.personId === d.personId)
        if (!c) addAssignment(d.personId, d.assignment)
        else if (JSON.stringify(c.assignment) !== JSON.stringify(d.assignment))
          updateAssignment(d.personId, projectId, d.assignment)
      }
    })

    // Apply timeline drafts
    timelineDrafts.forEach(({ personId, projectId, startDate, endDate }) => {
      updateAssignment(personId, projectId, { startDate, endDate })
    })

    setPersonDialogDrafts(new Map())
    setProjectDialogDrafts(new Map())
    setTimelineDrafts(new Map())
  }

  function discardAllDialogDrafts() {
    setPersonDialogDrafts(new Map())
    setProjectDialogDrafts(new Map())
    setTimelineDrafts(new Map())
  }

  function pendingChangeCount(): number {
    let n = 0
    personDialogDrafts.forEach(({ draft, committed }) => {
      if (JSON.stringify(draft) !== JSON.stringify(committed)) n++
    })
    projectDialogDrafts.forEach(({ draft, committed }, projectId) => {
      if (personDialogDrafts.has(projectId)) return // deduplicate
      if (JSON.stringify(draft) !== JSON.stringify(committed)) n++
    })
    if (timelineDrafts.size > 0) n++
    return n
  }

  return (
    <StoreContext.Provider value={{
      people, projects, theme, toggleTheme,
      addAssignment, removeAssignment, updateAssignment,
      timelineDrafts, recordTimelineDraft, applyTimelineDrafts, discardTimelineDrafts,
      clearProjectTimelineDrafts, clearPersonTimelineDrafts,
      personDialogDrafts, projectDialogDrafts,
      setPersonDialogDraft, setProjectDialogDraft,
      clearPersonDialogDraft, clearProjectDialogDraft,
      applyAllDialogDrafts, discardAllDialogDrafts, pendingChangeCount,
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
