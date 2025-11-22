const Logo = ({ size = 24 }: { size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="modernGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      {/* T shape - horizontal top bar */}
      <path
        d="M 10 10 L 90 10 L 90 28 L 58 28 L 58 32 L 42 32 L 42 28 L 10 28 Z"
        fill="url(#modernGradient)"
      />

      {/* I shape - vertical bar (shared with T stem) with distinctive top */}
      <path
        d="M 42 28 L 58 28 L 58 90 L 42 90 Z"
        fill="url(#modernGradient)"
      />

      {/* I dot - positioned above to create merged T+I effect */}
      <circle
        cx="72"
        cy="18"
        r="6"
        fill="url(#modernGradient)"
      />

      {/* Accent detail - modern geometric element */}
      <rect
        x="45"
        y="50"
        width="10"
        height="3"
        fill="white"
        opacity="0.25"
        rx="1.5"
      />
    </svg>
  )
}

export default Logo
