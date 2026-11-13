/**
 * Positioning and sentiment data that complements price structure.
 * All sources are public and need no API key. Each piece is optional:
 * if one source fails the rest are still returned.
 */

const BYBIT = 'https://api.bybit.com/v5/market'

export interface DerivativesSnapshot {
  /** Funding rate per 8h interval, as a fraction (0.0001 = 0.01%) */
  fundingRate: number | null
  /** Open interest value in USD */
  openInterestUsd: number | null
  /** Change in open interest (contracts) over the last 24 hours, as a fraction */
  openInterestChange24h: number | null
  /** Share of Bybit accounts that are net long (0-1) */
  longAccountRatio: number | null
  priceChange24h: number | null
}

export interface SentimentSnapshot {
  value: number
  label: string
}

const getJson = async (url: string) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

/** 'BTC/USDT' -> 'BTCUSDT' */
export const toSymbol = (pair: string) => pair.replace('/', '').toUpperCase()

export const getDerivatives = async (pair: string): Promise<DerivativesSnapshot> => {
  const symbol = toSymbol(pair)
  const [ticker, oi, ratio] = await Promise.allSettled([
    getJson(`${BYBIT}/tickers?category=linear&symbol=${symbol}`),
    getJson(`${BYBIT}/open-interest?category=linear&symbol=${symbol}&intervalTime=1h&limit=25`),
    getJson(`${BYBIT}/account-ratio?category=linear&symbol=${symbol}&period=1h&limit=1`)
  ])

  const t = ticker.status === 'fulfilled' ? ticker.value?.result?.list?.[0] : null

  let openInterestChange24h: number | null = null
  if (oi.status === 'fulfilled') {
    // Newest first
    const list = oi.value?.result?.list ?? []
    const now = num(list[0]?.openInterest)
    const then = num(list[list.length - 1]?.openInterest)
    if (now !== null && then !== null && then > 0 && list.length >= 2) {
      openInterestChange24h = (now - then) / then
    }
  }

  const r = ratio.status === 'fulfilled' ? ratio.value?.result?.list?.[0] : null

  return {
    fundingRate: num(t?.fundingRate),
    openInterestUsd: num(t?.openInterestValue),
    openInterestChange24h,
    longAccountRatio: num(r?.buyRatio),
    priceChange24h: num(t?.price24hPcnt)
  }
}

let sentimentCache: { at: number; data: SentimentSnapshot | null } | null = null

/** Crypto Fear & Greed Index (alternative.me), updated once a day */
export const getSentiment = async (): Promise<SentimentSnapshot | null> => {
  if (sentimentCache && Date.now() - sentimentCache.at < 30 * 60_000) return sentimentCache.data
  try {
    const data = await getJson('https://api.alternative.me/fng/?limit=1')
    const entry = data?.data?.[0]
    const value = num(entry?.value)
    const result = value !== null ? { value, label: String(entry?.value_classification ?? '') } : null
    sentimentCache = { at: Date.now(), data: result }
    return result
  } catch {
    return null
  }
}
