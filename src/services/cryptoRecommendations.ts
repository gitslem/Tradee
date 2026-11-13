export interface CryptoRecommendation {
  symbol: string
  pair: string
  score: number
  volume24h: number
  priceChange24h: number
  volatility: number
  spread: number
  marketCap: number
  narrative: string
  reason: string
}

export interface MarketData {
  symbol: string
  price: number
  volume24h: number
  priceChange24h: number
  high24h: number
  low24h: number
  bid: number
  ask: number
  marketCap?: number
}

// Narratives and trending sectors (can be updated based on current market conditions)
const MARKET_NARRATIVES = [
  { keyword: ['AI', 'AGIX', 'FET', 'RNDR'], narrative: 'AI & Machine Learning' },
  { keyword: ['L2', 'ARB', 'OP', 'POL'], narrative: 'Layer 2 Scaling' },
  { keyword: ['GAMING', 'IMX', 'GALA', 'SAND'], narrative: 'GameFi' },
  { keyword: ['RWA', 'ONDO', 'LINK'], narrative: 'Real World Assets' },
  { keyword: ['DEPIN', 'FIL', 'AR', 'HNT'], narrative: 'DePIN' },
  { keyword: ['SOL', 'AVAX', 'NEAR'], narrative: 'Alt Layer 1s' },
  { keyword: ['BTC', 'ETH'], narrative: 'Blue Chip' },
  { keyword: ['MEME', 'DOGE', 'SHIB', 'PEPE'], narrative: 'Meme Coins' }
]

// Popular trading pairs to analyze
const TRADING_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'POLUSDT', 'DOTUSDT', 'AVAXUSDT',
  'LTCUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'FILUSDT',
  'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT', 'SUIUSDT',
  'SEIUSDT', 'INJUSDT', 'TIAUSDT', 'WLDUSDT', 'RENDERUSDT',
  'FETUSDT', 'GALAUSDT', 'SANDUSDT', 'IMXUSDT', 'ONDOUSDT',
  'HNTUSDT', 'ARUSDT', 'AGIXUSDT', 'PEPEUSDT', 'SHIBUSDT'
]

interface BinanceTicker24h {
  symbol: string
  lastPrice: string
  quoteVolume: string
  priceChangePercent: string
  highPrice: string
  lowPrice: string
}

class CryptoRecommendationService {
  private cache: Map<string, { data: MarketData[], timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly BINANCE_API = 'https://api.binance.com/api/v3'

  async fetchMarketData(symbols: string[] = TRADING_PAIRS): Promise<MarketData[]> {
    const cacheKey = 'market_data'
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      // Fetch 24hr ticker data from Binance
      const tickerResponse = await fetch(`${this.BINANCE_API}/ticker/24hr`)
      if (!tickerResponse.ok) throw new Error('Failed to fetch ticker data')

      const tickerData: BinanceTicker24h[] = await tickerResponse.json()

      // Fetch order book depth to calculate spreads
      const marketData: MarketData[] = []

      for (const symbol of symbols) {
        const ticker = tickerData.find((t) => t.symbol === symbol)
        if (!ticker) continue

        try {
          // Get order book for spread calculation
          const bookResponse = await fetch(
            `${this.BINANCE_API}/ticker/bookTicker?symbol=${symbol}`
          )
          const bookData = await bookResponse.json()

          const price = parseFloat(ticker.lastPrice)
          const volume24h = parseFloat(ticker.quoteVolume)
          const priceChange24h = parseFloat(ticker.priceChangePercent)
          const high24h = parseFloat(ticker.highPrice)
          const low24h = parseFloat(ticker.lowPrice)
          const bid = parseFloat(bookData.bidPrice)
          const ask = parseFloat(bookData.askPrice)

          marketData.push({
            symbol,
            price,
            volume24h,
            priceChange24h,
            high24h,
            low24h,
            bid,
            ask
          })
        } catch (error) {
          console.warn(`Failed to fetch data for ${symbol}:`, error)
        }
      }

      this.cache.set(cacheKey, { data: marketData, timestamp: Date.now() })
      return marketData
    } catch (error) {
      console.error('Error fetching market data:', error)
      return []
    }
  }

  calculateVolatility(data: MarketData): number {
    // Calculate volatility as percentage range of high-low relative to price
    const range = data.high24h - data.low24h
    return (range / data.price) * 100
  }

  calculateSpreadPercent(data: MarketData): number {
    // Calculate bid-ask spread as percentage
    return ((data.ask - data.bid) / data.price) * 100
  }

