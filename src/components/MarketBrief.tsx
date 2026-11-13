import { useEffect, useRef, useState } from 'react'
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Eye, ShieldAlert, Loader2 } from 'lucide-react'
import { gatherFacts, generateMarketBrief, getCachedBrief, BRIEF_CACHE_MS } from '../services/ai/marketBrief'
import type { MarketBrief as Brief, MarketFacts } from '../services/ai/marketBrief'
import { formatPrice } from '../utils/format'
import AISettings from './AISettings'
import './MarketBrief.css'

const pct = (v: number | null, digits = 2) => (v === null ? '—' : `${v > 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`)

const fundingTone = (rate: number | null) =>
  rate === null ? '' : rate > 0.0003 ? 'warn' : rate < -0.0001 ? 'warn' : ''

const sentimentTone = (value: number | undefined) =>
  value === undefined ? '' : value <= 25 || value >= 75 ? 'warn' : ''

/**
 * Positioning data (always shown, no AI needed) plus an on-demand AI brief.
 * Remount with key={pair}.
 */
const MarketBrief = ({ pair }: { pair: string }) => {
  const [facts, setFacts] = useState<MarketFacts | null>(null)
  const [factsError, setFactsError] = useState(false)
  const [brief, setBrief] = useState<Brief | null>(() => getCachedBrief(pair))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      gatherFacts(pair)
        .then(f => { if (!cancelled) { setFacts(f); setFactsError(false) } })
        .catch(() => { if (!cancelled) setFactsError(true) })
    }
    load()
    const interval = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [pair])

  const runBrief = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const result = await generateMarketBrief(pair, controller.signal, facts)
      if (!controller.signal.aborted) setBrief(result)
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  const d = facts?.derivatives
  const ageMin = brief ? Math.floor((Date.now() - brief.facts.generatedAt) / 60_000) : 0
  const canRefresh = !brief || Date.now() - brief.facts.generatedAt > BRIEF_CACHE_MS / 5

  return (
    <section className="market-brief glass-card" aria-labelledby="market-brief-title">
      <div className="mb-header">
        <div className="mb-title">
          <Sparkles size={18} />
          <h3 id="market-brief-title">AI Market Brief</h3>
          <span className="mb-pair">{pair}</span>
        </div>
        <div className="mb-actions">
          <AISettings />
          <button
            type="button"
            className="mb-generate"
            onClick={runBrief}
            disabled={loading || (!!brief && !canRefresh)}
            title={brief && !canRefresh ? 'Brief is fresh - try again in a couple of minutes' : undefined}
          >
            {loading ? <Loader2 size={16} className="mb-spin" /> : brief ? <RefreshCw size={16} /> : <Sparkles size={16} />}
            {loading ? 'Analysing…' : brief ? 'Refresh brief' : 'Generate brief'}
          </button>
        </div>
      </div>

      {/* Positioning facts - plain data, no AI */}
      <div className="mb-facts">
        <div className={`mb-fact ${fundingTone(d?.fundingRate ?? null)}`}>
          <span className="mb-fact-label">Funding (8h)</span>
          <span className="mb-fact-value">{d ? pct(d.fundingRate, 4) : '…'}</span>
          <span className="mb-fact-hint">
            {d?.fundingRate == null ? 'Bybit perpetual' : d.fundingRate >= 0 ? 'Longs pay shorts' : 'Shorts pay longs'}
          </span>
        </div>
        <div className="mb-fact">
          <span className="mb-fact-label">Open interest 24h</span>
          <span className="mb-fact-value">{d ? pct(d.openInterestChange24h) : '…'}</span>
          <span className="mb-fact-hint">
            {d?.openInterestUsd != null ? `$${(d.openInterestUsd / 1e6).toFixed(0)}M open` : 'Bybit perpetual'}
          </span>
        </div>
        <div className="mb-fact">
          <span className="mb-fact-label">Accounts long</span>
          <span className="mb-fact-value">
            {d?.longAccountRatio != null ? `${(d.longAccountRatio * 100).toFixed(0)}%` : d ? '—' : '…'}
          </span>
          <span className="mb-fact-hint">Bybit, last hour</span>
        </div>
        <div className={`mb-fact ${sentimentTone(facts?.sentiment?.value)}`}>
          <span className="mb-fact-label">Fear & Greed</span>
          <span className="mb-fact-value">{facts ? facts.sentiment?.value ?? '—' : '…'}</span>
          <span className="mb-fact-hint">{facts?.sentiment?.label || 'Whole crypto market'}</span>
        </div>
      </div>
      {factsError && !facts && <p className="mb-muted">Could not load market data. Retrying every minute.</p>}

      {error && (
        <div className="mb-error" role="alert">
          <strong>No AI model answered.</strong> {error}
        </div>
      )}

      {!brief && !loading && !error && (
        <p className="mb-muted">
          Press <strong>Generate brief</strong> for a short bull vs bear read of {pair}, written only from the
          structure, levels and positioning data on this page.
        </p>
      )}

      {brief && (
        <div className="mb-brief" aria-live="polite">
          {brief.brief ? (
            <>
              <p className={`mb-headline ${brief.brief.bias}`}>
                <span className="mb-bias">{brief.brief.bias}</span>
                {brief.brief.headline}
              </p>
              <div className="mb-cases">
                <div className="mb-case bull">
                  <h4><TrendingUp size={16} /> Bull case</h4>
                  <ul>{brief.brief.bullCase.map(p => <li key={p}>{p}</li>)}</ul>
                </div>
                <div className="mb-case bear">
                  <h4><TrendingDown size={16} /> Bear case</h4>
                  <ul>{brief.brief.bearCase.map(p => <li key={p}>{p}</li>)}</ul>
                </div>
              </div>
              {brief.brief.watch.length > 0 && (
                <div className="mb-watch">
                  <h4><Eye size={16} /> Watch</h4>
                  <ul>{brief.brief.watch.map(p => <li key={p}>{p}</li>)}</ul>
                </div>
              )}
              {brief.brief.invalidation && (
                <p className="mb-invalidation"><ShieldAlert size={16} /> {brief.brief.invalidation}</p>
              )}
            </>
          ) : (
            <p className="mb-raw">{brief.rawText}</p>
          )}
          <p className="mb-footnote">
            {brief.providerName} ({brief.model}) · price ${formatPrice(brief.facts.price)} ·{' '}
            {ageMin < 1 ? 'just now' : `${ageMin} min ago`} · AI can be wrong. Educational only - not financial advice.
          </p>
        </div>
      )}
    </section>
  )
}

export default MarketBrief
