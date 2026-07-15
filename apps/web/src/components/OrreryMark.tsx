interface OrreryMarkProps {
  size?: number
}

/**
 * The Hermuz logo mark: a minimal orrery — a single ring with a world at
 * center and one on the ring. Static and single-color; decorative, so hidden
 * from the a11y tree.
 */
export function OrreryMark({ size = 22 }: OrreryMarkProps) {
  return (
    <svg
      className="orrery"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.55"
      />
      <circle cx="16" cy="16" r="2.6" fill="currentColor" />
      <circle cx="29" cy="16" r="1.8" fill="currentColor" />
    </svg>
  )
}
