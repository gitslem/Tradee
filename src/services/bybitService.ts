/**
 * Bybit Demo Trading / Testnet API Service
 *
 * Authenticated calls go to Bybit Demo Trading (real mainnet prices, demo funds)
 * or to the older testnet (separate prices), whichever the user connected.
 * Demo URL: https://api-demo.bybit.com   Testnet URL: https://api-testnet.bybit.com
 *
 * Features:
 * - Account balance fetching
 * - Order placement (market, limit)
 * - Position management
 * - Order history
 * - Real-time price data via REST
 * - Kline/candlestick data for charts
 */

import { apiKeyService } from './apiKeyService'

// Bybit API URLs
// Mainnet for public market data (prices match TradingView charts)
const MAINNET_BASE_URL = 'https://api.bybit.com'
// Authenticated trading goes to Demo Trading or testnet
const DEMO_BASE_URL = 'https://api-demo.bybit.com'
const TESTNET_BASE_URL = 'https://api-testnet.bybit.com'

export type BybitEnv = 'demo' | 'testnet'
const ENV_KEY = 'traddii_bybit_env'

// Which Bybit environment the user's keys belong to. Keys saved before Demo
// Trading was supported are testnet keys; new connections default to demo.
export const getBybitEnv = (userId: string): BybitEnv => {
  try {
    const saved = localStorage.getItem(`${ENV_KEY}_${userId}`)
    if (saved === 'demo' || saved === 'testnet') return saved
  } catch {
    // Storage unavailable
  }
  return apiKeyService.hasCredentials(userId, 'bybit_testnet') ? 'testnet' : 'demo'
}

export const setBybitEnv = (userId: string, env: BybitEnv) => {
  try {
    localStorage.setItem(`${ENV_KEY}_${userId}`, env)
  } catch {
    // Storage unavailable - falls back to the default above
  }
}

export const BYBIT_ENV_LABEL: Record<BybitEnv, string> = { demo: 'Demo', testnet: 'Testnet' }

export interface BybitPosition {
  symbol: string
  side: 'Buy' | 'Sell'
  size: string
  entryPrice: string
  leverage: string
  unrealisedPnl: string
  realisedPnl: string
  liqPrice: string
  markPrice: string
  positionValue: string
  takeProfit: string
  stopLoss: string
  createdTime: string
  updatedTime: string
}

export interface BybitOrder {
  orderId: string
  symbol: string
  side: 'Buy' | 'Sell'
  orderType: 'Market' | 'Limit'
  price: string
  qty: string
  orderStatus: string
  createdTime: string
  updatedTime: string
  takeProfit?: string
  stopLoss?: string
}

export interface BybitBalance {
  coin: string
  walletBalance: string
  availableBalance: string
  totalPositionIM: string
  totalPositionMM: string
  unrealisedPnl: string
  cumRealisedPnl: string
}

export interface BybitTicker {
  symbol: string
  lastPrice: string
  indexPrice: string
  markPrice: string
  prevPrice24h: string
  price24hPcnt: string
  highPrice24h: string
  lowPrice24h: string
  volume24h: string
  turnover24h: string
  fundingRate: string
  nextFundingTime: string
}

export interface BybitKline {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
}

export interface OrderParams {
  symbol: string
  side: 'Buy' | 'Sell'
  orderType: 'Market' | 'Limit'
  qty: string
  price?: string
  leverage?: string
  takeProfit?: string
  stopLoss?: string
  reduceOnly?: boolean
  closeOnTrigger?: boolean
}

