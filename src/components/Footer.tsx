import { Link } from 'react-router-dom'
import Logo from './Logo'
import PriceActionBackground from './PriceActionBackground'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="global-footer">
      <PriceActionBackground />
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-section footer-brand">
            <div className="footer-logo-container">
              <Logo size={32} />
              <h3 className="footer-logo-text">Traddii</h3>
            </div>
            <p className="footer-description">
              Professional crypto trading tools for smarter decisions.
            </p>
            <div className="footer-social">
              <a href="mailto:traddii.web.app@gmail.com" className="social-link" aria-label="Email">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Tools</h4>
            <ul className="footer-links">
              <li><Link to="/calculator">Calculator</Link></li>
              <li><Link to="/market-structure">Market Structure</Link></li>
              <li><Link to="/price-action">Price Action</Link></li>
              <li><Link to="/journal">Journal</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links">
              <li><Link to="/about">About</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/support">Support</Link></li>
              <li><a href="mailto:traddii.web.app@gmail.com">Contact</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Legal</h4>
            <ul className="footer-links">
              <li><Link to="/terms">Terms</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><span className="footer-disclaimer">Not Financial Advice</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">&copy; 2025 Traddii. All rights reserved.</p>
          <p className="footer-tagline">Trade Smart. Trade Safe. Trade Profitably.</p>
          <p className="footer-credit">
            by{' '}
            <a href="https://github.com/gitslem" target="_blank" rel="noopener noreferrer">
              gitslem
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
