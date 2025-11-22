import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="global-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-section footer-brand">
            <h3 className="footer-logo">Traddii</h3>
            <p className="footer-description">
              Professional crypto trading tools for consistent profitability.
              Risk management, market analysis, and performance tracking - all free forever.
            </p>
            <div className="footer-social">
              <a href="mailto:tradee444@gmail.com" className="social-link" aria-label="Email">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Trading Tools</h4>
            <ul className="footer-links">
              <li><Link to="/calculator">Position Calculator</Link></li>
              <li><Link to="/market-structure">Market Structure</Link></li>
              <li><Link to="/price-action">Price Action</Link></li>
              <li><Link to="/journal">Trading Journal</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links">
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/support">Support Center</Link></li>
              <li><a href="mailto:tradee444@gmail.com">Contact Us</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Legal</h4>
            <ul className="footer-links">
              <li><Link to="/terms">Terms & Conditions</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><span className="footer-disclaimer">Not Financial Advice</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            <p>&copy; 2025 Traddii. All rights reserved.</p>
          </div>
          <div className="footer-tagline">
            <p>Trade Smart. Trade Safe. Trade Profitably.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
