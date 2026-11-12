import { useState, useMemo } from 'react'
import './MarketStructure.css'
import CandleDataCard from '../components/CandleDataCard'
import TradingBackground from '../components/TradingBackground'
import { calculateSupportResistance } from '../services/ohlcvService'
import type { OHLCVData } from '../services/ohlcvService'
import {
  Layers, TrendingUp, TrendingDown, Activity, Target, Plus, X,
  ChevronDown, ChevronUp, BarChart2, Shield, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, Info, Sparkles
} from 'lucide-react'

interface SupportResistance {
  level: string
  strength: 'weak' | 'moderate' | 'strong'
  touches: string
}

const FIBONACCI_LEVELS = [
  { level: 0, label: '0%', color: '#ef4444' },
  { level: 0.236, label: '23.6%', color: '#f97316' },
  { level: 0.382, label: '38.2%', color: '#f59e0b' },
  { level: 0.5, label: '50%', color: '#eab308' },
  { level: 0.618, label: '61.8%', color: '#84cc16' },
  { level: 0.786, label: '78.6%', color: '#22c55e' },
  { level: 1, label: '100%', color: '#10b981' },
]

const MarketStructure = () => {
  const [cryptoPair, setCryptoPair] = useState<string>('ETH/USDT')
  const [currentPrice, setCurrentPrice] = useState<string>('3500')
  const [recentHigh, setRecentHigh] = useState<string>('3800')
  const [recentLow, setRecentLow] = useState<string>('3200')
  const [prevHigh, setPrevHigh] = useState<string>('3750')
  const [prevLow, setPrevLow] = useState<string>('3250')
  const [showManual, setShowManual] = useState<boolean>(false)

  const [supportLevels, setSupportLevels] = useState<SupportResistance[]>([
    { level: '3400', strength: 'strong', touches: '5' },
    { level: '3200', strength: 'moderate', touches: '3' }
  ])

  const [resistanceLevels, setResistanceLevels] = useState<SupportResistance[]>([
    { level: '3600', strength: 'moderate', touches: '3' },
    { level: '3800', strength: 'strong', touches: '4' }
  ])

  const handleUsePriceData = (ohlcv: OHLCVData) => {
    const levels = calculateSupportResistance(ohlcv)
    setCurrentPrice(ohlcv.current.close.toString())
    setRecentHigh(ohlcv.current.high.toString())
    setRecentLow(ohlcv.current.low.toString())
    setPrevHigh(ohlcv.previous.high.toString())
    setPrevLow(ohlcv.previous.low.toString())

    setSupportLevels(levels.support.map((price, index) => ({
      level: price.toFixed(2),
      strength: index === 0 ? 'strong' : 'moderate',
      touches: (index + 2).toString()
    })))

    setResistanceLevels(levels.resistance.map((price, index) => ({
      level: price.toFixed(2),
      strength: index === 0 ? 'strong' : 'moderate',
      touches: (index + 2).toString()
    })))
  }

  // Fibonacci retracement levels
  // Fib Level Price = Low + (High - Low) × Fib Ratio
  // Standard Fibonacci Levels: 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
  // 38.2% - 61.8% is commonly treated as the key retracement zone
  const fibonacciLevels = useMemo(() => {
    const high = parseFloat(recentHigh)
    const low = parseFloat(recentLow)
    const diff = high - low
    const current = parseFloat(currentPrice)

    return FIBONACCI_LEVELS.map(fib => ({
      ...fib,
      price: low + diff * fib.level,
      isNearby: Math.abs((low + diff * fib.level) - current) / current < 0.01
    }))
  }, [recentHigh, recentLow, currentPrice])

  // Market structure analysis (Dow Theory)
  // Uptrend: Higher Highs (HH) and Higher Lows (HL)
  // Downtrend: Lower Highs (LH) and Lower Lows (LL)
  // Range Position = ((Current - Low) / (High - Low)) × 100
  const marketAnalysis = useMemo(() => {
    const current = parseFloat(currentPrice)
    const high = parseFloat(recentHigh)
    const low = parseFloat(recentLow)
    const pHigh = parseFloat(prevHigh)
    const pLow = parseFloat(prevLow)

    let trend: 'uptrend' | 'downtrend' | 'expansion' | 'range' = 'range'
    let trendDescription = ''

    // Dow Theory Market Structure Detection
    if (high > pHigh && low > pLow) {
      trend = 'uptrend'
      trendDescription = 'Higher Highs and Higher Lows detected'
    } else if (high < pHigh && low < pLow) {
      trend = 'downtrend'
      trendDescription = 'Lower Highs and Lower Lows detected'
    } else if (high > pHigh && low < pLow) {
      trend = 'expansion'
      trendDescription = 'Range expanding - high volatility'
    } else {
      trend = 'range'
      trendDescription = 'Consolidating between support and resistance'
    }

    // Range Position Calculation
    const rangePosition = ((current - low) / (high - low)) * 100
    let positionLabel = ''
    let positionType: 'warning' | 'neutral' | 'info' = 'neutral'

    if (rangePosition > 80) {
      positionLabel = 'Near resistance zone'
      positionType = 'warning'
    } else if (rangePosition < 20) {
      positionLabel = 'Near support zone'
      positionType = 'info'
    } else {
      positionLabel = 'Mid-range position'
      positionType = 'neutral'
    }

    return { trend, trendDescription, rangePosition, positionLabel, positionType }
  }, [currentPrice, recentHigh, recentLow, prevHigh, prevLow])

  const getTrendIcon = () => {
    switch (marketAnalysis.trend) {
      case 'uptrend': return <TrendingUp size={24} />
      case 'downtrend': return <TrendingDown size={24} />
      case 'expansion': return <Activity size={24} />
      default: return <Minus size={24} />
    }
  }

  const getTrendColor = () => {
    switch (marketAnalysis.trend) {
      case 'uptrend': return '#10b981'
      case 'downtrend': return '#ef4444'
      case 'expansion': return '#f59e0b'
      default: return '#8b5cf6'
    }
  }

  const addSupport = () => {
    setSupportLevels([...supportLevels, { level: '', strength: 'moderate', touches: '1' }])
  }

  const addResistance = () => {
    setResistanceLevels([...resistanceLevels, { level: '', strength: 'moderate', touches: '1' }])
  }

  const updateSupport = (index: number, field: keyof SupportResistance, value: string) => {
    const updated = [...supportLevels]
    updated[index] = { ...updated[index], [field]: value }
    setSupportLevels(updated)
  }

  const updateResistance = (index: number, field: keyof SupportResistance, value: string) => {
    const updated = [...resistanceLevels]
    updated[index] = { ...updated[index], [field]: value }
    setResistanceLevels(updated)
  }

  const removeSupport = (index: number) => {
    setSupportLevels(supportLevels.filter((_, i) => i !== index))
  }

  const removeResistance = (index: number) => {
    setResistanceLevels(resistanceLevels.filter((_, i) => i !== index))
  }

  return (
    <div className="market-structure-page">
      <TradingBackground variant="market" />

      {/* Hero Section */}
      <div className="ms-hero">
        <div className="hero-icon">
          <Layers size={40} />
        </div>
        <h1>Market Structure</h1>
        <p>Identify trends, support & resistance levels for smarter trading decisions</p>
      </div>

      <div className="ms-container">
        {/* Trend Overview Card */}
        <div className="trend-overview glass-card">
          <div className="trend-main">
            <div className="trend-icon" style={{ background: `${getTrendColor()}20`, color: getTrendColor() }}>
              {getTrendIcon()}
            </div>
            <div className="trend-info">
              <span className="trend-label" style={{ color: getTrendColor() }}>
                {marketAnalysis.trend.toUpperCase()}
              </span>
              <span className="trend-desc">{marketAnalysis.trendDescription}</span>
            </div>
          </div>

          <div className="price-display">
            <span className="price-label">Current Price</span>
            <span className="price-value">${parseFloat(currentPrice).toLocaleString()}</span>
          </div>

          <div className="range-position">
            <div className="range-header">
              <span>Range Position</span>
              <span className={`position-badge ${marketAnalysis.positionType}`}>
                {marketAnalysis.positionLabel}
              </span>
            </div>
            <div className="range-visual">
              <div className="range-bar">
                <div
                  className="range-indicator"
                  style={{ left: `${Math.min(Math.max(marketAnalysis.rangePosition, 0), 100)}%` }}
                />
              </div>
              <div className="range-labels">
                <span>${parseFloat(recentLow).toFixed(0)}</span>
                <span>{marketAnalysis.rangePosition.toFixed(0)}%</span>
                <span>${parseFloat(recentHigh).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ms-main-grid">
          {/* Left Panel */}
          <div className="ms-left-panel">
            {/* Pair Selector */}
            <div className="glass-card pair-section">
              <div className="pair-selector">
                <label>Trading Pair</label>
                <select value={cryptoPair} onChange={(e) => setCryptoPair(e.target.value)}>
                  <option>BTC/USDT</option>
                  <option>ETH/USDT</option>
                  <option>BNB/USDT</option>
                  <option>SOL/USDT</option>
                  <option>XRP/USDT</option>
                  <option>ADA/USDT</option>
                  <option>DOGE/USDT</option>
                  <option>MATIC/USDT</option>
                  <option>DOT/USDT</option>
                  <option>AVAX/USDT</option>
                </select>
              </div>
            </div>

            {/* Live Price Data */}
            <div className="glass-card price-data-section">
              <CandleDataCard pair={cryptoPair} onUseCandleData={handleUsePriceData} autoFill={true} />
            </div>

            {/* Manual Input Toggle */}
            <div className="glass-card manual-toggle" onClick={() => setShowManual(!showManual)}>
              <div className="toggle-content">
                <BarChart2 size={18} />
                <span>Manual Price Levels</span>
              </div>
              {showManual ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {showManual && (
              <div className="glass-card manual-inputs animated-section">
                <div className="input-grid">
                  <div className="input-group">
                    <label>Current Price</label>
                    <input
                      type="number"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(e.target.value)}
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>Recent High</label>
                    <input
                      type="number"
                      value={recentHigh}
                      onChange={(e) => setRecentHigh(e.target.value)}
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>Recent Low</label>
                    <input
                      type="number"
                      value={recentLow}
                      onChange={(e) => setRecentLow(e.target.value)}
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>Previous High</label>
                    <input
                      type="number"
                      value={prevHigh}
                      onChange={(e) => setPrevHigh(e.target.value)}
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>Previous Low</label>
                    <input
                      type="number"
                      value={prevLow}
                      onChange={(e) => setPrevLow(e.target.value)}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Support Levels */}
            <div className="glass-card levels-section support">
              <div className="levels-header">
                <h3>
                  <Shield size={18} />
                  Support Levels
                </h3>
                <button className="add-level-btn" onClick={addSupport}>
                  <Plus size={16} />
                </button>
              </div>
              <div className="levels-list">
                {supportLevels.map((level, index) => (
                  <div key={index} className="level-item">
                    <div className="level-price">
                      <input
                        type="number"
                        placeholder="Price"
                        value={level.level}
                        onChange={(e) => updateSupport(index, 'level', e.target.value)}
                      />
                    </div>
                    <select
                      value={level.strength}
                      onChange={(e) => updateSupport(index, 'strength', e.target.value)}
                      className={`strength-select ${level.strength}`}
                    >
                      <option value="weak">Weak</option>
                      <option value="moderate">Moderate</option>
                      <option value="strong">Strong</option>
                    </select>
                    <div className="touches-input">
                      <input
                        type="number"
                        value={level.touches}
                        onChange={(e) => updateSupport(index, 'touches', e.target.value)}
                        min="1"
                      />
                      <span>touches</span>
                    </div>
                    <button className="remove-btn" onClick={() => removeSupport(index)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Resistance Levels */}
            <div className="glass-card levels-section resistance">
              <div className="levels-header">
                <h3>
                  <Target size={18} />
                  Resistance Levels
                </h3>
                <button className="add-level-btn" onClick={addResistance}>
                  <Plus size={16} />
                </button>
              </div>
              <div className="levels-list">
                {resistanceLevels.map((level, index) => (
                  <div key={index} className="level-item">
                    <div className="level-price">
                      <input
                        type="number"
                        placeholder="Price"
                        value={level.level}
                        onChange={(e) => updateResistance(index, 'level', e.target.value)}
                      />
                    </div>
                    <select
                      value={level.strength}
                      onChange={(e) => updateResistance(index, 'strength', e.target.value)}
                      className={`strength-select ${level.strength}`}
                    >
                      <option value="weak">Weak</option>
                      <option value="moderate">Moderate</option>
                      <option value="strong">Strong</option>
                    </select>
                    <div className="touches-input">
                      <input
                        type="number"
                        value={level.touches}
                        onChange={(e) => updateResistance(index, 'touches', e.target.value)}
                        min="1"
                      />
                      <span>touches</span>
                    </div>
                    <button className="remove-btn" onClick={() => removeResistance(index)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="ms-right-panel">
            {/* Key Levels Visual */}
            <div className="glass-card key-levels-visual">
              <h3>
                <Sparkles size={18} />
                Key Levels Map
              </h3>
              <div className="levels-map">
                {/* Resistance Zone */}
                <div className="zone resistance-zone">
                  <span className="zone-label">Resistance Zone</span>
                  {resistanceLevels
                    .filter(r => parseFloat(r.level) > parseFloat(currentPrice))
                    .sort((a, b) => parseFloat(a.level) - parseFloat(b.level))
                    .map((level, index) => (
                      <div key={index} className={`level-line resistance ${level.strength}`}>
                        <span className="level-price">${parseFloat(level.level).toFixed(2)}</span>
                        <div className="level-bar">
                          <div className="bar-fill" style={{ width: `${parseInt(level.touches) * 20}%` }} />
                        </div>
                        <span className={`strength-badge ${level.strength}`}>{level.strength}</span>
                      </div>
                    ))}
                </div>

                {/* Current Price Line */}
                <div className="current-price-line">
                  <ArrowUpRight size={16} />
                  <span className="current-label">Current</span>
                  <span className="current-value">${parseFloat(currentPrice).toFixed(2)}</span>
                  <ArrowDownRight size={16} />
                </div>

                {/* Support Zone */}
                <div className="zone support-zone">
                  <span className="zone-label">Support Zone</span>
                  {supportLevels
                    .filter(s => parseFloat(s.level) < parseFloat(currentPrice))
                    .sort((a, b) => parseFloat(b.level) - parseFloat(a.level))
                    .map((level, index) => (
                      <div key={index} className={`level-line support ${level.strength}`}>
                        <span className="level-price">${parseFloat(level.level).toFixed(2)}</span>
                        <div className="level-bar">
                          <div className="bar-fill" style={{ width: `${parseInt(level.touches) * 20}%` }} />
                        </div>
                        <span className={`strength-badge ${level.strength}`}>{level.strength}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Fibonacci Levels */}
            <div className="glass-card fibonacci-section">
              <h3>
                <Activity size={18} />
                Fibonacci Retracement
              </h3>
              <div className="fib-visual">
                <div className="fib-chart">
                  {fibonacciLevels.map((fib, index) => (
                    <div
                      key={index}
                      className={`fib-level ${fib.isNearby ? 'nearby' : ''}`}
                      style={{ '--fib-color': fib.color } as React.CSSProperties}
                    >
                      <div className="fib-line" />
                      <div className="fib-info">
                        <span className="fib-label">{fib.label}</span>
                        <span className="fib-price">${fib.price.toFixed(2)}</span>
                        {fib.isNearby && <span className="fib-nearby-badge">Near price</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="fib-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#ef4444' }} />
                    <span>0% (Low)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#eab308' }} />
                    <span>Golden Zone (38.2% - 61.8%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#10b981' }} />
                    <span>100% (High)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trading Suggestions */}
            <div className="glass-card suggestions-section">
              <h3>
                <Info size={18} />
                Trading Suggestions
              </h3>
              <div className="suggestions-list">
                <div className="suggestion-item bullish">
                  <TrendingUp size={16} />
                  <span>Look for buying opportunities near strong support levels</span>
                </div>
                <div className="suggestion-item bearish">
                  <TrendingDown size={16} />
                  <span>Consider taking profits near strong resistance levels</span>
                </div>
                <div className="suggestion-item neutral">
                  <AlertTriangle size={16} />
                  <span>Wait for breakout confirmation before entering</span>
                </div>
                <div className="suggestion-item info">
                  <Activity size={16} />
                  <span>Fibonacci golden zone (38.2%-61.8%) offers high-probability entries</span>
                </div>
                <div className="suggestion-item info">
                  <Target size={16} />
                  <span>Higher timeframe structure provides stronger signals</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarketStructure
