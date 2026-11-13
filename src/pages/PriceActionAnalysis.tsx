import { useState, useMemo } from 'react'
import type { SyntheticEvent } from 'react'
import './PriceActionAnalysis.css'
import CandleDataCard from '../components/CandleDataCard'
import TradingBackground from '../components/TradingBackground'
import { detectPatterns, getTrendContext, isValidCandle, candleDirection } from '../services/ohlcvService'
import type { OHLCVData, TrendContext } from '../services/ohlcvService'
import { formatPrice } from '../utils/format'
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

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: 'higherTF', label: 'Pattern confirmed on higher timeframe' },
  { key: 'keyLevels', label: 'Price near key support/resistance' },
  { key: 'volumeConfirm', label: 'Volume supporting the move' },
  { key: 'stopLoss', label: 'Clear stop loss level defined' },
  { key: 'riskReward', label: 'Risk/Reward at least 1:2' },
  { key: 'tradingPlan', label: 'Following trading plan' }
]

const TREND_LABELS: Record<TrendContext, string> = {
  up: 'after an uptrend',
  down: 'after a downtrend',
  sideways: 'in a sideways market'
}

const toCandleInput = (c: { open: number; high: number; low: number; close: number }): CandleData => ({
  open: c.open.toString(),
  high: c.high.toString(),
  low: c.low.toString(),
  close: c.close.toString()
})

