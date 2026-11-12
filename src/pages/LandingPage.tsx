import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  TrendingUp,
  Target,
  BookOpen,
  ArrowRight,
  BarChart3,
  Shield,
  LineChart,
  Activity,
  Layers,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Play,
  Rocket
} from 'lucide-react'
import TradingBackground from '../components/TradingBackground'
import LiveTradingChart from '../components/LiveTradingChart'
import EmailSubscription from '../components/EmailSubscription'
import './LandingPage.css'

// Simulated live prices for the ticker
const cryptoPairs = [
  { symbol: 'BTC/USDT', price: 67482.50, change: 2.34 },
  { symbol: 'ETH/USDT', price: 3521.80, change: 1.87 },
  { symbol: 'SOL/USDT', price: 142.65, change: -0.54 },
  { symbol: 'BNB/USDT', price: 598.20, change: 0.92 },
  { symbol: 'XRP/USDT', price: 0.5234, change: 3.21 },
  { symbol: 'DOGE/USDT', price: 0.1245, change: -1.23 },
]

const LandingPage = () => {
  const [activeTool, setActiveTool] = useState(0)
  const [tickerPrices, setTickerPrices] = useState(cryptoPairs)

  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerPrices(prev => prev.map(pair => ({
        ...pair,
        price: pair.price * (1 + (Math.random() - 0.5) * 0.002),
        change: pair.change + (Math.random() - 0.5) * 0.1
      })))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const tools = [
    {
      icon: <Calculator size={24} />,
      title: 'Position Calculator',
      description: 'Calculate exact position sizes with leverage, liquidation prices, and multi-target TP planning.',
      link: '/calculator',
      tag: 'Risk Management',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      icon: <Play size={24} />,
      title: 'Paper Trading',
      description: 'Practice with live Bybit charts, place demo trades, and test strategies risk-free before going live.',
      link: '/paper-trading',
      tag: 'Practice Mode',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      icon: <TrendingUp size={24} />,
      title: 'Market Structure',
      description: 'Identify trends, support/resistance levels, and break of structure signals.',
      link: '/market-structure',
      tag: 'Technical Analysis',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      icon: <Target size={24} />,
      title: 'Price Action',
      description: 'Recognize 23+ candlestick patterns with real-time signals and probability data.',
      link: '/price-action',
      tag: 'Pattern Recognition',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      icon: <BookOpen size={24} />,
      title: 'Trading Journal',
      description: 'Track every trade with detailed metrics, analytics dashboard, and performance insights.',
      link: '/journal',
      tag: 'Performance Tracking',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    }
  ]

  const metrics = [
    { label: 'Trading Tools', value: '5', icon: <Layers size={20} /> },
    { label: 'Pattern Types', value: '23+', icon: <Activity size={20} /> },
    { label: 'Paper Trading', value: 'Live', icon: <Play size={20} /> },
    { label: 'Free Forever', value: '$0', icon: <Sparkles size={20} /> }
  ]

  const features = [
    {
      icon: <Shield size={28} />,
      title: 'Risk-First Approach',
      description: 'Never risk more than you can afford. Our tools help you calculate precise position sizes based on your risk tolerance.'
    },
    {
      icon: <Rocket size={28} />,
      title: 'Practice Risk-Free',
      description: 'Test strategies with paper trading on live Bybit data. Perfect your approach before risking real capital.'
    },
    {
      icon: <LineChart size={28} />,
      title: 'Data-Driven Decisions',
      description: 'Make informed trading decisions with comprehensive analytics, pattern recognition, and market structure analysis.'
    },
    {
      icon: <BarChart3 size={28} />,
      title: 'Track Everything',
      description: 'Log every trade, analyze your performance over time, and identify what works best for your trading style.'
    },
    {
      icon: <PieChart size={28} />,
      title: 'Portfolio Insights',
      description: 'Understand your win rate, profit factor, and risk-reward ratios with detailed performance breakdowns.'
    }
  ]

  return (
    <div className="landing-page">
      <TradingBackground variant="home" />

      {/* Live Price Ticker */}
      <div className="price-ticker">
        <div className="ticker-track">
          {[...tickerPrices, ...tickerPrices].map((pair, index) => (
            <div key={index} className="ticker-item">
              <span className="ticker-symbol">{pair.symbol}</span>
              <span className="ticker-price">${pair.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`ticker-change ${pair.change >= 0 ? 'positive' : 'negative'}`}>
                {pair.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(pair.change).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-grid-bg"></div>
        <div className="hero-glow"></div>

        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <div className="badge-pulse"></div>
              <span>Professional Trading Suite</span>
            </div>

            <h1 className="hero-title">
              Trade with
              <span className="hero-title-highlight"> Precision</span>
              <br />
              Not Emotion
            </h1>

            <p className="hero-subtitle">
              The complete toolkit for disciplined traders. Calculate risk, analyze markets,
              recognize patterns, and track your journey to consistent profitability.
            </p>

            <div className="hero-actions">
              <Link to="/calculator" className="hero-btn-primary">
                <span>Start Trading Smarter</span>
                <ArrowRight size={20} />
              </Link>
              <a href="#tools" className="hero-btn-secondary">
                <span>Explore Tools</span>
              </a>
            </div>

            <div className="hero-metrics">
              {metrics.map((metric, index) => (
                <div key={index} className="metric-item">
                  <div className="metric-icon">{metric.icon}</div>
                  <div className="metric-content">
                    <span className="metric-value">{metric.value}</span>
                    <span className="metric-label">{metric.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <span className="terminal-title">Trade Analysis</span>
              </div>
              <div className="terminal-body">
                <div className="terminal-row">
                  <span className="terminal-label">Position Size</span>
                  <span className="terminal-value highlight">0.45 BTC</span>
                </div>
                <div className="terminal-row">
                  <span className="terminal-label">Entry Price</span>
                  <span className="terminal-value">$67,450.00</span>
                </div>
                <div className="terminal-row">
                  <span className="terminal-label">Stop Loss</span>
                  <span className="terminal-value danger">$65,800.00</span>
                </div>
                <div className="terminal-row">
                  <span className="terminal-label">Take Profit</span>
                  <span className="terminal-value success">$71,200.00</span>
                </div>
                <div className="terminal-divider"></div>
                <div className="terminal-row">
                  <span className="terminal-label">Risk Amount</span>
                  <span className="terminal-value">$742.50 (2%)</span>
                </div>
                <div className="terminal-row">
                  <span className="terminal-label">Potential Profit</span>
                  <span className="terminal-value success">$1,687.50</span>
                </div>
                <div className="terminal-row">
                  <span className="terminal-label">Risk/Reward</span>
                  <span className="terminal-value highlight">1:2.27</span>
                </div>
                <div className="terminal-status">
                  <div className="status-indicator"></div>
                  <span>Trade Setup Valid</span>
                </div>
              </div>
            </div>
            <div className="floating-element floating-1">
              <TrendingUp size={20} />
              <span>+12.4%</span>
            </div>
            <div className="floating-element floating-2">
              <Activity size={20} />
              <span>Win Rate: 68%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Bento Grid */}
      <section id="tools" className="tools-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Complete Trading Arsenal</span>
            <h2 className="section-title">Five Professional Tools</h2>
            <p className="section-subtitle">
              Everything you need to trade with discipline and precision,
              from position sizing to practice trading and performance tracking.
            </p>
          </div>

          <div className="tools-bento tools-bento-5">
            {/* Position Calculator - Featured Left */}
            <div
              className={`tool-card tool-featured-left ${activeTool === 0 ? 'active' : ''}`}
              onMouseEnter={() => setActiveTool(0)}
            >
              <div className="tool-card-bg" style={{ background: tools[0].gradient }}></div>
              <div className="tool-card-content">
                <div className="tool-tag">{tools[0].tag}</div>
                <div className="tool-icon">{tools[0].icon}</div>
                <h3 className="tool-title">{tools[0].title}</h3>
                <p className="tool-description">{tools[0].description}</p>
                <Link to={tools[0].link} className="tool-link">
                  Open Tool <ArrowRight size={16} />
                </Link>
              </div>
              <div className="tool-preview">
                <div className="preview-calc">
                  <div className="calc-row">
                    <span>Account Balance</span>
                    <span>$10,000</span>
                  </div>
                  <div className="calc-row">
                    <span>Risk %</span>
                    <span>2%</span>
                  </div>
                  <div className="calc-row highlight">
                    <span>Position Size</span>
                    <span>0.45 BTC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Paper Trading - Featured Right */}
            <div
              className={`tool-card tool-featured-right ${activeTool === 1 ? 'active' : ''}`}
              onMouseEnter={() => setActiveTool(1)}
            >
              <div className="tool-card-bg" style={{ background: tools[1].gradient }}></div>
              <div className="tool-card-content">
                <div className="tool-tag">{tools[1].tag}</div>
                <div className="tool-icon">{tools[1].icon}</div>
                <h3 className="tool-title">{tools[1].title}</h3>
                <p className="tool-description">{tools[1].description}</p>
                <Link to={tools[1].link} className="tool-link">
                  Start Practicing <ArrowRight size={16} />
                </Link>
              </div>
              <div className="tool-preview paper-preview">
                <div className="preview-trade">
                  <div className="trade-header">
                    <span className="trade-pair">BTC/USDT</span>
                    <span className="trade-badge long">LONG</span>
                  </div>
                  <div className="trade-row">
                    <span>Entry</span>
                    <span>$67,450</span>
                  </div>
                  <div className="trade-row">
                    <span>PnL</span>
                    <span className="profit">+$342.50</span>
                  </div>
                  <div className="trade-status">
                    <span className="status-dot"></span>
                    Live Practice
                  </div>
                </div>
              </div>
            </div>

            {/* Three Bottom Tools */}
            {tools.slice(2).map((tool, index) => (
              <div
                key={index}
                className={`tool-card tool-bottom ${activeTool === index + 2 ? 'active' : ''}`}
                onMouseEnter={() => setActiveTool(index + 2)}
              >
                <div className="tool-card-bg" style={{ background: tool.gradient }}></div>
                <div className="tool-card-content">
                  <div className="tool-tag">{tool.tag}</div>
                  <div className="tool-icon">{tool.icon}</div>
                  <h3 className="tool-title">{tool.title}</h3>
                  <p className="tool-description">{tool.description}</p>
                  <Link to={tool.link} className="tool-link">
                    Open Tool <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Why Traders Choose Us</span>
            <h2 className="section-title">Built for Serious Traders</h2>
            <p className="section-subtitle">
              Every feature is designed with one goal: helping you become a more
              disciplined and profitable trader.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-wrapper">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Chart Section */}
      <section className="chart-section">
        <div className="section-container">
          <div className="section-header light">
            <span className="section-tag">Real-Time Analysis</span>
            <h2 className="section-title">Watch the Market Move</h2>
            <p className="section-subtitle">
              Live market visualization with buy and sell signals.
              Practice identifying setups in real-time.
            </p>
          </div>

          <div className="chart-wrapper">
            <LiveTradingChart />
          </div>

          <div className="chart-cta">
            <Link to="/paper-trading" className="chart-btn-primary">
              <Play size={20} />
              <span>Practice Trading</span>
            </Link>
            <Link to="/calculator" className="chart-btn-secondary">
              <Calculator size={20} />
              <span>Calculate Position</span>
            </Link>
            <Link to="/journal" className="chart-btn-secondary">
              <BookOpen size={20} />
              <span>Track Trades</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Trader Stories</span>
            <h2 className="section-title">Trusted by Traders Worldwide</h2>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>
                  "The position calculator changed how I approach every trade.
                  I finally understand proper risk management and my account has
                  been growing steadily."
                </p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">MK</div>
                <div className="author-info">
                  <strong>Marcus Kim</strong>
                  <span>Day Trader • Singapore</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card featured">
              <div className="testimonial-content">
                <p>
                  "The analytics dashboard showed me I was overtrading during
                  low-volatility hours. After adjusting my strategy, my win rate
                  increased by 15%."
                </p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">SJ</div>
                <div className="author-info">
                  <strong>Sarah Johnson</strong>
                  <span>Swing Trader • United States</span>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>
                  "Simple yet powerful. The market structure analysis helps me
                  understand trends, and the price action tool improved my
                  entry timing significantly."
                </p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">RP</div>
                <div className="author-info">
                  <strong>Raj Patel</strong>
                  <span>Crypto Trader • India</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Email Subscription */}
      <EmailSubscription />

      {/* Final CTA */}
      <section className="final-cta">
        <div className="cta-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Trade with Discipline?</h2>
            <p className="cta-subtitle">
              Join thousands of traders who have transformed their approach to the markets.
              Start using professional-grade tools today — completely free.
            </p>
            <div className="cta-actions">
              <Link to="/calculator" className="cta-btn-primary">
                <span>Get Started Now</span>
                <ArrowRight size={20} />
              </Link>
            </div>
            <div className="cta-features">
              <div className="cta-feature">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>No registration required</span>
              </div>
              <div className="cta-feature">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>100% free forever</span>
              </div>
              <div className="cta-feature">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Instant access</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
