import { useEffect, useState } from 'react'
import { Target, Layers, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { getMarketStructure, getOHLCVData, detectPatterns, getTrendContext } from '../services/ohlcvService'
import type { PatternInfo, PatternType, PriceLevel } from '../services/ohlcvService'
import { formatPrice } from '../utils/format'
import './PriceContextPanel.css'

// The next timeframe up, used for confirmation
const HIGHER_TF: Record<string, string> = {
  '1m': '5m',
  '5m': '15m',
  '15m': '1h',
  '1h': '4h',
  '4h': '1d',
  '1d': '1w'
}

interface ContextData {
  price: number
  support: PriceLevel | null
  resistance: PriceLevel | null
  higherPattern: PatternInfo | null
}

// A level within this distance counts as "near"
const NEAR_LEVEL_PCT = 0.75

interface Props {
  pair: string
  timeframe: string
  /** Bias of the pattern currently being analysed */
  bias: PatternType
}

/**
 * Context for the analysed candle: the nearest measured support/resistance
 * and whether the next timeframe up agrees. Remount (key) per pair/timeframe.
 */
const PriceContextPanel = ({ pair, timeframe, bias }: Props) => {
  const [data, setData] = useState<ContextData | null>(null)
  const [failed, setFailed] = useState(false)
  const higherTf = HIGHER_TF[timeframe] ?? '1d'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [structure, higher] = await Promise.all([
        getMarketStructure(pair, timeframe, 150),
        getOHLCVData(pair, higherTf)
      ])
      if (cancelled) return
      if (!structure) {
        setFailed(true)
        return
      }
      let higherPattern: PatternInfo | null = null
      if (higher) {
        const closed = higher.history
        higherPattern = detectPatterns(
          closed[closed.length - 1],
          closed[closed.length - 2],
          getTrendContext(closed.slice(0, -1))
        )[0]
      }
      setFailed(false)
      setData({
        price: structure.currentPrice,
        support: structure.support[0] ?? null,
        resistance: structure.resistance[0] ?? null,
        higherPattern
      })
    }
    load()
    const interval = setInterval(load, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [pair, timeframe, higherTf])

  const distance = (level: PriceLevel | null) =>
    data && level ? (Math.abs(level.price - data.price) / data.price) * 100 : null
  const supportDist = distance(data?.support ?? null)
  const resistanceDist = distance(data?.resistance ?? null)
  const nearSupport = supportDist !== null && supportDist <= NEAR_LEVEL_PCT
  const nearResistance = resistanceDist !== null && resistanceDist <= NEAR_LEVEL_PCT

  const higherBias = data?.higherPattern?.type ?? 'neutral'
  const agrees = bias !== 'neutral' && higherBias === bias
  const conflicts = bias !== 'neutral' && higherBias !== 'neutral' && higherBias !== bias

  // Location matters: bullish signals are better at support, bearish at resistance
  const locationNote = bias === 'bullish' && nearSupport
    ? { type: 'positive', text: 'Bullish signal at support - good location' }
    : bias === 'bearish' && nearResistance
      ? { type: 'positive', text: 'Bearish signal at resistance - good location' }
      : bias === 'bullish' && nearResistance
        ? { type: 'warning', text: 'Bullish signal right under resistance - limited room' }
        : bias === 'bearish' && nearSupport
          ? { type: 'warning', text: 'Bearish signal right above support - limited room' }
          : null

  return (
    <div className="glass-card price-context-panel">
      <h3>
        <Layers size={18} />
        Market Context
      </h3>

      {failed && !data && <p className="pc-muted">Context unavailable right now.</p>}
      {!failed && !data && <p className="pc-muted">Loading levels and {higherTf} confirmation…</p>}

      {data && (
        <>
          <div className="pc-levels">
            <div className={`pc-level resistance ${nearResistance ? 'near' : ''}`}>
              <span className="pc-label">Nearest resistance</span>
              <span className="pc-value">
                {data.resistance ? `$${formatPrice(data.resistance.price)}` : '—'}
              </span>
              {resistanceDist !== null && (
                <span className="pc-sub">
                  {resistanceDist.toFixed(2)}% away
                  {data.resistance && data.resistance.touches > 0 && ` · ${data.resistance.touches} touches`}
                </span>
              )}
            </div>
            <div className={`pc-level support ${nearSupport ? 'near' : ''}`}>
              <span className="pc-label">Nearest support</span>
              <span className="pc-value">
                {data.support ? `$${formatPrice(data.support.price)}` : '—'}
              </span>
              {supportDist !== null && (
                <span className="pc-sub">
                  {supportDist.toFixed(2)}% away
                  {data.support && data.support.touches > 0 && ` · ${data.support.touches} touches`}
                </span>
              )}
            </div>
          </div>

          <div className="pc-notes">
            {locationNote && (
              <div className={`pc-note ${locationNote.type}`}>
                {locationNote.type === 'positive' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{locationNote.text}</span>
              </div>
            )}
            {!locationNote && (nearSupport || nearResistance) && (
              <div className="pc-note info">
                <Target size={16} />
                <span>Price is at a key level - watch for a reaction</span>
              </div>
            )}
            {data.higherPattern && (
              <div className={`pc-note ${agrees ? 'positive' : conflicts ? 'warning' : 'info'}`}>
                {agrees ? <CheckCircle2 size={16} /> : conflicts ? <AlertTriangle size={16} /> : <Info size={16} />}
                <span>
                  {higherTf} candle: {data.higherPattern.name}
                  {agrees && ' - confirms the signal'}
                  {conflicts && ' - conflicts with the signal'}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default PriceContextPanel
