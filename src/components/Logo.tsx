const Logo = ({ size = 32, variant = 'primary' }: { size?: number; variant?: 'primary' | 'secondary' }) => {
  const logoUrl = variant === 'primary' ? '/logo1.jpeg' : '/logo2.jpeg'

  return (
    <img
      src={logoUrl}
      alt="Traddii Logo"
      width={size}
      height={size}
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
