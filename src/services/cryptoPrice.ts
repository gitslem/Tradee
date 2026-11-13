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
  // Set when the price is not from the chosen exchange's USDT market
  note?: string
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
  'POL/USDT': 'POLUSDT',
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
  bitget: 'https://api.bitget.com/api/v2',
  kraken: 'https://api.kraken.com/0/public',
  coinbase: 'https://api.exchange.coinbase.com'
}

// KuCoin and MEXC don't allow browser requests from other sites (no CORS),
// so their prices can't be read directly; Binance is shown instead.
const NO_BROWSER_ACCESS: Record<string, string> = {
  kucoin: 'KuCoin',
  mexc: 'MEXC'
}

const EXCHANGE_NAMES: Record<string, string> = {
  bybit: 'Bybit', okx: 'OKX', gateio: 'Gate', htx: 'HTX', bitget: 'Bitget', kraken: 'Kraken', coinbase: 'Coinbase'
}

const num = (v: unknown): number => parseFloat(String(v))

// Build a price from last/open/high/low/volume; change is worked out from the 24h open
const fromOpen = (pair: string, exchange: string, last: number, open: number, high: number, low: number, volume: number, note?: string): CryptoPrice => ({
  symbol: pair,
  price: last,
  priceChange: last - open,
  priceChangePercent: open ? ((last - open) / open) * 100 : 0,
  high24h: high,
  low24h: low,
  volume24h: volume,
  lastUpdate: Date.now(),
  exchange,
  ...(note ? { note } : {})
})

// Gate: BTC_USDT
const fetchGatePrice = async (symbol: string, pair: string): Promise<CryptoPrice | null> => {
  const response = await axios.get(`${EXCHANGE_APIS.gateio}/spot/tickers`, {
    params: { currency_pair: symbol.replace('USDT', '_USDT') },
    timeout: 5000
  })
  const d = response.data?.[0]
  if (!d) return null
  const last = num(d.last)
  const pct = num(d.change_percentage)
  const open = last / (1 + pct / 100)
  return fromOpen(pair, 'gateio', last, open, num(d.high_24h), num(d.low_24h), num(d.base_volume))
}

// HTX: btcusdt
const fetchHTXPrice = async (symbol: string, pair: string): Promise<CryptoPrice | null> => {
  const response = await axios.get(`${EXCHANGE_APIS.htx}/market/detail/merged`, {
    params: { symbol: symbol.toLowerCase() },
    timeout: 5000
  })
  const t = response.data?.tick
  if (response.data?.status !== 'ok' || !t) return null
  return fromOpen(pair, 'htx', num(t.close), num(t.open), num(t.high), num(t.low), num(t.amount))
}

// Bitget: BTCUSDT (spot)
const fetchBitgetPrice = async (symbol: string, pair: string): Promise<CryptoPrice | null> => {
  const response = await axios.get(`${EXCHANGE_APIS.bitget}/spot/market/tickers`, {
    params: { symbol },
    timeout: 5000
  })
  const d = response.data?.data?.[0]
  if (!d) return null
  return fromOpen(pair, 'bitget', num(d.lastPr), num(d.open), num(d.high24h), num(d.low24h), num(d.baseVolume))
}

const KRAKEN_NO_USDT = new Set(['POL'])

// Kraken: BTCUSDT (answers as XBTUSDT); falls back to the USD market if there is no USDT one
const fetchKrakenPrice = async (symbol: string, pair: string): Promise<CryptoPrice | null> => {
  const base = symbol.replace('USDT', '')
  const usd = [`${base}USD`, `Kraken has no ${base}/USDT market - showing ${base}/USD`] as const
  // Kraken's "unknown pair" reply has no CORS header, so skip pairs known to be missing
  const markets = KRAKEN_NO_USDT.has(base) ? [usd] : [[`${base}USDT`, undefined] as const, usd]
  for (const [market, note] of markets) {
    try {
      const response = await axios.get(`${EXCHANGE_APIS.kraken}/Ticker`, { params: { pair: market }, timeout: 5000 })
      const result = response.data?.result as Record<string, { c: string[]; o: string; h: string[]; l: string[]; v: string[] }> | undefined
      const t = result && Object.values(result)[0]
      if (t) return fromOpen(pair, 'kraken', num(t.c[0]), num(t.o), num(t.h[1]), num(t.l[1]), num(t.v[1]), note)
    } catch (error) {
      if (market === usd[0]) throw error
    }
  }
  return null
}

// Coinbase: BTC-USDT; falls back to BTC-USD where there is no USDT market
const fetchCoinbasePrice = async (symbol: string, pair: string): Promise<CryptoPrice | null> => {
  const base = symbol.replace('USDT', '')
  for (const [market, note] of [[`${base}-USDT`, undefined], [`${base}-USD`, `Coinbase has no ${base}/USDT market - showing ${base}/USD`]] as const) {
    try {
      const response = await axios.get(`${EXCHANGE_APIS.coinbase}/products/${market}/stats`, { timeout: 5000 })
      const d = response.data
      if (d?.last) return fromOpen(pair, 'coinbase', num(d.last), num(d.open), num(d.high), num(d.low), num(d.volume), note)
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error
    }
  }
  return null
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

    const id = exchange.toLowerCase()
    if (NO_BROWSER_ACCESS[id]) {
      const price = await fetchBinancePrice(symbol, pair)
      return price && { ...price, note: `${NO_BROWSER_ACCESS[id]} doesn't share prices with websites - showing Binance` }
    }

    // Route to appropriate exchange API
    let price: CryptoPrice | null
    switch (id) {
      case 'bybit': price = await fetchBybitPrice(symbol, pair); break
      case 'okx': price = await fetchOKXPrice(symbol, pair); break
      case 'gateio': price = await fetchGatePrice(symbol, pair); break
      case 'htx': price = await fetchHTXPrice(symbol, pair); break
      case 'bitget': price = await fetchBitgetPrice(symbol, pair); break
      case 'kraken': price = await fetchKrakenPrice(symbol, pair); break
      case 'coinbase': price = await fetchCoinbasePrice(symbol, pair); break
      default: return await fetchBinancePrice(symbol, pair)
    }
    if (!price) throw new Error(`No ${pair} price from ${exchange}`)
    return price
  } catch (error) {
    console.error(`Error fetching ${pair} price from ${exchange}:`, error)
    // Fallback to Binance if the selected exchange fails, and say so
    if (exchange.toLowerCase() !== 'binance') {
      const price = await getCryptoPrice(pair, 'binance')
      const name = EXCHANGE_NAMES[exchange.toLowerCase()] ?? exchange
      return price && { ...price, note: `${name} price unavailable right now - showing Binance` }
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
