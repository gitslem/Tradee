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
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
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
        </div>
      </div>
    </footer>
  )
}

export default Footer
