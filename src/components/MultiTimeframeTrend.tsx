import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Activity, Minus, HelpCircle } from 'lucide-react'
import { getMarketStructure } from '../services/ohlcvService'
import type { StructureTrend } from '../services/ohlcvService'
import { formatPrice } from '../utils/format'
import './MultiTimeframeTrend.css'

const TIMEFRAMES = [
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' }
]

interface TimeframeTrend {
  trend: StructureTrend
  lastHigh: number | null
  lastLow: number | null
}

const TREND_TEXT: Record<StructureTrend, string> = {
  uptrend: 'Uptrend',
  downtrend: 'Downtrend',
  expansion: 'Expanding',
  range: 'Range',
  unknown: 'Unclear'
}

const TrendIcon = ({ trend }: { trend: StructureTrend }) => {
  switch (trend) {
    case 'uptrend': return <TrendingUp size={18} />
    case 'downtrend': return <TrendingDown size={18} />
    case 'expansion': return <Activity size={18} />
    case 'range': return <Minus size={18} />
    default: return <HelpCircle size={18} />
  }
}

/**
 * Swing-structure trend for one pair on several timeframes, so the
 * higher-timeframe context is visible at a glance. Remount (key) per pair.
 */
const MultiTimeframeTrend = ({ pair }: { pair: string }) => {
  const [trends, setTrends] = useState<Record<string, TimeframeTrend | null>>({})

  useEffect(() => {
    let cancelled = false
    const load = () => {
      for (const tf of TIMEFRAMES) {
        getMarketStructure(pair, tf.value).then(s => {
          if (cancelled) return
          setTrends(prev => ({
            ...prev,
            [tf.value]: s ? { trend: s.trend, lastHigh: s.lastHigh, lastLow: s.lastLow } : null
          }))
        })
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [pair])

  const known = TIMEFRAMES.map(tf => trends[tf.value]?.trend).filter(Boolean)
  const ups = known.filter(t => t === 'uptrend').length
  const downs = known.filter(t => t === 'downtrend').length
  const summary = known.length < TIMEFRAMES.length
    ? 'Loading timeframes…'
    : ups === TIMEFRAMES.length
      ? 'All timeframes in an uptrend - strong alignment'
      : downs === TIMEFRAMES.length
        ? 'All timeframes in a downtrend - strong alignment'
        : ups > downs
          ? 'Mostly bullish structure - mixed timeframes'
          : downs > ups
            ? 'Mostly bearish structure - mixed timeframes'
            : 'Timeframes disagree - no clear direction'

  return (
    <div className="mtf-panel glass-card">
      <div className="mtf-header">
        <h3>Multi-Timeframe Structure</h3>
        <span className="mtf-summary" aria-live="polite">{summary}</span>
      </div>
      <div className="mtf-grid">
        {TIMEFRAMES.map(tf => {
          const data = trends[tf.value]
          const loading = !(tf.value in trends)
          const trend = data?.trend ?? 'unknown'
          return (
            <div key={tf.value} className={`mtf-card ${loading ? 'loading' : trend}`}>
              <span className="mtf-tf">{tf.label}</span>
              <span className="mtf-trend">
                <TrendIcon trend={trend} />
                {loading ? '…' : data ? TREND_TEXT[trend] : 'No data'}
              </span>
              {data && data.lastHigh !== null && data.lastLow !== null && (
                <span className="mtf-swings">
                  H ${formatPrice(data.lastHigh)} · L ${formatPrice(data.lastLow)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MultiTimeframeTrend
