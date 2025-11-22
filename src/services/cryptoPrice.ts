import axios from 'axios'

export interface CryptoPrice {
  symbol: string
  price: number
  priceChange: number
  priceChangePercent: number
  high24h: number
  low24h: number
  volume24h: number
  lastUpdate: number
  exchange: string
}

// Map display names to exchange symbols (most exchanges use same format)
const symbolMap: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT',
  'ETH/USDT': 'ETHUSDT',
  'BNB/USDT': 'BNBUSDT',
  'SOL/USDT': 'SOLUSDT',
  'XRP/USDT': 'XRPUSDT',
  'ADA/USDT': 'ADAUSDT',
  'DOGE/USDT': 'DOGEUSDT',
  'MATIC/USDT': 'MATICUSDT',
  'DOT/USDT': 'DOTUSDT',
  'AVAX/USDT': 'AVAXUSDT'
}

// Exchange API endpoints
const EXCHANGE_APIS: Record<string, string> = {
  binance: 'https://api.binance.com/api/v3',
  bybit: 'https://api.bybit.com/v5',
  okx: 'https://www.okx.com/api/v5',
  kucoin: 'https://api.kucoin.com/api/v1',
  gateio: 'https://api.gateio.ws/api/v4',
  htx: 'https://api.huobi.pro',
  mexc: 'https://api.mexc.com/api/v3'
}

// Fetch price from Binance
const fetchBinancePrice = async (symbol: string, pair: string): Promise<CryptoPrice | null> => {
  const response = await axios.get(`${EXCHANGE_APIS.binance}/ticker/24hr`, {
    params: { symbol },
    timeout: 5000
  })
  const data = response.data
  return {
    symbol: pair,
    price: parseFloat(data.lastPrice),
    priceChange: parseFloat(data.priceChange),
    priceChangePercent: parseFloat(data.priceChangePercent),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
    volume24h: parseFloat(data.volume),
    lastUpdate: Date.now(),
    exchange: 'binance'
  }
}

// Fetch price from Bybit
const fetchBybitPrice = async (symbol: string, pair: string): Promise<CryptoPrice | null> => {
  const response = await axios.get(`${EXCHANGE_APIS.bybit}/market/tickers`, {
    params: {
      category: 'linear',
      symbol: symbol
    },
    timeout: 5000
  })
  const data = response.data.result.list[0]
  if (!data) return null

  return {
    symbol: pair,
    price: parseFloat(data.lastPrice),
    priceChange: parseFloat(data.price24hPcnt) * parseFloat(data.lastPrice),
    priceChangePercent: parseFloat(data.price24hPcnt) * 100,
    high24h: parseFloat(data.highPrice24h),
    low24h: parseFloat(data.lowPrice24h),
    volume24h: parseFloat(data.volume24h),
    lastUpdate: Date.now(),
    exchange: 'bybit'
  }
}

// Fetch price from OKX
const fetchOKXPrice = async (symbol: string, pair: string): Promise<CryptoPrice | null> => {
  const instId = symbol.replace('USDT', '-USDT')
  const response = await axios.get(`${EXCHANGE_APIS.okx}/market/ticker`, {
    params: { instId },
    timeout: 5000
  })
  const data = response.data.data[0]
  if (!data) return null

  const currentPrice = parseFloat(data.last)
  const openPrice = parseFloat(data.open24h)
  const priceChange = currentPrice - openPrice

  return {
    symbol: pair,
    price: currentPrice,
    priceChange: priceChange,
    priceChangePercent: (priceChange / openPrice) * 100,
    high24h: parseFloat(data.high24h),
    low24h: parseFloat(data.low24h),
    volume24h: parseFloat(data.vol24h),
    lastUpdate: Date.now(),
    exchange: 'okx'
  }
}

// Main function to get crypto price from any exchange
export const getCryptoPrice = async (pair: string, exchange: string = 'binance'): Promise<CryptoPrice | null> => {
  try {
    const symbol = symbolMap[pair]
    if (!symbol) {
      console.error('Symbol not found:', pair)
      return null
    }

    // Route to appropriate exchange API
    switch (exchange.toLowerCase()) {
      case 'bybit':
        return await fetchBybitPrice(symbol, pair)
      case 'okx':
        return await fetchOKXPrice(symbol, pair)
      case 'binance':
      default:
        return await fetchBinancePrice(symbol, pair)
    }
  } catch (error) {
    console.error(`Error fetching ${pair} price from ${exchange}:`, error)
    // Fallback to Binance if the selected exchange fails
    if (exchange !== 'binance') {
      console.log('Falling back to Binance API...')
      return getCryptoPrice(pair, 'binance')
    }
    return null
  }
}

// Get multiple prices at once
export const getMultiplePrices = async (pairs: string[], exchange: string = 'binance'): Promise<Record<string, CryptoPrice>> => {
  const prices: Record<string, CryptoPrice> = {}

  await Promise.all(
    pairs.map(async (pair) => {
      const price = await getCryptoPrice(pair, exchange)
      if (price) {
        prices[pair] = price
      }
    })
  )

  return prices
}