class BybitService {
  // Generate HMAC-SHA256 signature using Web Crypto API
  private async generateSignature(
    timestamp: string,
    apiKey: string,
    apiSecret: string,
    recvWindow: string,
    queryString: string
  ): Promise<string> {
    const signaturePayload = `${timestamp}${apiKey}${recvWindow}${queryString}`

    // Use Web Crypto API for proper HMAC-SHA256
    const encoder = new TextEncoder()
    const keyData = encoder.encode(apiSecret)
    const messageData = encoder.encode(signaturePayload)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const hashArray = Array.from(new Uint8Array(signature))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return hashHex
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST',
    userId: string,
    params?: Record<string, string>,
    isPrivate: boolean = true
  ): Promise<unknown> {
    const credentials = isPrivate ? apiKeyService.getCredentials(userId, 'bybit_testnet') : null

    if (isPrivate && !credentials) {
      throw new Error('API credentials not found. Please connect your Bybit demo or testnet API keys.')
    }

    const timestamp = Date.now().toString()
    const recvWindow = '20000'

    // Use mainnet for public market data (prices match TradingView)
    // Use testnet for authenticated trading operations
    const env = getBybitEnv(userId)
    const baseUrl = !isPrivate ? MAINNET_BASE_URL : env === 'demo' ? DEMO_BASE_URL : TESTNET_BASE_URL
    let url = `${baseUrl}${endpoint}`
    let queryString = ''
    let body: string | undefined

    if (params) {
      if (method === 'GET') {
        // For GET requests, sort params alphabetically
        const sortedParams = Object.keys(params)
          .sort()
          .map(key => `${key}=${encodeURIComponent(params[key])}`)
          .join('&')
        queryString = sortedParams
        url += `?${queryString}`
      } else {
        // For POST requests, use JSON body
        body = JSON.stringify(params)
        queryString = body
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (isPrivate && credentials) {
      const signature = await this.generateSignature(
        timestamp,
        credentials.apiKey,
        credentials.apiSecret,
        recvWindow,
        queryString
      )

      headers['X-BAPI-API-KEY'] = credentials.apiKey
      headers['X-BAPI-TIMESTAMP'] = timestamp
      headers['X-BAPI-RECV-WINDOW'] = recvWindow
      headers['X-BAPI-SIGN'] = signature
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? body : undefined
      })

      // Bybit answers a bad key with an empty 401, not JSON
      if (response.status === 401 || response.status === 403) {
        throw new Error(`${env === 'demo' ? 'Bybit Demo Trading' : 'Bybit testnet'} rejected the API key. Check it was created for ${env === 'demo' ? 'Demo Trading' : 'testnet'} and copied in full.`)
      }
      const text = await response.text()
      if (!text) throw new Error(`Bybit returned an empty response (HTTP ${response.status})`)
      const data = JSON.parse(text)

      if (data.retCode !== 0) {
        throw new Error(data.retMsg || `Bybit API error: ${data.retCode}`)
      }

      return data.result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error(`Network error: Unable to connect to Bybit ${env === 'demo' ? 'Demo Trading' : 'testnet'}. Please check your internet connection.`)
        }
        throw error
      }
      throw new Error('Unknown error occurred')
    }
  }

  // Public API - Get ticker data (no auth required)
  async getTicker(symbol: string): Promise<BybitTicker> {
    const result = await this.makeRequest(
      '/v5/market/tickers',
      'GET',
      '',
      { category: 'linear', symbol },
      false
    ) as { list: BybitTicker[] }

    if (result.list && result.list.length > 0) {
      return result.list[0]
    }

    throw new Error('Ticker not found')
  }

  // Public API - Get multiple tickers
  async getTickers(symbols: string[]): Promise<BybitTicker[]> {
    const result = await this.makeRequest(
      '/v5/market/tickers',
      'GET',
      '',
      { category: 'linear' },
      false
    ) as { list: BybitTicker[] }

    if (result.list) {
      return result.list.filter(t => symbols.includes(t.symbol))
    }

    return []
  }

  // Public API - Get kline/candlestick data for charts
  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 200
  ): Promise<BybitKline[]> {
    const result = await this.makeRequest(
      '/v5/market/kline',
      'GET',
      '',
      {
        category: 'linear',
        symbol,
        interval,
        limit: limit.toString()
      },
      false
    ) as { list: string[][] }

    if (result.list) {
      return result.list.map(k => ({
        openTime: parseInt(k[0]),
        open: k[1],
        high: k[2],
        low: k[3],
        close: k[4],
        volume: k[5]
      })).reverse() // Bybit returns newest first, we want oldest first for charts
    }

    return []
  }

  // Public API - Get recent trades
  async getRecentTrades(symbol: string, limit: number = 50): Promise<{
    price: string
    size: string
    side: string
    time: string
  }[]> {
    const result = await this.makeRequest(
      '/v5/market/recent-trade',
      'GET',
      '',
      { category: 'linear', symbol, limit: limit.toString() },
      false
    ) as { list: { price: string; size: string; side: string; time: string }[] }

    return result.list || []
  }

  // Public API - Get orderbook
  async getOrderbook(symbol: string, limit: number = 25): Promise<{
    bids: [string, string][]
    asks: [string, string][]
  }> {
    const result = await this.makeRequest(
      '/v5/market/orderbook',
      'GET',
      '',
      { category: 'linear', symbol, limit: limit.toString() },
      false
    ) as { b: [string, string][]; a: [string, string][] }

    return {
      bids: result.b || [],
      asks: result.a || []
    }
  }

  // Private API - Get wallet balance
  async getWalletBalance(userId: string): Promise<BybitBalance[]> {
    const result = await this.makeRequest(
      '/v5/account/wallet-balance',
      'GET',
      userId,
      { accountType: 'UNIFIED' }
    ) as { list: { coin: BybitBalance[] }[] }

    if (result.list && result.list.length > 0) {
      return result.list[0].coin || []
    }

    return []
  }

  // Private API - Get positions
  async getPositions(userId: string, symbol?: string): Promise<BybitPosition[]> {
    const params: Record<string, string> = { category: 'linear', settleCoin: 'USDT' }
    if (symbol) params.symbol = symbol

    const result = await this.makeRequest(
      '/v5/position/list',
      'GET',
      userId,
      params
    ) as { list: BybitPosition[] }

    return result.list || []
  }

  // Private API - Place order
  async placeOrder(userId: string, orderParams: OrderParams): Promise<{ orderId: string }> {
    const params: Record<string, string> = {
      category: 'linear',
      symbol: orderParams.symbol,
      side: orderParams.side,
      orderType: orderParams.orderType,
      qty: orderParams.qty,
      timeInForce: orderParams.orderType === 'Market' ? 'IOC' : 'GTC'
    }

    if (orderParams.orderType === 'Limit' && orderParams.price) {
      params.price = orderParams.price
    }
    if (orderParams.takeProfit) params.takeProfit = orderParams.takeProfit
    if (orderParams.stopLoss) params.stopLoss = orderParams.stopLoss
    if (orderParams.reduceOnly) params.reduceOnly = 'true'
    if (orderParams.closeOnTrigger) params.closeOnTrigger = 'true'

    const result = await this.makeRequest(
      '/v5/order/create',
      'POST',
      userId,
      params
    ) as { orderId: string }

    return result
  }

  // Private API - Cancel order
  async cancelOrder(userId: string, symbol: string, orderId: string): Promise<boolean> {
    await this.makeRequest(
      '/v5/order/cancel',
      'POST',
      userId,
      {
        category: 'linear',
        symbol,
        orderId
      }
    )

    return true
  }

  // Private API - Get open orders
  async getOpenOrders(userId: string, symbol?: string): Promise<BybitOrder[]> {
    const params: Record<string, string> = { category: 'linear' }
    if (symbol) params.symbol = symbol

    const result = await this.makeRequest(
      '/v5/order/realtime',
      'GET',
      userId,
      params
    ) as { list: BybitOrder[] }

    return result.list || []
  }

  // Private API - Get order history
  async getOrderHistory(userId: string, symbol?: string, limit: number = 50): Promise<BybitOrder[]> {
    const params: Record<string, string> = {
      category: 'linear',
      limit: limit.toString()
    }
    if (symbol) params.symbol = symbol

    const result = await this.makeRequest(
      '/v5/order/history',
      'GET',
      userId,
      params
    ) as { list: BybitOrder[] }

    return result.list || []
  }

  // Private API - Set leverage
  async setLeverage(userId: string, symbol: string, leverage: string): Promise<boolean> {
    try {
      await this.makeRequest(
        '/v5/position/set-leverage',
        'POST',
        userId,
        {
          category: 'linear',
          symbol,
          buyLeverage: leverage,
          sellLeverage: leverage
        }
      )
      return true
    } catch (error) {
      // Leverage might already be set to this value
      if (error instanceof Error && error.message.includes('leverage not modified')) {
        return true
      }
      throw error
    }
  }

  // Private API - Close position
  async closePosition(userId: string, symbol: string, side: 'Buy' | 'Sell', qty: string): Promise<{ orderId: string }> {
    const closeSide = side === 'Buy' ? 'Sell' : 'Buy'

    return this.placeOrder(userId, {
      symbol,
      side: closeSide,
      orderType: 'Market',
      qty,
      reduceOnly: true
    })
  }

  // Test connection with API keys (throws with the exchange's error message)
  async testConnection(userId: string): Promise<boolean> {
    await this.getWalletBalance(userId)
    return true
  }

  // Get available trading pairs
  async getSymbols(): Promise<{ symbol: string; baseCoin: string; quoteCoin: string; minOrderQty: string; qtyStep: string }[]> {
    const result = await this.makeRequest(
      '/v5/market/instruments-info',
      'GET',
      '',
      { category: 'linear', status: 'Trading' },
      false
    ) as { list: { symbol: string; baseCoin: string; quoteCoin: string; lotSizeFilter: { minOrderQty: string; qtyStep: string } }[] }

    return (result.list || []).map(item => ({
      symbol: item.symbol,
      baseCoin: item.baseCoin,
      quoteCoin: item.quoteCoin,
      minOrderQty: item.lotSizeFilter?.minOrderQty || '0.001',
      qtyStep: item.lotSizeFilter?.qtyStep || '0.001'
    }))
  }
}

export const bybitService = new BybitService()