const parseCandle = (c: CandleData) => ({
  open: parseFloat(c.open),
  high: parseFloat(c.high),
  low: parseFloat(c.low),
  close: parseFloat(c.close)
})

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
  // The candle before the analysed one (for two-candle patterns)
  const [prevCandle, setPrevCandle] = useState<CandleData>({
    open: '3530',
    high: '3540',
    low: '3490',
    close: '3505'
  })
  const [trendContext, setTrendContext] = useState<TrendContext>('sideways')
  const [volume, setVolume] = useState<string>('1000000')
  // Baseline: average volume of the preceding closed candles
  const [prevVolume, setPrevVolume] = useState<string>('800000')
  const [sourceLabel, setSourceLabel] = useState<string>('Example values')
  const [timeframe, setTimeframe] = useState<string>('1h')
  const [showManual, setShowManual] = useState<boolean>(false)

  // Live data refreshes every 30s. Once the user edits values by hand, stop
  // overwriting them until they click "Apply Data" or switch pair.
  const [liveSync, setLiveSync] = useState(true)
  const pauseLiveOnEdit = (ev: SyntheticEvent) => {
    const target = ev.target as HTMLElement
    if (!target.closest('.manual-inputs')) return
    if (ev.type === 'change' || target.closest('button')) setLiveSync(false)
  }
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    higherTF: false,
    keyLevels: false,
    volumeConfirm: false,
    stopLoss: false,
    riskReward: false,
    tradingPlan: false
  })

  // Analyse the last CLOSED candle: the live candle is still forming, so its
  // shape and (partial) volume would give misleading signals
  const handleUseCandleData = (ohlcv: OHLCVData) => {
    setLiveSync(true)
    const closed = ohlcv.history
    const analysed = closed[closed.length - 1]
    const before = closed[closed.length - 2]
    const baseline = closed.slice(-21, -1)
    setCandle(toCandleInput(analysed))
    if (before) setPrevCandle(toCandleInput(before))
    setTrendContext(getTrendContext(closed.slice(0, -1)))
    setVolume(analysed.volume.toString())
    if (baseline.length > 0) {
      setPrevVolume((baseline.reduce((s, c) => s + c.volume, 0) / baseline.length).toString())
    }
    setSourceLabel(`Last closed ${ohlcv.interval} candle`)
  }

  // Candlestick structure
  // Body = |Close - Open| (absolute difference)
  // Range = High - Low (total candle range)
  // Upper Wick = High - max(Open, Close)
  // Lower Wick = min(Open, Close) - Low
  // Body % = (Body / Range) × 100
  const candleAnalysis = useMemo(() => {
    const c = parseCandle(candle)
    const p = parseCandle(prevCandle)
    const valid = isValidCandle(c)
    const range = valid ? c.high - c.low : 0

    const bodyPercent = range > 0 ? (Math.abs(c.close - c.open) / range) * 100 : 0
    const upperWickPercent = range > 0 ? ((c.high - Math.max(c.open, c.close)) / range) * 100 : 0
    const lowerWickPercent = range > 0 ? ((Math.min(c.open, c.close) - c.low) / range) * 100 : 0

    const direction = valid ? candleDirection(c) : 'neutral'
    const patterns = valid ? detectPatterns(c, isValidCandle(p) ? p : null, trendContext) : []

    return { valid, patterns, bodyPercent, upperWickPercent, lowerWickPercent, direction, range }
  }, [candle, prevCandle, trendContext])

  const candleError = !candleAnalysis.valid
    ? 'Enter positive prices where High is at least Open/Close and Low is at most Open/Close.'
    : null

  // Volume analysis
  // Volume Change % = ((Current Volume - Previous Volume) / Previous Volume) × 100
  const volumeAnalysis = useMemo(() => {
    const currentVol = parseFloat(volume)
    const prevVol = parseFloat(prevVolume)
    const volChange = prevVol > 0 ? ((currentVol - prevVol) / prevVol) * 100 : 0

    let status: 'high' | 'above-avg' | 'average' | 'low' = 'average'
    if (!Number.isFinite(volChange)) status = 'average'
    else if (volChange > 50) status = 'high'
    else if (volChange > 20) status = 'above-avg'
    else if (volChange < -20) status = 'low'

    return { volChange: Number.isFinite(volChange) ? volChange : 0, status, currentVol, prevVol }
  }, [volume, prevVolume])

  // The bias comes from the strongest pattern, not just the candle colour
  const topPattern = candleAnalysis.patterns[0]
  const bias = topPattern?.type ?? 'neutral'
  const isReversalSetup = (bias === 'bullish' && trendContext === 'down') || (bias === 'bearish' && trendContext === 'up')

  const signalStrength = useMemo(() => {
    if (!topPattern) return 0
    let score = topPattern.strength * 0.6

    // Volume confirmation (vs. the recent average)
    if (volumeAnalysis.status === 'high') score += 25
    else if (volumeAnalysis.status === 'above-avg') score += 15
    else if (volumeAnalysis.status === 'low') score -= 15

    // Reversal patterns matter most at the end of a move
    if (isReversalSetup) score += 15

    // A neutral pattern is never a trade signal on its own
    if (bias === 'neutral') score = Math.min(score, 39)

    return Math.min(Math.max(score, 0), 100)
  }, [topPattern, volumeAnalysis.status, isReversalSetup, bias])

  const getSignalLabel = (score: number) => {
    if (score >= 80) return { label: 'Strong Signal', color: 'var(--success-ink)' }
    if (score >= 60) return { label: 'Moderate Signal', color: 'var(--warning-ink)' }
    if (score >= 40) return { label: 'Weak Signal', color: 'var(--warning-ink)' }
    return { label: 'No Clear Signal', color: 'var(--text-faint)' }
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

        <div className="pa-main-grid" onChangeCapture={pauseLiveOnEdit}>
          {/* Left Panel - Candle Data & Visualization */}
          <div className="pa-left-panel">
            {/* Live Candle Data Card */}
            <div className="glass-card candle-data-section">
              <CandleDataCard pair={cryptoPair} timeframe={timeframe} onUseCandleData={handleUseCandleData} autoFill={liveSync} />
              {!liveSync && (
                <p className="live-paused-note" role="status">
                  Live updates paused because you edited values. Click Apply Data to load live data again.
                </p>
              )}
            </div>

            {/* Interactive Candle Visualization */}
            <div className="glass-card candle-visualization">
              <div className="viz-header">
                <h3>
                  <Eye size={18} />
                  Candle Structure
                </h3>
                <span className="candle-source">{sourceLabel}</span>
                <div className={`candle-type-badge ${candleAnalysis.direction}`}>
                  {candleAnalysis.direction === 'bullish' && <TrendingUp size={14} />}
                  {candleAnalysis.direction === 'bearish' && <TrendingDown size={14} />}
                  {candleAnalysis.direction === 'neutral' && <Activity size={14} />}
                  {candleAnalysis.direction.charAt(0).toUpperCase() + candleAnalysis.direction.slice(1)}
                </div>
              </div>

              <div className="candle-viz-container">
                <div className="candle-visual-wrapper">
                  <div className={`candle-visual ${candleAnalysis.direction === 'bullish' ? 'bullish' : 'bearish'}`}>
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
                    <span className="price-value">${formatPrice(parseFloat(candle.high))}</span>
                  </div>
                  <div className="price-level open-close">
                    <span className="price-label">{candleAnalysis.direction === 'bullish' ? 'Close' : 'Open'}</span>
                    <span className="price-value">
                      ${formatPrice(parseFloat(candleAnalysis.direction === 'bullish' ? candle.close : candle.open))}
                    </span>
                  </div>
                  <div className="price-level open-close">
                    <span className="price-label">{candleAnalysis.direction === 'bullish' ? 'Open' : 'Close'}</span>
                    <span className="price-value">
                      ${formatPrice(parseFloat(candleAnalysis.direction === 'bullish' ? candle.open : candle.close))}
                    </span>
                  </div>
                  <div className="price-level low">
                    <span className="price-label">Low</span>
                    <span className="price-value">${formatPrice(parseFloat(candle.low))}</span>
                  </div>
                </div>
              </div>

              {/* Volume Bar */}
              <div className="volume-section">
                <div className="volume-header">
                  <Volume2 size={16} />
                  <span>Volume vs. Average</span>
                  <span className={`volume-badge ${volumeAnalysis.status}`}>
                    {volumeAnalysis.volChange > 0 ? '+' : ''}{volumeAnalysis.volChange.toFixed(0)}%
                  </span>
                </div>
                <div className="volume-bars">
                  <div className="vol-bar prev">
                    <div className="bar-fill" style={{ height: '60%' }} />
                    <span>Avg</span>
                  </div>
                  <div className={`vol-bar current ${volumeAnalysis.status}`}>
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.min(Math.max(60 * (1 + volumeAnalysis.volChange / 100), 4), 100)}%` }}
                    />
                    <span>Candle</span>
                  </div>
                </div>
              </div>
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
                <Layers size={18} />
                <span>Manual OHLCV Input</span>
              </div>
              {showManual ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {showManual && (
              <div className="glass-card manual-inputs animated-slide">
                {candleError && <p className="input-error" role="alert">{candleError}</p>}
                <div className="input-grid">
                  <div className="input-group">
                    <label>Open</label>
                    <input
                      type="number"
                      value={candle.open}
                      onChange={(e) => setCandle({ ...candle, open: e.target.value })}
                      step="any"
                    />
                  </div>
                  <div className="input-group">
                    <label>High</label>
                    <input
                      type="number"
                      value={candle.high}
                      onChange={(e) => setCandle({ ...candle, high: e.target.value })}
                      step="any"
                    />
                  </div>
                  <div className="input-group">
                    <label>Low</label>
                    <input
                      type="number"
                      value={candle.low}
                      onChange={(e) => setCandle({ ...candle, low: e.target.value })}
                      step="any"
                    />
                  </div>
                  <div className="input-group">
                    <label>Close</label>
                    <input
                      type="number"
                      value={candle.close}
                      onChange={(e) => setCandle({ ...candle, close: e.target.value })}
                      step="any"
                    />
                  </div>
                  <div className="input-group">
                    <label>Candle Volume</label>
                    <input
                      type="number"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Average Volume</label>
                    <input
                      type="number"
                      value={prevVolume}
                      onChange={(e) => setPrevVolume(e.target.value)}
                    />
                  </div>
                </div>

                <h4 className="manual-subheading">Previous Candle (for two-candle patterns)</h4>
                <div className="input-grid">
                  {(['open', 'high', 'low', 'close'] as const).map(field => (
                    <div className="input-group" key={field}>
                      <label>Prev {field.charAt(0).toUpperCase() + field.slice(1)}</label>
                      <input
                        type="number"
                        value={prevCandle[field]}
                        onChange={(e) => setPrevCandle({ ...prevCandle, [field]: e.target.value })}
                        step="any"
                      />
                    </div>
                  ))}
                  <div className="input-group">
                    <label>Prior Trend</label>
                    <select value={trendContext} onChange={(e) => setTrendContext(e.target.value as TrendContext)}>
                      <option value="up">Uptrend</option>
                      <option value="down">Downtrend</option>
                      <option value="sideways">Sideways</option>
                    </select>
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
              <p className="pattern-context">
                {candleAnalysis.valid ? `${sourceLabel}, ${TREND_LABELS[trendContext]}` : candleError}
              </p>
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
            <div className={`glass-card signal-section ${bias}`}>
              <h3>
                <Target size={18} />
                Trading Signal
              </h3>
              <div className="signal-content">
                <div className="signal-main">
                  <div className={`signal-icon ${bias}`}>
                    {bias === 'bullish' && <TrendingUp size={32} />}
                    {bias === 'bearish' && <TrendingDown size={32} />}
                    {bias === 'neutral' && <Activity size={32} />}
                  </div>
                  <div className="signal-info">
                    <span className="signal-direction">
                      {bias === 'neutral' ? 'NO CLEAR BIAS' : `${bias.toUpperCase()} BIAS`}
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
                  {isReversalSetup && (
                    <div className="detail-item positive">
                      <CheckCircle2 size={16} />
                      <span>Reversal pattern {TREND_LABELS[trendContext]}</span>
                    </div>
                  )}
                  {bias === 'neutral' && candleAnalysis.valid && (
                    <div className="detail-item warning">
                      <AlertTriangle size={16} />
                      <span>Indecision - wait for the next candle</span>
                    </div>
                  )}
                  {(topPattern?.strength ?? 0) >= 70 && (
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
                {CHECKLIST_ITEMS.map(item => (
                  <div
                    key={item.key}
                    className={`checklist-item ${checklist[item.key] ? 'checked' : ''}`}
                    role="checkbox"
                    aria-checked={checklist[item.key]}
                    tabIndex={0}
                    onClick={() => toggleChecklistItem(item.key)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault()
                        toggleChecklistItem(item.key)
                      }
                    }}
                  >
                    <div className="check-box">
                      {checklist[item.key] && <Check size={14} />}
                    </div>
                    <span>{item.label}</span>
                  </div>
                ))}
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
