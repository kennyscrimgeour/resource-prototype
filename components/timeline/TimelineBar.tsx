// Matches Figma: Bar/Digital Banking Redesign (410:1857)
// 28px tall, 4px margin all around within its row cell, project colour bg,
// project name 10px semibold white + client 9px regular white/70%.

interface TimelineBarProps {
  projectName: string
  client: string
  color: string        // CSS colour value — use var(--project-1) etc.
  /** Width in px — caller controls based on span × column width minus 8px gutter */
  width: number
}

export default function TimelineBar({ projectName, client, color, width }: TimelineBarProps) {
  const showClient = width >= 140
  const showName   = width >= 52

  return (
    <div
      style={{
        width,
        height: 28,
        borderRadius: 4,
        backgroundColor: color,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {showName && (
        <div
          style={{
            position: 'absolute',
            left: 8, right: 4, top: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 1,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}
          >
            {projectName}
          </span>
          {showClient && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.7)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
              }}
            >
              {client}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
