// Matches Figma: Stub (403:1813)
// 200px wide × (rowCount × 40px) tall.
// Avatar uses the person's colour index; name/role centred vertically.

import Avatar from '@/components/ui/Avatar'

export const STUB_WIDTH = 200
export const ROW_HEIGHT = 40

interface TimelineStubProps {
  name: string
  role: string
  initials: string
  colorIndex: number
  rowCount?: number   // how many project rows this person has (split rows)
}

export default function TimelineStub({
  name,
  role,
  initials,
  colorIndex,
  rowCount = 1,
}: TimelineStubProps) {
  const height = rowCount * ROW_HEIGHT

  return (
    <div
      className="timeline-stub-hover"
      style={{
        width: STUB_WIDTH,
        height,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 8,
        paddingRight: 8,
        backgroundColor: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-tertiary)',
        borderBottom: '1px solid var(--border-tertiary)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'background-color 0.12s',
      }}
    >
      <Avatar initials={initials} size="xs" colorIndex={colorIndex} style={{ flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden', minWidth: 0 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 400,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {role}
        </span>
      </div>
    </div>
  )
}
