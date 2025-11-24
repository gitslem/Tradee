import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Zap, RefreshCw, Activity, DollarSign, Percent } from 'lucide-react'
import { cryptoRecommendationService } from '../services/cryptoRecommendations'
import type { CryptoRecommendation } from '../services/cryptoRecommendations'
import './CryptoRecommendations.css'

const CryptoRecommendations = () => {
  const [recommendations, setRecommendations] = useState<CryptoRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const fetchRecommendations = async () => {
    try {
      setRefreshing(true)
      const recs = await cryptoRecommendationService.getTopRecommendations(4)
      setRecommendations(recs)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchRecommendations, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    cryptoRecommendationService.clearCache()
    fetchRecommendations()
  }

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'excellent'
    if (score >= 50) return 'good'
    if (score >= 30) return 'fair'
    return 'poor'
  }

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000000) {
      return `$${(volume / 1000000000).toFixed(2)}B`
    }
    return `$${(volume / 1000000).toFixed(0)}M`
  }

  if (loading) {
    return (
      <div className="crypto-recommendations">
        <div className="recommendations-header">
          <div className="header-left">
            <Zap size={24} className="header-icon" />
            <h2>AI Trading Opportunities</h2>
          </div>
        </div>
        <div className="loading-recs">
          <RefreshCw size={32} className="spinner" />
          <p>Analyzing market data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="crypto-recommendations">
      <div className="recommendations-header">
        <div className="header-left">
          <Zap size={24} className="header-icon" />
          <div>
            <h2>AI Trading Opportunities</h2>
            <p className="header-subtitle">
              Top pairs based on volume, spreads, volatility & market narrative
            </p>
          </div>
        </div>
        <div className="header-right">
          <span className="last-update">
            Updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            disabled={refreshing}
            title="Refresh recommendations"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="no-recommendations">
          <Activity size={48} />
          <p>No recommendations available at the moment</p>
          <button onClick={handleRefresh} className="retry-btn">
            Try Again
          </button>
        </div>
      ) : (
        <div className="recommendations-grid">
          {recommendations.map((rec, index) => (
            <div key={rec.symbol} className={`recommendation-card rank-${index + 1}`}>
              <div className="card-rank">#{index + 1}</div>

              <div className="card-header">
                <div className="pair-info">
                  <h3 className="pair-name">{rec.pair}</h3>
                  <span className="narrative-badge">{rec.narrative}</span>
                </div>
                <div className={`score-badge ${getScoreColor(rec.score)}`}>
                  <span className="score-value">{rec.score}</span>
                  <span className="score-label">Score</span>
                </div>
              </div>

              <div className="card-body">
                <div className="reason-text">
                  {rec.reason}
                </div>

                <div className="metrics-row">
                  <div className="metric">
                    <DollarSign size={14} />
                    <span className="metric-label">Volume</span>
                    <span className="metric-value">{formatVolume(rec.volume24h)}</span>
                  </div>

                  <div className="metric">
                    <Activity size={14} />
                    <span className="metric-label">Volatility</span>
                    <span className="metric-value">{rec.volatility.toFixed(1)}%</span>
                  </div>

                  <div className="metric">
                    <Percent size={14} />
                    <span className="metric-label">Spread</span>
                    <span className="metric-value">{(rec.spread * 100).toFixed(3)}%</span>
                  </div>
                </div>

                <div className="price-change">
                  {rec.priceChange24h >= 0 ? (
                    <div className="change-positive">
                      <TrendingUp size={16} />
                      <span>+{rec.priceChange24h.toFixed(2)}%</span>
                    </div>
                  ) : (
                    <div className="change-negative">
                      <TrendingDown size={16} />
                      <span>{rec.priceChange24h.toFixed(2)}%</span>
                    </div>
                  )}
                  <span className="change-label">24h</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="recommendations-footer">
        <p className="disclaimer">
          AI-powered analysis based on real-time market data. Always do your own research and manage risk appropriately.
        </p>
      </div>
    </div>
  )
}

export default CryptoRecommendations
