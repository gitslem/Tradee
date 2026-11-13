import axios from 'axios'

export interface CandleData {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
  quoteVolume: number
  trades: number
  takerBuyBaseVolume: number
  takerBuyQuoteVolume: number
}

export interface OHLCVData {
  symbol: string
  interval: string
  /** The candle still forming (live) */
  current: CandleData
  /** The most recent closed candle */
  previous: CandleData
  /** Closed candles, oldest first (previous is the last element) */
  history: CandleData[]
  priceChange: number
  priceChangePercent: number
  volumeChange: number
  volumeChangePercent: number
  highLow: {
    high: number
    low: number
    range: number
  }
}

const BINANCE_API = 'https://api.binance.com/api/v3'

// Map display names to Binance symbols
const symbolMap: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT',
  'ETH/USDT': 'ETHUSDT',
  'BNB/USDT': 'BNBUSDT',
  'SOL/USDT': 'SOLUSDT',
  'XRP/USDT': 'XRPUSDT',
  'ADA/USDT': 'ADAUSDT',
  'DOGE/USDT': 'DOGEUSDT',
  'POL/USDT': 'POLUSDT',
  'DOT/USDT': 'DOTUSDT',
  'AVAX/USDT': 'AVAXUSDT'
}

// Interval options
export const INTERVALS = {
  '1m': '1 Minute',
  '5m': '5 Minutes',
  '15m': '15 Minutes',
  '1h': '1 Hour',
  '4h': '4 Hours',
  '1d': '1 Day'
}

type RawKline = [number, string, string, string, string, string, number, string, number, string, string, ...unknown[]]

const parseKline = (k: RawKline): CandleData => ({
  openTime: k[0],
  open: parseFloat(k[1]),
  high: parseFloat(k[2]),
  low: parseFloat(k[3]),
  close: parseFloat(k[4]),
  volume: parseFloat(k[5]),
  closeTime: k[6],
  quoteVolume: parseFloat(k[7]),
  trades: k[8],
  takerBuyBaseVolume: parseFloat(k[9]),
  takerBuyQuoteVolume: parseFloat(k[10])
})

const fetchKlines = async (pair: string, interval: string, limit: number): Promise<CandleData[] | null> => {
  const binanceSymbol = symbolMap[pair]
  if (!binanceSymbol) {
    console.error('Symbol not found:', pair)
    return null
  }
  const response = await axios.get<RawKline[]>(`${BINANCE_API}/klines`, {
    params: { symbol: binanceSymbol, interval, limit },
    timeout: 8000
  })
  return Array.isArray(response.data) ? response.data.map(parseKline) : null
}

/**
 * Fetch OHLCV data for a trading pair: the live candle plus recent closed
 * candles (enough for two-candle patterns, average volume and trend context)
 */
