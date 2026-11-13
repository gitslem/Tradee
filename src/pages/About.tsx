import './About.css'
import { TrendingUp, Target, Shield, Users, BarChart3, BookOpen, Zap, Award } from 'lucide-react'

const About = () => {
  return (
    <div className="about-page">
      <div className="about-hero">
        <h1>About Traddii</h1>
        <p>Your Complete Trading Performance Platform</p>
      </div>

      <div className="about-content">
        {/* Mission Section */}
        <section className="about-section">
          <div className="section-icon">
            <Target size={48} />
          </div>
          <h2>Our Mission</h2>
          <p>
            Traddii is dedicated to empowering traders with the tools they need to track, analyze, and improve their trading performance. We believe that successful trading requires discipline, careful analysis, and continuous improvement. Our platform provides you with everything you need to maintain a professional trading journal and make data-driven decisions.
          </p>
        </section>

        {/* Features Section */}
        <section className="about-section">
          <h2>What We Offer</h2>
          <div className="features-grid">
            <div className="feature-card">
              <TrendingUp size={32} />
              <h3>Trading Journal</h3>
              <p>Track all your trades in one place with detailed entry and exit information, P&L calculations, and performance metrics.</p>
            </div>

            <div className="feature-card">
              <BookOpen size={32} />
              <h3>Personal Notes</h3>
              <p>Document your strategies, trading plans, ideas, and reflections to build a comprehensive knowledge base.</p>
            </div>

            <div className="feature-card">
              <BarChart3 size={32} />
              <h3>Position Calculator</h3>
              <p>Calculate optimal position sizes, liquidation prices, and risk management with exchange-specific data from Binance, Bybit, and more.</p>
            </div>

            <div className="feature-card">
              <Zap size={32} />
              <h3>Real-Time Data</h3>
              <p>Access live cryptocurrency prices and candle data powered by CoinGecko API for accurate market analysis.</p>
            </div>

            <div className="feature-card">
              <Shield size={32} />
              <h3>Secure & Private</h3>
              <p>Your data is secured with Firebase authentication and cloud storage, ensuring privacy and reliability.</p>
            </div>

            <div className="feature-card">
              <Award size={32} />
              <h3>Performance Analytics</h3>
              <p>Visualize your trading statistics, win rates, profit factors, and identify areas for improvement.</p>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="about-section highlight">
          <h2>Why Choose Traddii?</h2>
          <div className="benefits-list">
            <div className="benefit-item">
              <div className="benefit-icon">✓</div>
              <div className="benefit-content">
                <h3>Exchange-Specific Calculations</h3>
                <p>Accurate liquidation prices and fees for Binance, Bybit, KuCoin, OKX, and more</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">✓</div>
              <div className="benefit-content">
                <h3>Comprehensive Export Options</h3>
                <p>Export your trading data in JSON, CSV, or TXT formats for external analysis</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">✓</div>
              <div className="benefit-content">
                <h3>User-Friendly Interface</h3>
                <p>Clean, modern design with intuitive navigation and responsive layout</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">✓</div>
              <div className="benefit-content">
                <h3>Free to Use</h3>
                <p>All core features are available at no cost to help you succeed in trading</p>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="about-section">
          <h2>Built with Modern Technology</h2>
          <p>
            Traddii is built using cutting-edge web technologies including React, TypeScript, and Firebase, ensuring a fast, reliable, and secure experience. Our platform is continuously updated with new features and improvements based on trader feedback.
          </p>
          <div className="tech-stack">
            <span className="tech-badge">React</span>
            <span className="tech-badge">TypeScript</span>
            <span className="tech-badge">Firebase</span>
            <span className="tech-badge">Vite</span>
            <span className="tech-badge">CoinGecko API</span>
          </div>
        </section>

        {/* Team Section */}
        <section className="about-section">
          <div className="section-icon">
            <Users size={48} />
          </div>
          <h2>Our Team</h2>
          <p>
            Traddii is developed by a passionate team of traders and software engineers who understand the challenges of maintaining trading discipline and performance tracking. We're committed to building tools that make a real difference in your trading journey.
          </p>
        </section>

        {/* Contact Section */}
        <section className="about-section contact-section">
          <h2>Get in Touch</h2>
          <p>
            Have questions, suggestions, or feedback? We'd love to hear from you!
          </p>
          <div className="contact-info">
            <div className="contact-item">
              <strong>Email:</strong>
              <p>traddii.web.app@gmail.com</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="about-section cta-section">
          <h2>Start Your Trading Journey Today</h2>
          <p>
            Join thousands of traders who are improving their performance with Traddii. Track your trades, analyze your performance, and become a better trader.
          </p>
          <button className="cta-button" onClick={() => window.location.href = '/journal'}>
            Get Started Free
          </button>
        </section>
      </div>
    </div>
  )
}

export default About
