'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Project } from '@/data/projects'
import Avatar from '@/components/ui/Avatar'

interface AddResourcePopupProps {
  project: Project
  onClose: () => void
}

export default function AddResourcePopup({ project, onClose }: AddResourcePopupProps) {
  const { people, addAssignment } = useStore()
  const [search,        setSearch]        = useState('')
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [startDate,     setStartDate]     = useState(project.startDate)
  const [endDate,       setEndDate]       = useState(project.endDate)
  const [allocationPct, setAllocationPct] = useState(100)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const available = people.filter(p => {
    if (p.assignments.some(a => a.projectId === project.id)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
  })

  const selectedPerson = people.find(p => p.id === selectedId)

  function handleConfirm() {
    if (!selectedId) return
    addAssignment(selectedId, { projectId: project.id, startDate, endDate, allocationPct })
    onClose()
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed', zIndex: 61,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 440,
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add Resource</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{project.name}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-primary)',
              backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!selectedId ? (
            <>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or role…"
                style={{
                  width: '100%', height: 36, borderRadius: 8,
                  border: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  padding: '0 12px', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {available.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 4px' }}>
                    No available people found.
                  </p>
                )}
                {available.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      border: '1px solid transparent',
                      backgroundColor: 'transparent',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Avatar initials={p.initials} size="xs" colorIndex={p.colorIndex ?? 0} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{p.role}</p>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {p.utilizationPct}% util
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Back + selected person */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setSelectedId(null)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-primary)',
                    backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >←</button>
                {selectedPerson && (
                  <>
                    <Avatar initials={selectedPerson.initials} size="xs" colorIndex={selectedPerson.colorIndex ?? 0} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{selectedPerson.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{selectedPerson.role}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Start date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{
                      height: 36, borderRadius: 8, border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                      padding: '0 12px', fontSize: 13, outline: 'none', width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>End date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={{
                      height: 36, borderRadius: 8, border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                      padding: '0 12px', fontSize: 13, outline: 'none', width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Allocation %</span>
                  <input
                    type="number"
                    min={10} max={200} step={5}
                    value={allocationPct}
                    onChange={e => setAllocationPct(Number(e.target.value))}
                    style={{
                      height: 36, borderRadius: 8, border: '1px solid var(--border-primary)',
                      backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                      padding: '0 12px', fontSize: 13, outline: 'none', width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </label>
              </div>

              <button
                onClick={handleConfirm}
                style={{
                  height: 40, borderRadius: 8, border: 'none',
                  backgroundColor: '#06b6d4', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                Add to Project
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
