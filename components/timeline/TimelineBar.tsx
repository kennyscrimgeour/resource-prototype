'use client'

import { useState, useRef, useEffect } from 'react'
import { businessDaysBetween } from '@/lib/budget'

interface TimelineBarProps {
  color:          string
  width:          number
  // Drag/cost props — optional; omitting disables drag
  dayRate?:       number
  allocationPct?: number
  startCol?:      number
  endCol?:        number
  colWidth?:      number
  weeks?:         Date[]
  /** Column index of today — used to lock left handle + Stone Rule for move */
  todayCol?:      number
  onResizeEnd?:   (newStartISO: string, newEndISO: string) => void
  onBarClick?:    () => void
}

function colToISO(weeks: Date[], col: number): string {
  const d = weeks[Math.max(0, Math.min(col, weeks.length - 1))]
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtShortDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function computeCost(startISO: string, endISO: string, dayRate: number, allocationPct: number): number {
  const start = new Date(startISO)
  const end   = new Date(endISO)
  end.setDate(end.getDate() + 1)
  return Math.round(dayRate * (allocationPct / 100) * businessDaysBetween(start, end))
}

export default function TimelineBar({
  color, width,
  dayRate, allocationPct, startCol, endCol, colWidth, weeks, todayCol,
  onResizeEnd, onBarClick,
}: TimelineBarProps) {
  const [liveMarginLeft, setLiveMarginLeft] = useState(0)
  const [liveWidth,      setLiveWidth]      = useState(width)
  const [liveEndCol,     setLiveEndCol]     = useState(endCol ?? 0)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cost: number; range: string } | null>(null)

  const dragRef = useRef<{
    handle:         'left' | 'right' | 'move'
    startX:         number
    baseMarginLeft: number
    baseWidth:      number
    baseStartCol:   number
    baseEndCol:     number
  } | null>(null)

  const clickBlockRef   = useRef(false)
  const onResizeEndRef  = useRef(onResizeEnd)
  useEffect(() => { onResizeEndRef.current = onResizeEnd }, [onResizeEnd])

  // Sync when parent updates after store/draft commit
  useEffect(() => {
    setLiveWidth(width)
    setLiveMarginLeft(0)
    setLiveEndCol(endCol ?? 0)
  }, [width, endCol])

  const isDraggable = startCol != null && endCol != null && colWidth != null && weeks != null

  // Stone Rule: left handle (and move) locked when bar started before today's week
  const leftLocked = (startCol != null && todayCol != null) ? startCol < todayCol : false

  function handleMouseDown(handle: 'left' | 'right' | 'move', e: React.MouseEvent) {
    if (handle === 'left' && leftLocked) return   // Stone Rule
    if (handle === 'move' && leftLocked) return   // Stone Rule
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
    const sc = startCol ?? 0
    const ec = endCol   ?? 0
    const cw = colWidth ?? 1
    const wk = weeks    ?? []
    const tc = todayCol ?? 0

    function clampCols(drag: NonNullable<typeof dragRef.current>, dcols: number) {
      if (drag.handle === 'left') {
        const clamped = Math.max(0, Math.min(drag.baseStartCol + dcols, tc, drag.baseEndCol - 1))
        return { newStartCol: clamped, newEndCol: drag.baseEndCol }
      } else if (drag.handle === 'right') {
        const clamped = Math.max(tc, Math.min(drag.baseEndCol + dcols, wk.length - 1))
        return { newStartCol: drag.baseStartCol, newEndCol: Math.max(clamped, drag.baseStartCol + 1) }
      } else {
        // move: shift both equally, floor start at today
        const barLen   = drag.baseEndCol - drag.baseStartCol
        const newStart = Math.max(tc, Math.min(drag.baseStartCol + dcols, wk.length - 1 - barLen))
        return { newStartCol: newStart, newEndCol: newStart + barLen }
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
      } else if (drag.handle === 'right') {
        newWidth = drag.baseWidth + (newEndCol - drag.baseEndCol) * cw
      } else {
        // move: margin shifts, width unchanged
        const delta = newStartCol - drag.baseStartCol
        newMargin   = drag.baseMarginLeft + delta * cw
      }

      setLiveMarginLeft(newMargin)
      setLiveWidth(Math.max(8, newWidth))
      setLiveEndCol(newEndCol)

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

  // Right bookend: end date (live during drag)
  const endDateLabel = (weeks && liveEndCol != null && weeks[liveEndCol])
    ? fmtShortDate(weeks[Math.max(0, Math.min(liveEndCol, weeks.length - 1))])
    : null

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
          overflow:        'hidden',
        }}
        onClick={() => { if (!clickBlockRef.current) onBarClick?.() }}
      >
        {/* Left resize handle — hidden when locked */}
        {isDraggable && !leftLocked && (
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={e => handleMouseDown('left', e)}
          >
            <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          </div>
        )}

        {/* Move handle — center strip, blocked by Stone Rule */}
        {isDraggable && !leftLocked && (
          <div
            style={{ position: 'absolute', left: 8, right: 8, top: 0, bottom: 0, cursor: 'grab', zIndex: 2 }}
            onMouseDown={e => handleMouseDown('move', e)}
          />
        )}

        {/* Right bookend — end date */}
        {endDateLabel && liveWidth >= 40 && (
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
            whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: 1, zIndex: 3,
          }}>
            {endDateLabel}
          </span>
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
