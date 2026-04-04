'use client'

import { useState, useRef, useEffect } from 'react'
import { businessDaysBetween } from '@/lib/budget'

interface TimelineBarProps {
  projectName:  string
  client:       string
  color:        string
  width:        number
  // Drag/cost props — optional; omitting disables drag
  dayRate?:     number
  allocationPct?: number
  startCol?:    number
  endCol?:      number
  colWidth?:    number
  weeks?:       Date[]
  /** Column index of today — used to lock left handle + dim past portion */
  todayCol?:    number
  onResizeEnd?: (newStartISO: string, newEndISO: string) => void
  onBarClick?:  () => void
}

function colToISO(weeks: Date[], col: number): string {
  const d = weeks[Math.max(0, Math.min(col, weeks.length - 1))]
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeCost(startISO: string, endISO: string, dayRate: number, allocationPct: number): number {
  const start = new Date(startISO)
  const end   = new Date(endISO)
  end.setDate(end.getDate() + 1)          // make interval inclusive
  const bDays = businessDaysBetween(start, end)
  return Math.round(dayRate * (allocationPct / 100) * bDays)
}

export default function TimelineBar({
  projectName, client, color, width,
  dayRate, allocationPct, startCol, endCol, colWidth, weeks, todayCol,
  onResizeEnd, onBarClick,
}: TimelineBarProps) {
  const [liveMarginLeft, setLiveMarginLeft] = useState(0)
  const [liveWidth,      setLiveWidth]      = useState(width)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cost: number; range: string } | null>(null)

  const dragRef = useRef<{
    handle:         'left' | 'right'
    startX:         number
    baseMarginLeft: number
    baseWidth:      number
    baseStartCol:   number
    baseEndCol:     number
  } | null>(null)
  const clickBlockRef   = useRef(false)
  const onResizeEndRef  = useRef(onResizeEnd)
  useEffect(() => { onResizeEndRef.current = onResizeEnd }, [onResizeEnd])

  // Sync when parent updates after store commit
  useEffect(() => {
    setLiveWidth(width)
    setLiveMarginLeft(0)
  }, [width])

  const isDraggable = startCol != null && endCol != null && colWidth != null && weeks != null

  // Stone Rule: left handle locked when bar started before today
  const spanCols      = (endCol != null && startCol != null) ? (endCol - startCol + 1) : 1
  const pastCols      = (todayCol != null && startCol != null) ? Math.max(0, Math.min(todayCol - startCol, spanCols)) : 0
  const pastFraction  = spanCols > 0 ? pastCols / spanCols : 0
  const leftLocked    = pastFraction > 0

  function handleMouseDown(handle: 'left' | 'right', e: React.MouseEvent) {
    if (handle === 'left' && leftLocked) return   // Stone Rule
    e.preventDefault()
    e.stopPropagation()
    clickBlockRef.current = true
    dragRef.current = {
      handle,
      startX:         e.clientX,
      baseMarginLeft: liveMarginLeft,
      baseWidth:      liveWidth,
      baseStartCol:   startCol!,
      baseEndCol:     endCol!,
    }
  }

  useEffect(() => {
    // Resolve cols from closed-over props — stable for the lifetime of this effect
    const sc = startCol ?? 0
    const ec = endCol   ?? 0
    const cw = colWidth ?? 1
    const wk = weeks    ?? []
    const tc = todayCol ?? 0

    /** Single source of truth for both move and up */
    function clampCols(drag: NonNullable<typeof dragRef.current>, dcols: number) {
      if (drag.handle === 'left') {
        // Left handle: cannot go before start-of-grid (0) AND cannot snap past today
        const clamped = Math.max(0, Math.min(drag.baseStartCol + dcols, tc, drag.baseEndCol - 1))
        return { newStartCol: clamped, newEndCol: drag.baseEndCol }
      } else {
        // Right handle: cannot go before today AND cannot exceed last column
        const clamped = Math.max(tc, Math.min(drag.baseEndCol + dcols, wk.length - 1))
        return { newStartCol: drag.baseStartCol, newEndCol: Math.max(clamped, drag.baseStartCol + 1) }
      }
    }

    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current
      if (!drag) return

      const dcols = Math.round((e.clientX - drag.startX) / cw)
      const { newStartCol, newEndCol } = clampCols(drag, dcols)

      let newMargin = drag.baseMarginLeft
      let newWidth  = drag.baseWidth

      if (drag.handle === 'left') {
        const delta = newStartCol - drag.baseStartCol
        newMargin   = drag.baseMarginLeft + delta * cw
        newWidth    = drag.baseWidth      - delta * cw
      } else {
        newWidth = drag.baseWidth + (newEndCol - drag.baseEndCol) * cw
      }

      setLiveMarginLeft(newMargin)
      setLiveWidth(Math.max(8, newWidth))

      if (dayRate && allocationPct) {
        const startISO = colToISO(wk, newStartCol)
        const endISO   = colToISO(wk, newEndCol)
        const cost     = computeCost(startISO, endISO, dayRate, allocationPct)
        setTooltip({ x: e.clientX, y: e.clientY, cost, range: `${startISO} → ${endISO}` })
      }
    }

    function onMouseUp(e: MouseEvent) {
      const drag = dragRef.current
      if (!drag) { dragRef.current = null; return }

      const dcols = Math.round((e.clientX - drag.startX) / cw)
      const { newStartCol, newEndCol } = clampCols(drag, dcols)

      onResizeEndRef.current?.(colToISO(wk, newStartCol), colToISO(wk, newEndCol))
      dragRef.current = null
      setTooltip(null)
      setTimeout(() => { clickBlockRef.current = false }, 0)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [startCol, endCol, colWidth, weeks, todayCol, dayRate, allocationPct])

  const showName   = liveWidth >= 52
  const showClient = liveWidth >= 140

  return (
    <>
      <div
        style={{
          width:           liveWidth,
          marginLeft:      liveMarginLeft,
          height:          28,
          borderRadius:    4,
          backgroundColor: color,
          position:        'relative',
          flexShrink:      0,
          cursor:          isDraggable ? 'pointer' : 'default',
          userSelect:      'none',
        }}
        onClick={() => { if (!clickBlockRef.current) onBarClick?.() }}
      >
        {/* Past-dim overlay (Stone Rule) */}
        {pastFraction > 0 && (
          <div
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${pastFraction * 100}%`,
              backgroundColor: 'rgba(0,0,0,0.28)',
              borderRadius: '4px 0 0 4px',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />
        )}

        {/* Left resize handle — hidden when locked */}
        {isDraggable && !leftLocked && (
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={e => handleMouseDown('left', e)}
          >
            <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          </div>
        )}

        {/* Label — overflow clipped within the bar */}
        {showName && (
          <div style={{ position: 'absolute', left: isDraggable ? 14 : 8, right: isDraggable ? 14 : 4, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
              {projectName}
            </span>
            {showClient && (
              <span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {client}
              </span>
            )}
          </div>
        )}

        {/* Right resize handle */}
        {isDraggable && (
          <div
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={e => handleMouseDown('right', e)}
          >
            <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          </div>
        )}
      </div>

      {/* Fixed-position drag tooltip */}
      {tooltip && (
        <div
          style={{
            position:        'fixed',
            left:            tooltip.x + 14,
            top:             tooltip.y - 70,
            zIndex:          9999,
            backgroundColor: 'var(--sidebar-bg)',
            color:           'var(--sidebar-text)',
            borderRadius:    8,
            padding:         '8px 12px',
            fontSize:        11,
            pointerEvents:   'none',
            boxShadow:       '0 4px 16px rgba(0,0,0,0.25)',
            whiteSpace:      'nowrap',
            display:         'flex',
            flexDirection:   'column',
            gap:             3,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.6 }}>Total Cost</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>£{tooltip.cost.toLocaleString()}</span>
          <span style={{ fontSize: 10, opacity: 0.55 }}>{tooltip.range}</span>
        </div>
      )}
    </>
  )
}
