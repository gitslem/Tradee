import { getMarketStructure } from '../ohlcvService'
import type { MarketStructureData, StructureTrend } from '../ohlcvService'
import { formatPrice } from '../../utils/format'
import { getDerivatives, getSentiment } from './marketData'
import type { DerivativesSnapshot, SentimentSnapshot } from './marketData'
import { generate } from './aiService'

/**
 * Market Brief agent.
 * Step 1 (code): gather facts - swing structure on 4 timeframes, levels,
 *   funding, open interest, positioning and sentiment.
 * Step 2 (model): turn only those facts into a short bull/bear brief.
 * The model never sees anything it could invent numbers from beyond the facts.
 */

export const BRIEF_TIMEFRAMES = ['15m', '1h', '4h', '1d'] as const

export interface MarketFacts {
  pair: string
  price: number
  generatedAt: number
  timeframes: Record<string, { trend: StructureTrend; lastHigh: number | null; lastLow: number | null } | null>
  support: { price: number; touches: number }[]
  resistance: { price: number; touches: number }[]
  derivatives: DerivativesSnapshot
  sentiment: SentimentSnapshot | null
}

export interface BriefContent {
  headline: string
  bias: 'bullish' | 'bearish' | 'neutral'
  bullCase: string[]
  bearCase: string[]
  watch: string[]
  invalidation: string
}

export interface MarketBrief {
  facts: MarketFacts
  brief: BriefContent | null
  /** Raw model text when it could not be parsed as JSON */
  rawText: string | null
  providerName: string
  model: string
}

/** Levels from the 1h structure: clear enough to matter, close enough to trade around */
const LEVEL_TIMEFRAME = '1h'

export const gatherFacts = async (pair: string): Promise<MarketFacts> => {
  const [structures, derivatives, sentiment] = await Promise.all([
    Promise.all(BRIEF_TIMEFRAMES.map(tf => getMarketStructure(pair, tf).catch(() => null))),
    getDerivatives(pair).catch(() => null),
    getSentiment()
  ])

  const byTf: Record<string, MarketStructureData | null> = {}
  BRIEF_TIMEFRAMES.forEach((tf, i) => { byTf[tf] = structures[i] })

  const levelSource = byTf[LEVEL_TIMEFRAME] ?? structures.find(Boolean) ?? null
  if (!levelSource) throw new Error('Could not load price data for this pair')

  const timeframes: MarketFacts['timeframes'] = {}
  for (const tf of BRIEF_TIMEFRAMES) {
    const s = byTf[tf]
    timeframes[tf] = s ? { trend: s.trend, lastHigh: s.lastHigh, lastLow: s.lastLow } : null
  }

  return {
    pair,
    price: levelSource.currentPrice,
    generatedAt: Date.now(),
    timeframes,
    support: levelSource.support.slice(0, 3).map(l => ({ price: l.price, touches: l.touches })),
    resistance: levelSource.resistance.slice(0, 3).map(l => ({ price: l.price, touches: l.touches })),
    derivatives: derivatives ?? {
      fundingRate: null, openInterestUsd: null, openInterestChange24h: null, longAccountRatio: null, priceChange24h: null
    },
    sentiment
  }
}

const pct = (v: number | null, digits = 2) => (v === null ? 'n/a' : `${(v * 100).toFixed(digits)}%`)
const usd = (v: number) => `$${formatPrice(v)}`

/** Plain-text fact sheet given to the model */
export const factsToText = (f: MarketFacts): string => {
  const lines: string[] = []
  lines.push(`Pair: ${f.pair}`)
  lines.push(`Current price: ${usd(f.price)}`)
  lines.push(`24h price change: ${pct(f.derivatives.priceChange24h)}`)
  lines.push('')
  lines.push('Swing structure by timeframe (from closed candles):')
  for (const tf of BRIEF_TIMEFRAMES) {
    const t = f.timeframes[tf]
    lines.push(t
      ? `- ${tf}: ${t.trend}; last swing high ${t.lastHigh !== null ? usd(t.lastHigh) : 'n/a'}, last swing low ${t.lastLow !== null ? usd(t.lastLow) : 'n/a'}`
      : `- ${tf}: no data`)
  }
  lines.push('')
  lines.push(`Support levels (${LEVEL_TIMEFRAME}): ${f.support.length ? f.support.map(l => `${usd(l.price)} (${l.touches} touches)`).join(', ') : 'none found'}`)
  lines.push(`Resistance levels (${LEVEL_TIMEFRAME}): ${f.resistance.length ? f.resistance.map(l => `${usd(l.price)} (${l.touches} touches)`).join(', ') : 'none found'}`)
  lines.push('')
  lines.push('Perpetual futures (Bybit):')
  lines.push(`- Funding rate per 8h: ${pct(f.derivatives.fundingRate, 4)}`)
  lines.push(`- Open interest change, 24h: ${pct(f.derivatives.openInterestChange24h)}`)
  lines.push(`- Accounts net long: ${pct(f.derivatives.longAccountRatio, 1)}`)
  lines.push('')
  lines.push(`Crypto Fear & Greed Index: ${f.sentiment ? `${f.sentiment.value} (${f.sentiment.label})` : 'n/a'}`)
  return lines.join('\n')
}