export const getOHLCVData = async (pair: string, interval: string = '15m'): Promise<OHLCVData | null> => {
  try {
    const candles = await fetchKlines(pair, interval, 31)
    if (!candles || candles.length < 3) return null

    const current = candles[candles.length - 1]
    const history = candles.slice(0, -1)
    const previous = history[history.length - 1]

    // Calculate changes
    const priceChange = current.close - previous.close
    const priceChangePercent = (priceChange / previous.close) * 100
    const volumeChange = current.volume - previous.volume
    const volumeChangePercent = previous.volume > 0 ? (volumeChange / previous.volume) * 100 : 0

    // High/low range across the live and last closed candle
    const high = Math.max(previous.high, current.high)
    const low = Math.min(previous.low, current.low)

    return {
      symbol: pair,
      interval,
      current,
      previous,
      history,
      priceChange,
      priceChangePercent,
      volumeChange,
      volumeChangePercent,
      highLow: {
        high,
        low,
        range: high - low
      }
    }
  } catch (error) {
    console.error('Error fetching OHLCV data:', error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Candlestick patterns
// ---------------------------------------------------------------------------

export type PatternType = 'bullish' | 'bearish' | 'neutral'
export type TrendContext = 'up' | 'down' | 'sideways'

export interface PatternInfo {
  name: string
  type: PatternType
  strength: number
  description: string
}

type OHLC = Pick<CandleData, 'open' | 'high' | 'low' | 'close'>

/** OHLC values are finite, positive and internally consistent */
export const isValidCandle = (c: OHLC): boolean =>
  [c.open, c.high, c.low, c.close].every(v => Number.isFinite(v) && v > 0) &&
  c.high >= Math.max(c.open, c.close) &&
  c.low <= Math.min(c.open, c.close)

/** Candle direction, treating a near-zero body as neutral */
export const candleDirection = (c: OHLC): PatternType => {
  const range = c.high - c.low
  const body = c.close - c.open
  if (range <= 0 || Math.abs(body) <= range * 0.02) return 'neutral'
  return body > 0 ? 'bullish' : 'bearish'
}

/**
 * Trend before a candle, from the closes of the preceding candles.
 * The net move is compared with the average candle range so the threshold
 * adapts to each market's volatility.
 */
export const getTrendContext = (candles: OHLC[], lookback = 10): TrendContext => {
  const recent = candles.slice(-lookback)
  if (recent.length < 4) return 'sideways'
  const avgRange = recent.reduce((s, c) => s + (c.high - c.low), 0) / recent.length
  if (avgRange <= 0) return 'sideways'
  const move = recent[recent.length - 1].close - recent[0].open
  if (move > avgRange * 1.5) return 'up'
  if (move < -avgRange * 1.5) return 'down'
  return 'sideways'
}

/**
 * Detect candlestick patterns for a candle.
 * - `prev` (the candle before it) enables two-candle patterns
 * - `trend` (the trend before it) separates e.g. Hammer from Hanging Man
 * Returns the strongest pattern first; always returns at least one entry.
 */
export const detectPatterns = (candle: OHLC, prev?: OHLC | null, trend: TrendContext = 'sideways'): PatternInfo[] => {
  const { open, high, low, close } = candle
  const range = high - low
  if (!isValidCandle(candle) || range <= 0) {
    return [{ name: 'Flat Candle', type: 'neutral', strength: 0, description: 'No price movement in this candle' }]
  }

  const body = Math.abs(close - open)
  const upperWick = high - Math.max(open, close)
  const lowerWick = Math.min(open, close) - low
  const bodyPct = body / range
  const upperPct = upperWick / range
  const lowerPct = lowerWick / range
  const dir = candleDirection(candle)
  const patterns: PatternInfo[] = []

  // Two-candle patterns
  if (prev && isValidCandle(prev)) {
    const prevDir = candleDirection(prev)
    const prevBody = Math.abs(prev.close - prev.open)
    const prevTop = Math.max(prev.open, prev.close)
    const prevBottom = Math.min(prev.open, prev.close)
    const top = Math.max(open, close)
    const bottom = Math.min(open, close)

    if (prevDir === 'bearish' && dir === 'bullish' && open <= prev.close && close >= prev.open && body > prevBody) {
      patterns.push({
        name: 'Bullish Engulfing',
        type: 'bullish',
        strength: trend === 'down' ? 90 : 75,
        description: trend === 'down'
          ? 'Buyers fully reversed the prior bearish candle after a decline - strong reversal signal'
          : 'Buyers fully reversed the prior bearish candle'
      })
    } else if (prevDir === 'bullish' && dir === 'bearish' && open >= prev.close && close <= prev.open && body > prevBody) {
      patterns.push({
        name: 'Bearish Engulfing',
        type: 'bearish',
        strength: trend === 'up' ? 90 : 75,
        description: trend === 'up'
          ? 'Sellers fully reversed the prior bullish candle after a rally - strong reversal signal'
          : 'Sellers fully reversed the prior bullish candle'
      })
    } else if (prevBody > 0 && body < prevBody * 0.6 && top <= prevTop && bottom >= prevBottom && prevDir !== 'neutral') {
      const bullish = prevDir === 'bearish'
      patterns.push({
        name: bullish ? 'Bullish Harami' : 'Bearish Harami',
        type: bullish ? 'bullish' : 'bearish',
        strength: 60,
        description: bullish
          ? 'Small candle inside a large bearish body - selling momentum is fading'
          : 'Small candle inside a large bullish body - buying momentum is fading'
      })
    } else if (high <= prev.high && low >= prev.low) {
      patterns.push({
        name: 'Inside Bar',
        type: 'neutral',
        strength: 50,
        description: 'Range contained within the previous candle - watch for a breakout'
      })
    }
  }

  // Single-candle shape (mutually exclusive)
  if (bodyPct <= 0.1) {
    if (lowerPct >= 0.7 && upperPct <= 0.1) {
      patterns.push({ name: 'Dragonfly Doji', type: 'bullish', strength: 65, description: 'Sellers pushed price down but buyers recovered it all - possible bullish reversal' })
    } else if (upperPct >= 0.7 && lowerPct <= 0.1) {
      patterns.push({ name: 'Gravestone Doji', type: 'bearish', strength: 65, description: 'Buyers pushed price up but sellers took it all back - possible bearish reversal' })
    } else {
      patterns.push({ name: 'Doji', type: 'neutral', strength: 55, description: 'Market indecision - wait for the next candle to confirm direction' })
    }
  } else if (bodyPct >= 0.9) {
    patterns.push(dir === 'bullish'
      ? { name: 'Bullish Marubozu', type: 'bullish', strength: 80, description: 'Buyers controlled the whole candle - strong momentum' }
      : { name: 'Bearish Marubozu', type: 'bearish', strength: 80, description: 'Sellers controlled the whole candle - strong momentum' })
  } else if (lowerWick >= body * 2 && upperPct <= 0.1) {
    if (trend === 'down') {
      patterns.push({ name: 'Hammer', type: 'bullish', strength: 75, description: 'Long lower wick after a decline - buyers rejected lower prices' })
    } else if (trend === 'up') {
      patterns.push({ name: 'Hanging Man', type: 'bearish', strength: 65, description: 'Long lower wick after a rally - selling pressure is appearing' })
    } else {
      patterns.push({ name: 'Hammer Shape', type: 'neutral', strength: 45, description: 'Long lower wick, but no clear prior trend to reverse' })
    }
  } else if (upperWick >= body * 2 && lowerPct <= 0.1) {
    if (trend === 'up') {
      patterns.push({ name: 'Shooting Star', type: 'bearish', strength: 75, description: 'Long upper wick after a rally - sellers rejected higher prices' })
    } else if (trend === 'down') {
      patterns.push({ name: 'Inverted Hammer', type: 'bullish', strength: 60, description: 'Long upper wick after a decline - buyers are testing higher prices' })
    } else {
      patterns.push({ name: 'Inverted Hammer Shape', type: 'neutral', strength: 45, description: 'Long upper wick, but no clear prior trend to reverse' })
    }
  } else if (bodyPct < 0.3 && upperWick > body && lowerWick > body) {
    patterns.push({ name: 'Spinning Top', type: 'neutral', strength: 45, description: 'Small body with wicks on both sides - indecision' })
  } else if (patterns.length === 0) {
    patterns.push(dir === 'bullish'
      ? { name: 'Bullish Candle', type: 'bullish', strength: 35, description: 'No significant pattern - ordinary bullish candle' }
      : dir === 'bearish'
        ? { name: 'Bearish Candle', type: 'bearish', strength: 35, description: 'No significant pattern - ordinary bearish candle' }
        : { name: 'Neutral Candle', type: 'neutral', strength: 30, description: 'No significant pattern' })
  }

  return patterns.sort((a, b) => b.strength - a.strength)
}

/** Name of the strongest single-candle pattern (used for compact badges) */
export const identifyCandlePattern = (candle: CandleData): string => detectPatterns(candle)[0].name

// ---------------------------------------------------------------------------
// Market structure (swing points, trend, support / resistance)
// ---------------------------------------------------------------------------

export interface SwingPoint {
  index: number
  time: number
  price: number
}

export interface PriceLevel {
  price: number
  touches: number
  strength: 'weak' | 'moderate' | 'strong'
  source: 'swing' | 'round'
}

export type StructureTrend = 'uptrend' | 'downtrend' | 'expansion' | 'range' | 'unknown'

export interface MarketStructureData {
  symbol: string
  interval: string
  currentPrice: number
  candlesAnalyzed: number
  swingHighs: SwingPoint[]
  swingLows: SwingPoint[]
  lastHigh: number | null
  prevHigh: number | null
  lastLow: number | null
  prevLow: number | null
  trend: StructureTrend
  support: PriceLevel[]
  resistance: PriceLevel[]
}

/**
 * Fractal swing points: a swing high is a candle whose high is above the
 * `width` candles on each side (swing lows mirror this).
 */
export const findSwingPoints = (candles: CandleData[], width = 3): { highs: SwingPoint[]; lows: SwingPoint[] } => {
  const highs: SwingPoint[] = []
  const lows: SwingPoint[] = []
  for (let i = width; i < candles.length - width; i++) {
    let isHigh = true
    let isLow = true
    for (let j = i - width; j <= i + width && (isHigh || isLow); j++) {
      if (j === i) continue
      // Strict on the left, inclusive on the right, so equal highs count once
      if (j < i ? candles[j].high >= candles[i].high : candles[j].high > candles[i].high) isHigh = false
      if (j < i ? candles[j].low <= candles[i].low : candles[j].low < candles[i].low) isLow = false
    }
    if (isHigh) highs.push({ index: i, time: candles[i].openTime, price: candles[i].high })
    if (isLow) lows.push({ index: i, time: candles[i].openTime, price: candles[i].low })
  }
  return { highs, lows }
}

export const classifyStructure = (
  lastHigh: number | null, prevHigh: number | null, lastLow: number | null, prevLow: number | null
): StructureTrend => {
  if (lastHigh === null || prevHigh === null || lastLow === null || prevLow === null) return 'unknown'
  const hh = lastHigh > prevHigh
  const hl = lastLow > prevLow
  if (hh && hl) return 'uptrend'
  if (!hh && !hl) return 'downtrend'
  if (hh && !hl) return 'expansion'
  return 'range'
}

/** Round-number step that suits the price (e.g. 1000 for BTC, 0.01 for DOGE) */
export const roundNumberStep = (price: number): number =>
  Math.pow(10, Math.floor(Math.log10(price)) - 1)

/**
 * Group swing points into price levels. Points within `tolerance` of each
 * other count as touches of the same level.
 */
export const clusterLevels = (prices: number[], tolerance: number): { price: number; touches: number }[] => {
  const sorted = [...prices].sort((a, b) => a - b)
  const clusters: number[][] = []
  for (const p of sorted) {
    const last = clusters[clusters.length - 1]
    if (last) {
      const mean = last.reduce((s, v) => s + v, 0) / last.length
      if (Math.abs(p - mean) <= tolerance) {
        last.push(p)
        continue
      }
    }
    clusters.push([p])
  }
  return clusters.map(c => ({ price: c.reduce((s, v) => s + v, 0) / c.length, touches: c.length }))
}

const strengthFor = (touches: number): PriceLevel['strength'] =>
  touches >= 3 ? 'strong' : touches === 2 ? 'moderate' : 'weak'

/**
 * Market structure from recent closed candles: swing highs/lows, Dow-theory
 * trend, and support/resistance measured from where price actually turned.
 */
export const getMarketStructure = async (pair: string, interval: string = '15m', limit = 200): Promise<MarketStructureData | null> => {
  try {
    const candles = await fetchKlines(pair, interval, limit + 1)
    if (!candles || candles.length < 20) return null

    const live = candles[candles.length - 1]
    const closed = candles.slice(0, -1)
    const currentPrice = live.close

    const { highs, lows } = findSwingPoints(closed)
    const lastHigh = highs.at(-1)?.price ?? null
    const prevHigh = highs.at(-2)?.price ?? null
    const lastLow = lows.at(-1)?.price ?? null
    const prevLow = lows.at(-2)?.price ?? null

    // Tolerance: the larger of 0.3% of price or half the average candle range
    const avgRange = closed.slice(-14).reduce((s, c) => s + (c.high - c.low), 0) / Math.min(14, closed.length)
    const tolerance = Math.max(currentPrice * 0.003, avgRange * 0.5)

    const levels: PriceLevel[] = clusterLevels([...highs, ...lows].map(p => p.price), tolerance)
      .map(l => ({ ...l, strength: strengthFor(l.touches), source: 'swing' as const }))

    // Nearest round numbers above and below, if no swing level is already there
    const step = roundNumberStep(currentPrice)
    for (const round of [Math.floor(currentPrice / step) * step, Math.ceil(currentPrice / step) * step]) {
      if (round > 0 && round !== currentPrice && !levels.some(l => Math.abs(l.price - round) <= tolerance)) {
        levels.push({ price: round, touches: 0, strength: 'weak', source: 'round' })
      }
    }

    const byImportance = (a: PriceLevel, b: PriceLevel) => b.touches - a.touches
    const support = levels
      .filter(l => l.price < currentPrice)
      .sort((a, b) => b.price - a.price) // nearest first
      .slice(0, 6)
      .sort(byImportance)
      .slice(0, 4)
      .sort((a, b) => b.price - a.price)
    const resistance = levels
      .filter(l => l.price > currentPrice)
      .sort((a, b) => a.price - b.price)
      .slice(0, 6)
      .sort(byImportance)
      .slice(0, 4)
      .sort((a, b) => a.price - b.price)

    return {
      symbol: pair,
      interval,
      currentPrice,
      candlesAnalyzed: closed.length,
      swingHighs: highs,
      swingLows: lows,
      lastHigh,
      prevHigh,
      lastLow,
      prevLow,
      trend: classifyStructure(lastHigh, prevHigh, lastLow, prevLow),
      support,
      resistance
    }
  } catch (error) {
    console.error('Error fetching market structure:', error)
    return null
  }
}
