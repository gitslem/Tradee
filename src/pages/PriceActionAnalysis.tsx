import { useState, useMemo } from 'react'
import './PriceActionAnalysis.css'
import CandleDataCard from '../components/CandleDataCard'
import TradingBackground from '../components/TradingBackground'
import type { OHLCVData } from '../services/ohlcvService'
import {
  BarChart3, TrendingUp, TrendingDown, Activity, Zap, Target,
  AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp,
  Volume2, Gauge, Layers, Eye, Check, Info
} from 'lucide-react'

interface CandleData {
  open: string
  high: string
  low: string
  close: string
}

interface PatternInfo {
  name: string
  type: 'bullish' | 'bearish' | 'neutral'
  strength: number
  description: string
}

const TIMEFRAME_OPTIONS = [
  { value: '1m', label: '1M' },
  { value: '5m', label: '5M' },
  { value: '15m', label: '15M' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
]

const PriceActionAnalysis = () => {
  const [cryptoPair, setCryptoPair] = useState<string>('ETH/USDT')
  const [candle, setCandle] = useState<CandleData>({
    open: '3500',
    high: '3550',
    low: '3480',
    close: '3520'
  })
  const [volume, setVolume] = useState<string>('1000000')
  const [prevVolume, setPrevVolume] = useState<string>('800000')
  const [timeframe, setTimeframe] = useState<string>('1h')
  const [showManual, setShowManual] = useState<boolean>(false)
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    higherTF: false,
    keyLevels: false,
    volumeConfirm: false,
    stopLoss: false,
    riskReward: false,
    tradingPlan: false
  })

  const handleUseCandleData = (ohlcv: OHLCVData) => {
    setCandle({
      open: ohlcv.current.open.toString(),
      high: ohlcv.current.high.toString(),
      low: ohlcv.current.low.toString(),
      close: ohlcv.current.close.toString()
    })
    setVolume(ohlcv.current.volume.toString())
    setPrevVolume(ohlcv.previous.volume.toString())
  }

  // Candlestick structure
  // Body = |Close - Open| (absolute difference)
  // Range = High - Low (total candle range)
  // Upper Wick = High - max(Open, Close)
  // Lower Wick = min(Open, Close) - Low
  // Body % = (Body / Range) × 100
  const candleAnalysis = useMemo(() => {
    const open = parseFloat(candle.open)
    const high = parseFloat(candle.high)
    const low = parseFloat(candle.low)
    const close = parseFloat(candle.close)

    const body = Math.abs(close - open)
    const range = high - low
    const upperWick = high - Math.max(open, close)
    const lowerWick = Math.min(open, close) - low

    const bodyPercent = range > 0 ? (body / range) * 100 : 0
    const upperWickPercent = range > 0 ? (upperWick / range) * 100 : 0
    const lowerWickPercent = range > 0 ? (lowerWick / range) * 100 : 0

    const isBullish = close > open
    const patterns: PatternInfo[] = []

    // Enhanced Pattern Recognition
    if (bodyPercent < 10 && range > 0) {
      patterns.push({
        name: 'Doji',
        type: 'neutral',
        strength: 70,
        description: 'Market indecision - potential reversal signal'
      })
    }

    if (bodyPercent > 80) {
      patterns.push({
        name: isBullish ? 'Bullish Marubozu' : 'Bearish Marubozu',
        type: isBullish ? 'bullish' : 'bearish',
        strength: 90,
        description: isBullish ? 'Strong buying pressure' : 'Strong selling pressure'
      })
    }

    if (upperWickPercent > 60 && bodyPercent < 30) {
      patterns.push({
        name: 'Shooting Star',
        type: 'bearish',
        strength: 75,
        description: 'Sellers rejected higher prices - bearish reversal'
      })
    }

    if (lowerWickPercent > 60 && bodyPercent < 30) {
      patterns.push({
        name: 'Hammer',
        type: 'bullish',
        strength: 75,
        description: 'Buyers rejected lower prices - bullish reversal'
      })
    }

    if (bodyPercent > 50 && upperWickPercent < 20 && lowerWickPercent < 20) {
      patterns.push({
        name: isBullish ? 'Bullish Engulfing' : 'Bearish Engulfing',
        type: isBullish ? 'bullish' : 'bearish',
        strength: 85,
        description: isBullish ? 'Strong bullish momentum' : 'Strong bearish momentum'
      })
    }

    if (upperWickPercent > 40 && lowerWickPercent > 40) {
      patterns.push({
        name: 'Spinning Top',
        type: 'neutral',
        strength: 50,
        description: 'High volatility and indecision'
      })
    }

    // No pattern detected
    if (patterns.length === 0) {
      patterns.push({
        name: 'Standard Candle',
        type: isBullish ? 'bullish' : 'bearish',
        strength: 40,
        description: 'No significant pattern detected'
      })
    }

    return { patterns, bodyPercent, upperWickPercent, lowerWickPercent, isBullish, range }
  }, [candle])

  // Volume analysis
  // Volume Change % = ((Current Volume - Previous Volume) / Previous Volume) × 100
  const volumeAnalysis = useMemo(() => {
    const currentVol = parseFloat(volume)
    const prevVol = parseFloat(prevVolume)
    const volChange = prevVol > 0 ? ((currentVol - prevVol) / prevVol) * 100 : 0

    let status: 'high' | 'above-avg' | 'average' | 'low' = 'average'
    let sentiment = 'neutral'

    if (volChange > 50) {
      status = 'high'
      sentiment = candleAnalysis.isBullish ? 'bullish' : 'bearish'
    } else if (volChange > 20) {
      status = 'above-avg'
      sentiment = candleAnalysis.isBullish ? 'bullish' : 'bearish'
    } else if (volChange < -20) {
      status = 'low'
      sentiment = 'neutral'
    }

    return { volChange, status, sentiment, currentVol, prevVol }
  }, [volume, prevVolume, candleAnalysis.isBullish])

  const signalStrength = useMemo(() => {
    let score = 0

    // Pattern strength
    const patternScore = candleAnalysis.patterns[0]?.strength || 0
    score += patternScore * 0.4

    // Volume confirmation
    if (volumeAnalysis.status === 'high') score += 30
    else if (volumeAnalysis.status === 'above-avg') score += 20
    else if (volumeAnalysis.status === 'low') score -= 10

    // Trend alignment
    if (candleAnalysis.isBullish && volumeAnalysis.sentiment === 'bullish') score += 15
    if (!candleAnalysis.isBullish && volumeAnalysis.sentiment === 'bearish') score += 15

    return Math.min(Math.max(score, 0), 100)
  }, [candleAnalysis, volumeAnalysis])

  const getSignalLabel = (score: number) => {
    if (score >= 80) return { label: 'Strong Signal', color: '#10b981' }
    if (score >= 60) return { label: 'Moderate Signal', color: '#f59e0b' }
    if (score >= 40) return { label: 'Weak Signal', color: '#f97316' }
    return { label: 'No Clear Signal', color: '#6b7280' }
  }

  const signalInfo = getSignalLabel(signalStrength)

  const toggleChecklistItem = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const completedChecks = Object.values(checklist).filter(Boolean).length
  const totalChecks = Object.keys(checklist).length

  return (
    <div className="price-action-page">
      <TradingBackground variant="price-action" />

      {/* Hero Section */}
      <div className="pa-hero">
        <div className="hero-icon">
          <BarChart3 size={40} />
        </div>
        <h1>Price Action Analysis</h1>
        <p>Identify candlestick patterns and trading signals with real-time data</p>
      </div>

      <div className="pa-container">
        {/* Top Bar - Pair & Timeframe Selection */}
        <div className="pa-top-bar glass-card">
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

          <div className="timeframe-selector">
            {TIMEFRAME_OPTIONS.map(tf => (
              <button
                key={tf.value}
                className={`tf-btn ${timeframe === tf.value ? 'active' : ''}`}
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="signal-strength-badge" style={{ borderColor: signalInfo.color }}>
            <Gauge size={18} style={{ color: signalInfo.color }} />
            <span style={{ color: signalInfo.color }}>{signalInfo.label}</span>
            <div className="strength-bar">
              <div
                className="strength-fill"
                style={{ width: `${signalStrength}%`, background: signalInfo.color }}
              />
            </div>
          </div>
        </div>

        <div className="pa-main-grid">
          {/* Left Panel - Candle Data & Visualization */}
          <div className="pa-left-panel">
            {/* Live Candle Data Card */}
            <div className="glass-card candle-data-section">
              <CandleDataCard pair={cryptoPair} timeframe={timeframe} onUseCandleData={handleUseCandleData} autoFill={true} />
            </div>

            {/* Interactive Candle Visualization */}
            <div className="glass-card candle-visualization">
              <div className="viz-header">
                <h3>
                  <Eye size={18} />
                  Candle Structure
                </h3>
                <div className={`candle-type-badge ${candleAnalysis.isBullish ? 'bullish' : 'bearish'}`}>
                  {candleAnalysis.isBullish ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {candleAnalysis.isBullish ? 'Bullish' : 'Bearish'}
                </div>
              </div>

              <div className="candle-viz-container">
                <div className="candle-visual-wrapper">
                  <div className={`candle-visual ${candleAnalysis.isBullish ? 'bullish' : 'bearish'}`}>
                    <div
                      className="wick upper-wick"
                      style={{ height: `${candleAnalysis.upperWickPercent}%` }}
                    >
                      <span className="wick-label">{candleAnalysis.upperWickPercent.toFixed(0)}%</span>
                    </div>
                    <div
                      className="body"
                      style={{ height: `${Math.max(candleAnalysis.bodyPercent, 5)}%` }}
                    >
                      <span className="body-label">{candleAnalysis.bodyPercent.toFixed(0)}%</span>
                    </div>
                    <div
                      className="wick lower-wick"
                      style={{ height: `${candleAnalysis.lowerWickPercent}%` }}
                    >
                      <span className="wick-label">{candleAnalysis.lowerWickPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="candle-prices">
                  <div className="price-level high">
                    <span className="price-label">High</span>
                    <span className="price-value">${parseFloat(candle.high).toFixed(2)}</span>
                  </div>
                  <div className="price-level open-close">
                    <span className="price-label">{candleAnalysis.isBullish ? 'Close' : 'Open'}</span>
                    <span className="price-value">
                      ${candleAnalysis.isBullish ? parseFloat(candle.close).toFixed(2) : parseFloat(candle.open).toFixed(2)}
                    </span>
                  </div>
                  <div className="price-level open-close">
                    <span className="price-label">{candleAnalysis.isBullish ? 'Open' : 'Close'}</span>
                    <span className="price-value">
                      ${candleAnalysis.isBullish ? parseFloat(candle.open).toFixed(2) : parseFloat(candle.close).toFixed(2)}
                    </span>
                  </div>
                  <div className="price-level low">
                    <span className="price-label">Low</span>
                    <span className="price-value">${parseFloat(candle.low).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Volume Bar */}
              <div className="volume-section">
                <div className="volume-header">
                  <Volume2 size={16} />
                  <span>Volume Analysis</span>
                  <span className={`volume-badge ${volumeAnalysis.status}`}>
                    {volumeAnalysis.volChange > 0 ? '+' : ''}{volumeAnalysis.volChange.toFixed(0)}%
                  </span>
                </div>
                <div className="volume-bars">
                  <div className="vol-bar prev">
                    <div className="bar-fill" style={{ height: '60%' }} />
                    <span>Prev</span>
                  </div>
                  <div className={`vol-bar current ${volumeAnalysis.status}`}>
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.min(60 + volumeAnalysis.volChange * 0.3, 100)}%` }}
                    />
                    <span>Now</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Input Toggle */}
            <div className="glass-card manual-toggle" onClick={() => setShowManual(!showManual)}>
              <div className="toggle-content">
                <Layers size={18} />
                <span>Manual OHLCV Input</span>
              </div>
              {showManual ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {showManual && (
              <div className="glass-card manual-inputs animated-slide">
                <div className="input-grid">
                  <div className="input-group">
                    <label>Open</label>
                    <input
                      type="number"
                      value={candle.open}
                      onChange={(e) => setCandle({ ...candle, open: e.target.value })}
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>High</label>
                    <input
                      type="number"
                      value={candle.high}
                      onChange={(e) => setCandle({ ...candle, high: e.target.value })}
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>Low</label>
                    <input
                      type="number"
                      value={candle.low}
                      onChange={(e) => setCandle({ ...candle, low: e.target.value })}
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>Close</label>
                    <input
                      type="number"
                      value={candle.close}
                      onChange={(e) => setCandle({ ...candle, close: e.target.value })}
                      step="0.01"
                    />
                  </div>
                  <div className="input-group">
                    <label>Volume</label>
                    <input
                      type="number"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Prev Volume</label>
                    <input
                      type="number"
                      value={prevVolume}
                      onChange={(e) => setPrevVolume(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Analysis Results */}
          <div className="pa-right-panel">
            {/* Pattern Recognition */}
            <div className="glass-card pattern-section">
              <h3>
                <Zap size={18} />
                Pattern Recognition
              </h3>
              <div className="patterns-list">
                {candleAnalysis.patterns.map((pattern, index) => (
                  <div key={index} className={`pattern-card ${pattern.type}`}>
                    <div className="pattern-header">
                      <span className="pattern-name">{pattern.name}</span>
                      <div className="pattern-strength">
                        <div className="strength-dots">
                          {[1, 2, 3, 4, 5].map(dot => (
                            <div
                              key={dot}
                              className={`dot ${dot <= Math.ceil(pattern.strength / 20) ? 'active' : ''}`}
                            />
                          ))}
                        </div>
                        <span>{pattern.strength}%</span>
                      </div>
                    </div>
                    <p className="pattern-desc">{pattern.description}</p>
                    <div className={`pattern-type-badge ${pattern.type}`}>
                      {pattern.type === 'bullish' && <TrendingUp size={12} />}
                      {pattern.type === 'bearish' && <TrendingDown size={12} />}
                      {pattern.type === 'neutral' && <Activity size={12} />}
                      {pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trading Signal */}
            <div className={`glass-card signal-section ${candleAnalysis.isBullish ? 'bullish' : 'bearish'}`}>
              <h3>
                <Target size={18} />
                Trading Signal
              </h3>
              <div className="signal-content">
                <div className="signal-main">
                  <div className={`signal-icon ${candleAnalysis.isBullish ? 'bullish' : 'bearish'}`}>
                    {candleAnalysis.isBullish ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                  </div>
                  <div className="signal-info">
                    <span className="signal-direction">
                      {candleAnalysis.isBullish ? 'BULLISH' : 'BEARISH'} BIAS
                    </span>
                    <span className="signal-score">
                      Signal Strength: {signalStrength.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="signal-details">
                  {volumeAnalysis.status === 'high' && (
                    <div className="detail-item positive">
                      <CheckCircle2 size={16} />
                      <span>High volume confirms move</span>
                    </div>
                  )}
                  {volumeAnalysis.status === 'above-avg' && (
                    <div className="detail-item positive">
                      <CheckCircle2 size={16} />
                      <span>Above average volume</span>
                    </div>
                  )}
                  {volumeAnalysis.status === 'low' && (
                    <div className="detail-item warning">
                      <AlertTriangle size={16} />
                      <span>Low volume - weak conviction</span>
                    </div>
                  )}
                  {candleAnalysis.patterns[0]?.strength >= 70 && (
                    <div className="detail-item positive">
                      <CheckCircle2 size={16} />
                      <span>Strong pattern detected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pre-Trade Checklist */}
            <div className="glass-card checklist-section">
              <div className="checklist-header">
                <h3>
                  <Check size={18} />
                  Pre-Trade Checklist
                </h3>
                <span className="checklist-progress">
                  {completedChecks}/{totalChecks}
                </span>
              </div>

              <div className="checklist-items">
                <div
                  className={`checklist-item ${checklist.higherTF ? 'checked' : ''}`}
                  onClick={() => toggleChecklistItem('higherTF')}
                >
                  <div className="check-box">
                    {checklist.higherTF && <Check size={14} />}
                  </div>
                  <span>Pattern confirmed on higher timeframe</span>
                </div>
                <div
                  className={`checklist-item ${checklist.keyLevels ? 'checked' : ''}`}
                  onClick={() => toggleChecklistItem('keyLevels')}
                >
                  <div className="check-box">
                    {checklist.keyLevels && <Check size={14} />}
                  </div>
                  <span>Price near key support/resistance</span>
                </div>
                <div
                  className={`checklist-item ${checklist.volumeConfirm ? 'checked' : ''}`}
                  onClick={() => toggleChecklistItem('volumeConfirm')}
                >
                  <div className="check-box">
                    {checklist.volumeConfirm && <Check size={14} />}
                  </div>
                  <span>Volume supporting the move</span>
                </div>
                <div
                  className={`checklist-item ${checklist.stopLoss ? 'checked' : ''}`}
                  onClick={() => toggleChecklistItem('stopLoss')}
                >
                  <div className="check-box">
                    {checklist.stopLoss && <Check size={14} />}
                  </div>
                  <span>Clear stop loss level defined</span>
                </div>
                <div
                  className={`checklist-item ${checklist.riskReward ? 'checked' : ''}`}
                  onClick={() => toggleChecklistItem('riskReward')}
                >
                  <div className="check-box">
                    {checklist.riskReward && <Check size={14} />}
                  </div>
                  <span>Risk/Reward at least 1:2</span>
                </div>
                <div
                  className={`checklist-item ${checklist.tradingPlan ? 'checked' : ''}`}
                  onClick={() => toggleChecklistItem('tradingPlan')}
                >
                  <div className="check-box">
                    {checklist.tradingPlan && <Check size={14} />}
                  </div>
                  <span>Following trading plan</span>
                </div>
              </div>

              <div className="checklist-bar">
                <div
                  className="checklist-fill"
                  style={{ width: `${(completedChecks / totalChecks) * 100}%` }}
                />
              </div>
            </div>

            {/* Tips Section */}
            <div className="glass-card tips-section">
              <h3>
                <Info size={18} />
                Price Action Tips
              </h3>
              <div className="tips-grid">
                <div className="tip-item">
                  <Clock size={16} />
                  <span>Always check higher timeframes for context</span>
                </div>
                <div className="tip-item">
                  <Volume2 size={16} />
                  <span>Strong moves need volume confirmation</span>
                </div>
                <div className="tip-item">
                  <Eye size={16} />
                  <span>Wait for confirmation - don't predict</span>
                </div>
                <div className="tip-item">
                  <Target size={16} />
                  <span>Best entries are near key levels</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PriceActionAnalysis
