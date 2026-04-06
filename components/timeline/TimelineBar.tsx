'use client'

import { useState, useRef, useEffect } from 'react'
import { businessDaysBetween } from '@/lib/budget'
import { STUB_WIDTH } from '@/components/timeline/TimelineStub'

interface TimelineBarProps {
  projectName:    string
  client:         string
  color:          string
  width:          number
  dayRate:        number
  allocationPct?: number
  startCol?:      number
  endCol?:        number
  colWidth?:      number
  weeks?:         Date[]
  todayCol?:      number
  isDraft?:       boolean
  onResizeEnd?:   (newStartISO: string, newEndISO: string) => void
  onBarClick?:    () => void
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function colToISO(weeks: Date[], col: number): string {
  const d = weeks[Math.max(0, Math.min(col, weeks.length - 1))]
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(d: Date, barPx: number): string {
  const day = d.getDate()
  const mon = d.getMonth()
  const yr  = d.getFullYear()
  if (barPx >= 200) return `${day} ${MONTHS_SHORT[mon]} ${yr}`   // "9 Apr 2026"
  if (barPx >= 100) return `${day} ${MONTHS_SHORT[mon]}`         // "9 Apr"
  return `${day}/${mon + 1}`                                      // "9/4"
}

function computeCost(startISO: string, endISO: string, dayRate: number, allocationPct: number): number {
  const start = new Date(startISO)
  const end   = new Date(endISO); end.setDate(end.getDate() + 1)
  return Math.round(dayRate * (allocationPct / 100) * businessDaysBetween(start, end))
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimelineBar({
  projectName, client, color, width, dayRate,
  allocationPct, startCol, endCol, colWidth, weeks, todayCol,
  isDraft,
  onResizeEnd, onBarClick,
}: TimelineBarProps) {
  const [liveMarginLeft, setLiveMarginLeft] = useState(0)
  const [liveWidth,      setLiveWidth]      = useState(width)
  const [liveStartCol,   setLiveStartCol]   = useState(startCol ?? 0)
  const [liveEndCol,     setLiveEndCol]     = useState(endCol   ?? 0)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cost: number; range: string } | null>(null)

  const dragRef = useRef<{
    handle:         'left' | 'right' | 'move'
    startX:         number
    baseMarginLeft: number
    baseWidth:      number
    baseStartCol:   number
    baseEndCol:     number
  } | null>(null)
  const clickBlockRef  = useRef(false)
  const onResizeEndRef = useRef(onResizeEnd)
  useEffect(() => { onResizeEndRef.current = onResizeEnd }, [onResizeEnd])

  // Sync when parent commits new values
  useEffect(() => {
    setLiveWidth(width)
    setLiveMarginLeft(0)
    setLiveStartCol(startCol ?? 0)
    setLiveEndCol(endCol ?? 0)
  }, [width, startCol, endCol])

  const isDraggable = startCol != null && endCol != null && colWidth != null && weeks != null
  const leftLocked  = (startCol != null && todayCol != null) ? startCol < todayCol : false

  function handleMouseDown(handle: 'left' | 'right' | 'move', e: React.MouseEvent) {
    if ((handle === 'left' || handle === 'move') && leftLocked) return
    e.preventDefault(); e.stopPropagation()
    // clickBlock is set only on actual movement, not on bare mousedown
    dragRef.current = {
      handle, startX: e.clientX,
      baseMarginLeft: liveMarginLeft, baseWidth: liveWidth,
      baseStartCol: startCol!, baseEndCol: endCol!,
    }
  }

  useEffect(() => {
    const cw = colWidth ?? 1
    const wk = weeks    ?? []
    const tc = todayCol ?? 0

    function clampCols(drag: NonNullable<typeof dragRef.current>, dcols: number) {
      if (drag.handle === 'left') {
        const clamped = Math.max(tc, Math.min(drag.baseStartCol + dcols, drag.baseEndCol - 1))
        return { newStartCol: clamped, newEndCol: drag.baseEndCol }
      } else if (drag.handle === 'right') {
        const clamped = Math.max(tc, Math.min(drag.baseEndCol + dcols, wk.length - 1))
        return { newStartCol: drag.baseStartCol, newEndCol: Math.max(clamped, drag.baseStartCol + 1) }
      } else {
        const barLen   = drag.baseEndCol - drag.baseStartCol
        const newStart = Math.max(tc, Math.min(drag.baseStartCol + dcols, wk.length - 1 - barLen))
        return { newStartCol: newStart, newEndCol: newStart + barLen }
      }
    }

    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current
      if (!drag) return
      // Only block click once the user has actually moved during a drag
      if (!clickBlockRef.current) clickBlockRef.current = true
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
        newMargin = drag.baseMarginLeft + (newStartCol - drag.baseStartCol) * cw
      }

      setLiveMarginLeft(newMargin)
      setLiveWidth(Math.max(8, newWidth))
      setLiveStartCol(newStartCol)
      setLiveEndCol(newEndCol)

      if (dayRate && allocationPct) {
        const startISO = colToISO(wk, newStartCol)
        const endISO   = colToISO(wk, newEndCol)
        setTooltip({ x: e.clientX, y: e.clientY,
          cost: computeCost(startISO, endISO, dayRate, allocationPct),
          range: `${startISO} → ${endISO}` })
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

  // ── Label dates ───────────────────────────────────────────────────────────
  const wk = weeks ?? []
  const startDate = wk[Math.max(0, Math.min(liveStartCol, wk.length - 1))]
  const endDate   = wk[Math.max(0, Math.min(liveEndCol,   wk.length - 1))]
  const startLabel = startDate ? fmtDate(startDate, liveWidth) : null
  const endLabel   = endDate   ? fmtDate(endDate,   liveWidth) : null

  // ── Sticky label left offset ──────────────────────────────────────────────
  // The bar wrapper sits at `position: absolute, left: barLeft` in the bars div.
  // We receive scrollLeft (how far that container has scrolled).
  // The label naturally sits at left=0 within the wrapper (= barLeft in the container).
  // To stick to viewport: offset = max(0, scrollLeft - barLeft_from_parent)
  // But TimelineBar doesn't know barLeft from parent; the parent adjusts via marginLeft.
  // We track it via liveMarginLeft: the bar's visual left within its wrapper is liveMarginLeft.
  // The wrapper itself is placed at barLeft by the page. We receive scrollLeft from the page.
  // scrollLeft is measured from the bars-area left edge (after stub).
  // barLeft within bars-area = startCol * COL_W + 4  (set by page)
  // But we don't have access to that here — instead, pass via a computed prop `barOffsetLeft`
  // which the page calculates as barLeft (absolute left within bars div).
  // For simplicity: use scrollLeft directly. The label needs its left to be:
  //   max(scrollLeft - barOffsetLeft, 0) clamped to not exceed barWidth - labelWidth
  // We'll approximate with scrollLeft received and liveWidth for clamping.

  // The actual sticky clamping requires knowing `barLeft` from the page.
  // We pass it as an implicit offset: the label's natural position is `left: 0` in the wrapper.
  // `scrollLeft` here is the distance scrolled in the bars-area. The bar wrapper starts at
  // some absolute x within bars-area. We need: labelLeft = scrollLeft - wrapperLeft.
  // Since TimelineBar doesn't know wrapperLeft, we rely on the page to pass
  // `scrollLeft - barLeft` as `stickyOffset`. Keep API simple: page passes raw `scrollLeft`
  // and we also receive `barOffsetInContainer` — but that bloats props.
  //
  // Simpler: render label as `position: sticky, left: 4` on the label's OWN div,
  // inside a wrapper that is NOT overflow:hidden. The visual bar fill uses overflow:hidden.
  // This is the cleanest CSS-only approach.

  // ── Draft / ghost derived styles ─────────────────────────────────────────
  const ghostFill    = `color-mix(in srgb, ${color} 20%, transparent)`
  const dividerColor = isDraft
    ? `color-mix(in srgb, ${color} 40%, transparent)`
    : 'rgba(255,255,255,0.4)'
  const textColor    = isDraft ? color : '#fff'
  const subTextColor = isDraft ? color : 'rgba(255,255,255,0.65)'
  const dateColor    = isDraft ? color : 'rgba(255,255,255,0.8)'
  const gripColor    = isDraft ? color : 'rgba(255,255,255,0.5)'

  return (
    <>
      <div
        style={{
          width: liveWidth, marginLeft: liveMarginLeft,
          height: 28, borderRadius: 4,
          position: 'relative', flexShrink: 0,
          cursor: isDraggable ? 'pointer' : 'default',
          userSelect: 'none',
          border: isDraft ? `1px solid ${color}` : 'none',
          boxSizing: 'border-box',
        }}
        onClick={() => { if (!clickBlockRef.current) onBarClick?.() }}
      >
        {/* Visual fill — full-span, overflow:hidden for right bookend */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: isDraft ? ghostFill : color,
          borderRadius: isDraft ? 3 : 4,
          overflow: 'hidden', zIndex: 0,
        }}>
          {/* Right bookend — end date */}
          {endLabel && liveWidth >= 40 && (
            <span style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 9, fontWeight: 600, color: dateColor,
              whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 1,
            }}>
              {endLabel}
            </span>
          )}
        </div>

        {/* ── Sticky label: pins to stub right edge when bar scrolls under it */}
        {liveWidth >= 48 && (
          <div style={{
            position: 'sticky', left: STUB_WIDTH,
            top: 0, bottom: 0, height: '100%',
            paddingLeft: 12,
            display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6,
            width: 'max-content', maxWidth: liveWidth - 16,
            overflow: 'hidden',
            zIndex: 5, pointerEvents: 'none',
          }}>
            {/* Name + client — stacked column */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flexShrink: 1 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: textColor, lineHeight: 1.3,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {projectName}
              </span>
              {liveWidth >= 110 && (
                <span style={{
                  fontSize: 8, fontWeight: 400, color: subTextColor, lineHeight: 1.3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {client}
                </span>
              )}
            </div>

            {/* Divider + start date — only when bar is wide enough */}
            {startLabel && liveWidth >= 90 && (
              <>
                <div style={{ width: 1, height: 14, backgroundColor: dividerColor, flexShrink: 0 }} />
                <span style={{
                  fontSize: 9, fontWeight: 600, color: dateColor,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {startLabel}
                </span>
              </>
            )}
          </div>
        )}

        {/* Left handle */}
        {isDraggable && !leftLocked && (
          <div
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, cursor: 'ew-resize', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={e => handleMouseDown('left', e)}
          >
            <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: gripColor }} />
          </div>
        )}

        {/* Move handle — starts after handle dead-zone */}
        {isDraggable && !leftLocked && (
          <div
            style={{ position: 'absolute', left: 10, right: 10, top: 0, bottom: 0, cursor: 'grab', zIndex: 4 }}
            onMouseDown={e => handleMouseDown('move', e)}
          />
        )}

        {/* Right handle */}
        {isDraggable && (
          <div
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, cursor: 'ew-resize', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={e => handleMouseDown('right', e)}
          >
            <div style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: gripColor }} />
          </div>
        )}
      </div>

      {/* Drag tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 70, zIndex: 9999,
          backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)',
          borderRadius: 8, padding: '8px 12px', fontSize: 11, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
          display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.6 }}>Total Cost</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>£{tooltip.cost.toLocaleString()}</span>
          <span style={{ fontSize: 10, opacity: 0.55 }}>{tooltip.range}</span>
        </div>
      )}
    </>
  )
}
