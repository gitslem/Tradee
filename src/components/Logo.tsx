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
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      {/* Letter T - Main Shape */}
      {/* Horizontal bar at top */}
      <rect x="10" y="15" width="80" height="18" rx="4" fill="url(#logoGradient)" />

      {/* Vertical stem - thicker to contain $ */}
      <rect x="35" y="15" width="30" height="75" rx="4" fill="url(#logoGradient)" />

      {/* Dollar Sign $ - Visible inside the T */}
      {/* S curve */}
      <path
        d="M 45 35 Q 40 35, 40 40 Q 40 45, 50 47 Q 60 49, 60 55 Q 60 60, 55 60"
        stroke="white"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Dollar sign vertical line */}
      <line x1="50" y1="30" x2="50" y2="65" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

export default Logo
