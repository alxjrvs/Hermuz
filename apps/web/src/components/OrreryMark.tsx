interface OrreryMarkProps {
  size?: number
}

/**
 * The Hermuz signature: a small orrery — brass rings around a gilt sun, with a
 * verdigris world that turns on its ring. Decorative, so hidden from a11y tree.
 */
export function OrreryMark({ size = 22 }: OrreryMarkProps) {
  return (
    <svg
      className="orrery"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="20"
        cy="20"
        rx="18"
        ry="7"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <ellipse
        className="ring-b"
        cx="20"
        cy="20"
        rx="7"
        ry="18"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <g className="spin">
        <circle
          cx="38"
          cy="20"
          r="2.4"
          className="ring-b"
          fill="currentColor"
        />
      </g>
      <circle cx="20" cy="20" r="3.4" fill="currentColor" />
    </svg>
  )
}
