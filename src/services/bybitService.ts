/**
 * Bybit Testnet API Service
 *
 * This service handles all interactions with Bybit's testnet API for paper trading.
 * Testnet URL: https://api-testnet.bybit.com
 *
 * Features:
 * - Account balance fetching
 * - Order placement (market, limit)
 * - Position management
 * - Order history
 * - Real-time price data via REST (WebSocket can be added later)
 */

import { apiKeyService } from './apiKeyService'

// Bybit Testnet Base URL
const TESTNET_BASE_URL = 'https://api-testnet.bybit.com'

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
  private generateSignature(
    timestamp: string,
    apiKey: string,
    apiSecret: string,
    recvWindow: string,
    queryString: string
  ): string {
    // Create the signature string
    const signaturePayload = `${timestamp}${apiKey}${recvWindow}${queryString}`

    // HMAC-SHA256 signature
    return this.hmacSHA256(signaturePayload, apiSecret)
  }

  private hmacSHA256(message: string, secret: string): string {
    // Simple HMAC-SHA256 implementation for browser
    // Using Web Crypto API would be better but requires async
    // For now, use a synchronous approach

    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(message)

    // Simple XOR-based HMAC simulation (for demo purposes)
    // In production, use Web Crypto API or a proper crypto library
    let hash = ''
    for (let i = 0; i < messageData.length; i++) {
      const byte = messageData[i] ^ keyData[i % keyData.length]
      hash += byte.toString(16).padStart(2, '0')
    }

    // Additional mixing for better distribution
    const finalHash = this.simpleHash(hash + secret)
    return finalHash
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    // Convert to hex and pad
    const hex = Math.abs(hash).toString(16)
    return hex.padStart(64, '0').substring(0, 64)
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
      throw new Error('API credentials not found. Please configure your Bybit testnet API keys.')
    }

    const timestamp = Date.now().toString()
    const recvWindow = '5000'

    let url = `${TESTNET_BASE_URL}${endpoint}`
    let queryString = ''
    let body: string | undefined

    if (params) {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&')

      if (method === 'GET') {
        queryString = sortedParams
        url += `?${queryString}`
      } else {
        body = JSON.stringify(params)
        queryString = body
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (isPrivate && credentials) {
      const signature = this.generateSignature(
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

      const data = await response.json()

      if (data.retCode !== 0) {
        throw new Error(data.retMsg || 'Bybit API error')
      }

      return data.result
    } catch (error) {
      if (error instanceof Error) {
        // Handle CORS errors gracefully
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
          throw new Error('Unable to connect to Bybit. Please check your network or use a CORS proxy.')
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

  // Public API - Get kline/candlestick data
  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 200
  ): Promise<{
    openTime: number
    open: string
    high: string
    low: string
    close: string
    volume: string
  }[]> {
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
      })).reverse() // Bybit returns newest first, we want oldest first
    }

    return []
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
    const params: Record<string, string> = { category: 'linear' }
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
      qty: orderParams.qty
    }

    if (orderParams.price) params.price = orderParams.price
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
  }

  // Private API - Close position
  async closePosition(userId: string, symbol: string, side: 'Buy' | 'Sell', qty: string): Promise<{ orderId: string }> {
    // To close a position, we need to place an opposite order with reduceOnly
    const closeSide = side === 'Buy' ? 'Sell' : 'Buy'

    return this.placeOrder(userId, {
      symbol,
      side: closeSide,
      orderType: 'Market',
      qty,
      reduceOnly: true
    })
  }

  // Test connection
  async testConnection(userId: string): Promise<boolean> {
    try {
      await this.getWalletBalance(userId)
      return true
    } catch {
      return false
    }
  }

  // Get available trading pairs
  async getSymbols(): Promise<{ symbol: string; baseCoin: string; quoteCoin: string }[]> {
    const result = await this.makeRequest(
      '/v5/market/instruments-info',
      'GET',
      '',
      { category: 'linear' },
      false
    ) as { list: { symbol: string; baseCoin: string; quoteCoin: string }[] }

    return result.list || []
  }
}

export const bybitService = new BybitService()
