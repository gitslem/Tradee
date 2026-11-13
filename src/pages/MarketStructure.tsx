import { useState, useMemo, useRef } from 'react'
import type { SyntheticEvent } from 'react'
import './MarketStructure.css'
import CandleDataCard from '../components/CandleDataCard'
import MultiTimeframeTrend from '../components/MultiTimeframeTrend'
import TradingBackground from '../components/TradingBackground'
import { getMarketStructure, classifyStructure } from '../services/ohlcvService'
import type { OHLCVData, PriceLevel } from '../services/ohlcvService'
import { formatPrice } from '../utils/format'
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

const toRow = (l: PriceLevel): SupportResistance => ({
  level: String(Number(l.price.toPrecision(6))),
  strength: l.strength,
  touches: String(l.touches)
})

const TREND_COLORS: Record<string, string> = {
  uptrend: 'var(--success-ink)',
  downtrend: 'var(--danger-ink)',
  expansion: 'var(--warning-ink)',
  range: 'var(--violet-ink)',
  unknown: 'var(--text-faint)'
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

  // Live data refreshes every 30s. Once the user edits values by hand, stop
  // overwriting them until they click "Apply Data" or switch pair.
  const [liveSync, setLiveSync] = useState(true)
  // Bumped on every manual edit so a slow fetch can't overwrite it
  const editVersion = useRef(0)
  const requestId = useRef(0)
  const [structureInfo, setStructureInfo] = useState<{ candles: number; interval: string; swings: number } | null>(null)
  const pauseLiveOnEdit = (ev: SyntheticEvent) => {
    const target = ev.target as HTMLElement
    if (!target.closest('.manual-inputs, .levels-section')) return
    if (ev.type === 'change' || target.closest('button')) {
      editVersion.current++
      setLiveSync(false)
      setStructureInfo(null)
    }
  }

  const [supportLevels, setSupportLevels] = useState<SupportResistance[]>([
    { level: '3400', strength: 'strong', touches: '5' },
    { level: '3200', strength: 'moderate', touches: '3' }
  ])

  const [resistanceLevels, setResistanceLevels] = useState<SupportResistance[]>([
    { level: '3600', strength: 'moderate', touches: '3' },
    { level: '3800', strength: 'strong', touches: '4' }
  ])

  const handleUsePriceData = async (ohlcv: OHLCVData) => {
    setLiveSync(true)
    setCurrentPrice(ohlcv.current.close.toString())

    const id = ++requestId.current
    const edits = editVersion.current
    const structure = await getMarketStructure(ohlcv.symbol, ohlcv.interval)
    // Drop stale responses (pair changed, newer request, or user edited meanwhile)
    if (!structure || id !== requestId.current || edits !== editVersion.current) return

    setCurrentPrice(structure.currentPrice.toString())
    if (structure.lastHigh !== null) setRecentHigh(structure.lastHigh.toString())
    if (structure.lastLow !== null) setRecentLow(structure.lastLow.toString())
    if (structure.prevHigh !== null) setPrevHigh(structure.prevHigh.toString())
    if (structure.prevLow !== null) setPrevLow(structure.prevLow.toString())
    setSupportLevels(structure.support.map(toRow))
    setResistanceLevels(structure.resistance.map(toRow))
    setStructureInfo({
      candles: structure.candlesAnalyzed,
      interval: structure.interval,
      swings: structure.swingHighs.length + structure.swingLows.length
    })
  }

  // Fibonacci retracement levels between the last swing high and low.
  // In an uptrend the pullback is measured down from the high
  //   (Price = High - Range × Ratio); otherwise up from the low
  //   (Price = Low + Range × Ratio).
  // 38.2% - 61.8% is commonly treated as the key retracement zone
  const structureTrend = classifyStructure(
    parseFloat(recentHigh), parseFloat(prevHigh), parseFloat(recentLow), parseFloat(prevLow)
  )
  const fibFromHigh = structureTrend === 'uptrend'
  const fibonacciLevels = useMemo(() => {
    const high = parseFloat(recentHigh)
    const low = parseFloat(recentLow)
    const current = parseFloat(currentPrice)
    if (!(high > low) || !(low > 0)) return []
    const diff = high - low

    return FIBONACCI_LEVELS.map(fib => {
      const price = fibFromHigh ? high - diff * fib.level : low + diff * fib.level
      return {
        ...fib,
        price,
        isNearby: current > 0 && Math.abs(price - current) / current < 0.01
      }
    })
  }, [recentHigh, recentLow, currentPrice, fibFromHigh])

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

    const values = [current, high, low, pHigh, pLow]
    const trend = values.every(v => Number.isFinite(v) && v > 0)
      ? classifyStructure(high, pHigh, low, pLow)
      : 'unknown'

    // Dow Theory Market Structure Detection
    const trendDescription = {
      uptrend: 'Higher high and higher low between the last two swings',
      downtrend: 'Lower high and lower low between the last two swings',
      expansion: 'Higher high but lower low - range expanding, high volatility',
      range: 'Lower high and higher low - consolidating',
      unknown: 'Enter valid swing highs and lows to detect structure'
    }[trend]

    // Range Position Calculation
    const validRange = high > low && Number.isFinite(current)
    const rangePosition = validRange ? ((current - low) / (high - low)) * 100 : NaN
    let positionLabel = ''
    let positionType: 'warning' | 'neutral' | 'info' = 'neutral'

    if (!validRange) {
      positionLabel = 'Insufficient range'
    } else if (rangePosition > 100) {
      positionLabel = 'Above the swing high (breakout)'
      positionType = 'warning'
    } else if (rangePosition < 0) {
      positionLabel = 'Below the swing low (breakdown)'
      positionType = 'info'
    } else if (rangePosition > 80) {
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

  const getTrendColor = () => TREND_COLORS[marketAnalysis.trend]

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
            <div className="trend-icon" style={{ background: `color-mix(in srgb, ${getTrendColor()} 14%, transparent)`, color: getTrendColor() }}>
              {getTrendIcon()}
            </div>
            <div className="trend-info">
              <span className="trend-label" style={{ color: getTrendColor() }}>
                {marketAnalysis.trend.toUpperCase()}
              </span>
              <span className="trend-desc">{marketAnalysis.trendDescription}</span>
              <span className="trend-source">
                {structureInfo
                  ? `From ${structureInfo.swings} swing points in the last ${structureInfo.candles} closed ${structureInfo.interval} candles`
                  : 'From your manual values'}
              </span>
            </div>
          </div>

          <div className="price-display">
            <span className="price-label">Current Price</span>
            <span className="price-value">${formatPrice(parseFloat(currentPrice))}</span>
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
                  style={{ left: `${Number.isFinite(marketAnalysis.rangePosition) ? Math.min(Math.max(marketAnalysis.rangePosition, 0), 100) : 50}%` }}
                />
              </div>
              <div className="range-labels">
                <span>${formatPrice(parseFloat(recentLow))}</span>
                <span>{Number.isFinite(marketAnalysis.rangePosition) ? `${marketAnalysis.rangePosition.toFixed(0)}%` : '—'}</span>
                <span>${formatPrice(parseFloat(recentHigh))}</span>
              </div>
            </div>
          </div>
        </div>

        <MultiTimeframeTrend key={cryptoPair} pair={cryptoPair} />

        <div className="ms-main-grid" onChangeCapture={pauseLiveOnEdit} onClickCapture={pauseLiveOnEdit}>
          {/* Left Panel */}
          <div className="ms-left-panel">
            {/* Pair Selector */}
            <div className="glass-card pair-section">
              <div className="pair-selector">
                <label>Trading Pair</label>
                <select value={cryptoPair} onChange={(e) => { setCryptoPair(e.target.value); setLiveSync(true) }}>
                  <option>BTC/USDT</option>
                  <option>ETH/USDT</option>
                  <option>BNB/USDT</option>
                  <option>SOL/USDT</option>
                  <option>XRP/USDT</option>
                  <option>ADA/USDT</option>
                  <option>DOGE/USDT</option>
                  <option>POL/USDT</option>
                  <option>DOT/USDT</option>
                  <option>AVAX/USDT</option>
                </select>
              </div>
            </div>

            {/* Live Price Data */}
            <div className="glass-card price-data-section">
              <CandleDataCard pair={cryptoPair} onUseCandleData={handleUsePriceData} autoFill={liveSync} />
              {!liveSync && (
                <p className="live-paused-note" role="status">
                  Live updates paused because you edited values. Click Apply Data to load live data again.
                </p>
              )}
            </div>

            {/* Manual Input Toggle */}
            <div
              className="glass-card manual-toggle"
              role="button"
              tabIndex={0}
              aria-expanded={showManual}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setShowManual(!showManual) } }}
              onClick={() => setShowManual(!showManual)}
            >
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
                      step="any"
                    />
                  </div>
                  <div className="input-group">
                    <label>Last Swing High</label>
                    <input
                      type="number"
                      value={recentHigh}
                      onChange={(e) => setRecentHigh(e.target.value)}
                      step="any"
                    />
                  </div>
                  <div className="input-group">
                    <label>Last Swing Low</label>
                    <input
                      type="number"
                      value={recentLow}
                      onChange={(e) => setRecentLow(e.target.value)}
                      step="any"
                    />
                  </div>
                  <div className="input-group">
                    <label>Previous Swing High</label>
                    <input
                      type="number"
                      value={prevHigh}
                      onChange={(e) => setPrevHigh(e.target.value)}
                      step="any"
                    />
                  </div>
                  <div className="input-group">
                    <label>Previous Swing Low</label>
                    <input
                      type="number"
                      value={prevLow}
                      onChange={(e) => setPrevLow(e.target.value)}
                      step="any"
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
                <button className="add-level-btn" onClick={addSupport} aria-label="Add support level">
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
                        aria-label="Support price"
                        step="any"
                      />
                    </div>
                    <select
                      value={level.strength}
                      onChange={(e) => updateSupport(index, 'strength', e.target.value)}
                      aria-label="Support strength"
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
                        aria-label="Support touches"
                        min="0"
                      />
                      <span>touches</span>
                    </div>
                    <button className="remove-btn" onClick={() => removeSupport(index)} aria-label="Remove support level">
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
                <button className="add-level-btn" onClick={addResistance} aria-label="Add resistance level">
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
                        aria-label="Resistance price"
                        step="any"
                      />
                    </div>
                    <select
                      value={level.strength}
                      onChange={(e) => updateResistance(index, 'strength', e.target.value)}
                      aria-label="Resistance strength"
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
                        aria-label="Resistance touches"
                        min="0"
                      />
                      <span>touches</span>
                    </div>
                    <button className="remove-btn" onClick={() => removeResistance(index)} aria-label="Remove resistance level">
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
                    .filter(r => parseFloat(r.level) >= parseFloat(currentPrice))
                    .sort((a, b) => parseFloat(a.level) - parseFloat(b.level))
                    .map((level, index) => (
                      <div key={index} className={`level-line resistance ${level.strength}`}>
                        <span className="level-price">${formatPrice(parseFloat(level.level))}</span>
                        <div className="level-bar">
                          <div className="bar-fill" style={{ width: `${Math.min(Math.max((parseInt(level.touches) || 0) * 20, 4), 100)}%` }} />
                        </div>
                        <span className={`strength-badge ${level.strength}`}>{level.strength}</span>
                      </div>
                    ))}
                </div>

                {/* Current Price Line */}
                <div className="current-price-line">
                  <ArrowUpRight size={16} />
                  <span className="current-label">Current</span>
                  <span className="current-value">${formatPrice(parseFloat(currentPrice))}</span>
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
                        <span className="level-price">${formatPrice(parseFloat(level.level))}</span>
                        <div className="level-bar">
                          <div className="bar-fill" style={{ width: `${Math.min(Math.max((parseInt(level.touches) || 0) * 20, 4), 100)}%` }} />
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
              <p className="fib-direction">
                {fibFromHigh
                  ? 'Uptrend: pullback levels measured down from the swing high'
                  : 'Measured up from the swing low'}
              </p>
              <div className="fib-visual">
                {fibonacciLevels.length === 0 && (
                  <p className="fib-empty">Swing high must be above swing low to draw retracement levels.</p>
                )}
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
                        <span className="fib-price">${formatPrice(fib.price)}</span>
                        {fib.isNearby && <span className="fib-nearby-badge">Near price</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="fib-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#ef4444' }} />
                    <span>0% ({fibFromHigh ? 'Swing high' : 'Swing low'})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#eab308' }} />
                    <span>Golden Zone (38.2% - 61.8%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#10b981' }} />
                    <span>100% ({fibFromHigh ? 'Swing low' : 'Swing high'})</span>
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
