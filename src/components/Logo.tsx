const Logo = ({ size = 32, variant = 'primary' }: { size?: number; variant?: 'primary' | 'secondary' }) => {
  // Use logo1 as primary, logo2 as secondary
  const logoUrl = variant === 'primary'
    ? 'https://raw.githubusercontent.com/gitslem/Tradee/main/logo1.jpeg'
    : 'https://raw.githubusercontent.com/gitslem/Tradee/main/logo2.jpeg'

  return (
    <img
      src={logoUrl}
      alt="Traddii Logo"
      width={size}
      height={size}
      style={{
        borderRadius: '8px',
        objectFit: 'cover'
      }}
    />
  )
}

export default Logo
