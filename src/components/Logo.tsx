import { useState } from 'react'

const Logo = ({ size = 32, variant = 'primary' }: { size?: number; variant?: 'primary' | 'secondary' }) => {
  const [imageError, setImageError] = useState(false)

  // Use logo1 as primary, logo2 as secondary - now using local files from public directory
  const logoUrl = variant === 'primary' ? '/logo1.jpeg' : '/logo2.jpeg'
  const fallbackUrl = variant === 'primary'
    ? 'https://raw.githubusercontent.com/gitslem/Tradee/main/logo1.jpeg'
    : 'https://raw.githubusercontent.com/gitslem/Tradee/main/logo2.jpeg'

  return (
    <img
      src={imageError ? fallbackUrl : logoUrl}
      alt="Traddii Logo"
      width={size}
      height={size}
      onError={() => setImageError(true)}
      style={{
        borderRadius: '8px',
        objectFit: 'cover',
        display: 'block',
        maxWidth: '100%',
        height: 'auto'
      }}
      loading="eager"
    />
  )
}

export default Logo