  detectNarrative(symbol: string): string {
    const upperSymbol = symbol.toUpperCase()
    for (const narrative of MARKET_NARRATIVES) {
      if (narrative.keyword.some(keyword => upperSymbol.includes(keyword))) {
        return narrative.narrative
      }
    }
    return 'General Market'
  }

  checkStructure(data: MarketData): boolean {
    // Avoid coins with bad structure:
    // 1. Very low volume (< $1M)
    // 2. Extremely wide spreads (> 0.5%)
    // 3. Extreme volatility without volume (> 20% volatility with < $5M volume)

    if (data.volume24h < 1000000) return false // Low volume

    const spreadPercent = this.calculateSpreadPercent(data)
    if (spreadPercent > 0.5) return false // Wide spread

    const volatility = this.calculateVolatility(data)
    if (volatility > 20 && data.volume24h < 5000000) return false // High vol, low liquidity

    return true
  }

  calculateScore(data: MarketData): number {
    // Scoring system (0-100)
    let score = 0

    // 1. Volume Score (0-30 points): Higher is better
    const volumeScore = Math.min(30, (data.volume24h / 100000000) * 30)
    score += volumeScore

    // 2. Spread Score (0-25 points): Tighter is better
    const spreadPercent = this.calculateSpreadPercent(data)
    const spreadScore = Math.max(0, 25 - (spreadPercent * 100))
    score += spreadScore

    // 3. Volatility Score (0-25 points): Moderate volatility is ideal (3-8%)
    const volatility = this.calculateVolatility(data)
    let volatilityScore = 0
    if (volatility >= 3 && volatility <= 8) {
      volatilityScore = 25 // Ideal range
    } else if (volatility > 8 && volatility <= 15) {
      volatilityScore = 15 // High but tradeable
    } else if (volatility > 1 && volatility < 3) {
      volatilityScore = 10 // Low volatility
    } else {
      volatilityScore = 5 // Too low or too high
    }
    score += volatilityScore

    // 4. Momentum Score (0-20 points): Positive momentum preferred
    const momentumScore = Math.max(-10, Math.min(20, data.priceChange24h))
    score += momentumScore

    return Math.round(score)
  }

  generateReason(data: MarketData): string {
    const volatility = this.calculateVolatility(data)
    const spreadPercent = this.calculateSpreadPercent(data)
    const volumeM = (data.volume24h / 1000000).toFixed(0)

    const reasons = []

    if (data.volume24h > 100000000) {
      reasons.push('High liquidity')
    } else if (data.volume24h > 50000000) {
      reasons.push('Good liquidity')
    }

    if (spreadPercent < 0.05) {
      reasons.push('Tight spread')
    } else if (spreadPercent < 0.1) {
      reasons.push('Decent spread')
    }

    if (volatility >= 3 && volatility <= 8) {
      reasons.push('Ideal volatility')
    } else if (volatility > 8) {
      reasons.push('High volatility')
    }

    if (data.priceChange24h > 5) {
      reasons.push('Strong uptrend')
    } else if (data.priceChange24h > 2) {
      reasons.push('Positive momentum')
    } else if (data.priceChange24h < -5) {
      reasons.push('Strong correction')
    }

    return reasons.length > 0
      ? reasons.join(' • ')
      : `$${volumeM}M volume • ${volatility.toFixed(1)}% volatility`
  }

  async getTopRecommendations(count: number = 4): Promise<CryptoRecommendation[]> {
    try {
      const marketData = await this.fetchMarketData()

      // Filter out coins with bad structure
      const goodStructure = marketData.filter(data => this.checkStructure(data))

      // Calculate scores and create recommendations
      const recommendations: CryptoRecommendation[] = goodStructure.map(data => {
        const score = this.calculateScore(data)
        const narrative = this.detectNarrative(data.symbol)
        const reason = this.generateReason(data)
        const pair = data.symbol.replace('USDT', '/USDT')

        return {
          symbol: data.symbol,
          pair,
          score,
          volume24h: data.volume24h,
          priceChange24h: data.priceChange24h,
          volatility: this.calculateVolatility(data),
          spread: this.calculateSpreadPercent(data),
          marketCap: data.marketCap || 0,
          narrative,
          reason
        }
      })

      // Sort by score and return top N
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
    } catch (error) {
      console.error('Error generating recommendations:', error)
      return []
    }
  }

  clearCache() {
    this.cache.clear()
  }
}

export const cryptoRecommendationService = new CryptoRecommendationService()
