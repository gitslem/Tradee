import { Link, useLocation } from 'react-router-dom'
import { Home, Calculator, TrendingUp, Target, Menu, X } from 'lucide-react'
import { useState } from 'react'
import './Navigation.css'

const Navigation = () => {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { path: '/', label: 'Home', icon: <Home size={20} /> },
    { path: '/calculator', label: 'Calculator', icon: <Calculator size={20} /> },
    { path: '/market-structure', label: 'Market Structure', icon: <TrendingUp size={20} /> },
    { path: '/price-action', label: 'Price Action', icon: <Target size={20} /> }
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <div className="logo-icon">
            <Calculator size={24} />
          </div>
          <span className="logo-text">Tradee</span>
        </Link>

        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  )
}

export default Navigation