const SYSTEM_PROMPT = `You are a careful crypto market analyst writing a short brief for a retail trader.

Rules:
- Use ONLY the facts provided. Do not invent prices, news, events or indicators that are not in the facts.
- Every price you mention must appear in the facts.
- Give both sides fairly. If the facts conflict, say so and lean "neutral".
- Never tell the reader to buy, sell, go long or go short. Describe conditions, not instructions.
- Plain English, short sentences, no hype.

How to read the facts:
- Higher timeframes (4h, 1d) outweigh lower ones (15m, 1h).
- Positive funding = longs pay shorts; very high funding (above 0.03% per 8h) with most accounts long means crowded longs that can be squeezed. Negative funding is the mirror image.
- Rising open interest with rising price = new money behind the move; rising open interest against the trend = traders fighting it; falling open interest = positions closing.
- Extreme fear or extreme greed is a contrarian warning, not a signal by itself.

Reply with a JSON object exactly in this shape:
{
  "headline": "one sentence summary, max 20 words",
  "bias": "bullish" | "bearish" | "neutral",
  "bullCase": ["2-3 short points"],
  "bearCase": ["2-3 short points"],
  "watch": ["2-3 price levels or conditions to watch, with prices from the facts"],
  "invalidation": "one sentence: what would change this view"
}`

const asStringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 4) : []

export const parseBrief = (text: string): BriefContent | null => {
  // Some models wrap JSON in ``` fences or add a sentence before it
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const obj = JSON.parse(text.slice(start, end + 1))
    const bias = ['bullish', 'bearish', 'neutral'].includes(obj?.bias) ? obj.bias : 'neutral'
    const brief: BriefContent = {
      headline: typeof obj?.headline === 'string' ? obj.headline : '',
      bias,
      bullCase: asStringList(obj?.bullCase),
      bearCase: asStringList(obj?.bearCase),
      watch: asStringList(obj?.watch),
      invalidation: typeof obj?.invalidation === 'string' ? obj.invalidation : ''
    }
    return brief.headline || brief.bullCase.length || brief.bearCase.length ? brief : null
  } catch {
    return null
  }
}

// Briefs are cached per pair so repeated clicks don't spend the shared free quota
const CACHE_KEY = 'ai-market-brief-v2'
export const BRIEF_CACHE_MS = 10 * 60_000

const readCache = (): Record<string, MarketBrief> => {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

export const getCachedBrief = (pair: string): MarketBrief | null => {
  const entry = readCache()[pair]
  return entry && Date.now() - entry.facts.generatedAt < BRIEF_CACHE_MS ? entry : null
}

const writeCache = (brief: MarketBrief) => {
  try {
    const cache = readCache()
    cache[brief.facts.pair] = brief
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore - cache is only an optimisation
  }
}

/** Reuses `recentFacts` if they are under 2 minutes old, otherwise fetches fresh ones */
export const generateMarketBrief = async (pair: string, signal?: AbortSignal, recentFacts?: MarketFacts | null): Promise<MarketBrief> => {
  const facts = recentFacts && recentFacts.pair === pair && Date.now() - recentFacts.generatedAt < 2 * 60_000
    ? recentFacts
    : await gatherFacts(pair)
  const result = await generate({
    system: SYSTEM_PROMPT,
    prompt: `Facts as of ${new Date(facts.generatedAt).toUTCString()}:\n\n${factsToText(facts)}`,
    json: true,
    signal
  })
  const brief = parseBrief(result.text)
  const out: MarketBrief = {
    facts,
    brief,
    rawText: brief ? null : result.text,
    providerName: result.providerName,
    model: result.model
  }
  writeCache(out)
  return out
}
