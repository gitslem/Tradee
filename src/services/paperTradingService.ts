/**
 * Paper Trading Service
 * Handles trade persistence, P&L calculations, and automatic TP/SL execution
 * Uses Bybit-standard fee structure
 */

// Bybit Perpetual Fee Structure (as of 2024)
export const BYBIT_FEES = {
  TAKER: 0.00055,  // 0.055% - Market orders
  MAKER: 0.0002,   // 0.02% - Limit orders
  FUNDING_INTERVAL: 8, // hours
}

export interface PaperTrade {
  id: string
  symbol: string
  side: 'long' | 'short'
  entryPrice: number
  quantity: number
  leverage: number
  takeProfit?: number
  stopLoss?: number
  timestamp: number
  status: 'open' | 'closed'
  exitPrice?: number
  exitTimestamp?: number
  pnl?: number
  fees: number
  closeReason?: 'manual' | 'takeProfit' | 'stopLoss' | 'liquidation'
  orderType: 'market' | 'limit'
}

export interface PaperAccount {
  balance: number
  initialBalance: number
  totalPnl: number
  totalFees: number
  winCount: number
  lossCount: number
  trades: PaperTrade[]
  lastUpdated: number
}

const STORAGE_KEY_PREFIX = 'paper_trading_'
const DEFAULT_BALANCE = 10000 // $10,000 USDT starting balance

class PaperTradingService {
  private accounts: Map<string, PaperAccount> = new Map()

  /**
   * Get or create paper trading account for user
   */
  getAccount(userId: string): PaperAccount {
    // Check memory cache first
    if (this.accounts.has(userId)) {
      return this.accounts.get(userId)!
    }

    // Try to load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + userId)
    if (stored) {
      try {
        const account = JSON.parse(stored) as PaperAccount
        this.accounts.set(userId, account)
        return account
      } catch {
        // Invalid data, create new account
      }
    }

    // Create new account
    const newAccount: PaperAccount = {
      balance: DEFAULT_BALANCE,
      initialBalance: DEFAULT_BALANCE,
      totalPnl: 0,
      totalFees: 0,
      winCount: 0,
      lossCount: 0,
      trades: [],
      lastUpdated: Date.now()
    }

    this.accounts.set(userId, newAccount)
    this.saveAccount(userId)
    return newAccount
  }

  /**
   * Save account to localStorage
   */
  private saveAccount(userId: string): void {
    const account = this.accounts.get(userId)
    if (account) {
      account.lastUpdated = Date.now()
      localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(account))
    }
  }

  /**
   * Calculate entry fee for a trade
   */
  calculateEntryFee(notionalValue: number, orderType: 'market' | 'limit'): number {
    const feeRate = orderType === 'market' ? BYBIT_FEES.TAKER : BYBIT_FEES.MAKER
    return notionalValue * feeRate
  }

  /**
   * Calculate exit fee for a trade
   */
  calculateExitFee(notionalValue: number, orderType: 'market' | 'limit'): number {
    const feeRate = orderType === 'market' ? BYBIT_FEES.TAKER : BYBIT_FEES.MAKER
    return notionalValue * feeRate
  }

  /**
   * Calculate unrealized P&L for an open position
   */
  calculateUnrealizedPnL(trade: PaperTrade, currentPrice: number): number {
    if (trade.status !== 'open') return trade.pnl || 0

    const priceDiff = trade.side === 'long'
      ? currentPrice - trade.entryPrice
      : trade.entryPrice - currentPrice

    // P&L = (Price Difference) * Quantity
    // Note: Leverage is already factored in through position size
    return priceDiff * trade.quantity
  }

  /**
   * Calculate ROE (Return on Equity) percentage
   */
  calculateROE(trade: PaperTrade, currentPrice: number): number {
    const pnl = this.calculateUnrealizedPnL(trade, currentPrice)
    const margin = (trade.entryPrice * trade.quantity) / trade.leverage
    return (pnl / margin) * 100
  }

  /**
   * Calculate liquidation price for a position
   * Using Bybit's isolated margin formula
   */
  calculateLiquidationPrice(trade: PaperTrade): number {
    const MMR = 0.005 // Maintenance Margin Rate (0.5%)

    if (trade.side === 'long') {
      // Liq Price (Long) = Entry Price × (1 - 1/Leverage + MMR)
      return trade.entryPrice * (1 - 1 / trade.leverage + MMR)
    } else {
      // Liq Price (Short) = Entry Price × (1 + 1/Leverage - MMR)
      return trade.entryPrice * (1 + 1 / trade.leverage - MMR)
    }
  }

  /**
   * Open a new paper trade
   */
  openTrade(
    userId: string,
    params: {
      symbol: string
      side: 'long' | 'short'
      entryPrice: number
      quantity: number
      leverage: number
      takeProfit?: number
      stopLoss?: number
      orderType: 'market' | 'limit'
    }
  ): { success: boolean; trade?: PaperTrade; error?: string } {
    const account = this.getAccount(userId)

    // Calculate notional value and required margin
    const notionalValue = params.entryPrice * params.quantity
    const requiredMargin = notionalValue / params.leverage
    const entryFee = this.calculateEntryFee(notionalValue, params.orderType)
    const totalRequired = requiredMargin + entryFee

    // Check if user has enough balance
    if (account.balance < totalRequired) {
      return {
        success: false,
        error: `Insufficient balance. Required: $${totalRequired.toFixed(2)}, Available: $${account.balance.toFixed(2)}`
      }
    }

    // Create the trade
    const trade: PaperTrade = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol: params.symbol,
      side: params.side,
      entryPrice: params.entryPrice,
      quantity: params.quantity,
      leverage: params.leverage,
      takeProfit: params.takeProfit,
      stopLoss: params.stopLoss,
      timestamp: Date.now(),
      status: 'open',
      fees: entryFee,
      orderType: params.orderType
    }

    // Deduct margin and fees from balance
    account.balance -= totalRequired
    account.totalFees += entryFee
    account.trades.push(trade)

    this.saveAccount(userId)

    return { success: true, trade }
  }

  /**
   * Close a paper trade
   */
  closeTrade(
    userId: string,
    tradeId: string,
    exitPrice: number,
    closeReason: 'manual' | 'takeProfit' | 'stopLoss' | 'liquidation' = 'manual'
  ): { success: boolean; trade?: PaperTrade; error?: string } {
    const account = this.getAccount(userId)
    const tradeIndex = account.trades.findIndex(t => t.id === tradeId)

    if (tradeIndex === -1) {
      return { success: false, error: 'Trade not found' }
    }

    const trade = account.trades[tradeIndex]

    if (trade.status !== 'open') {
      return { success: false, error: 'Trade is already closed' }
    }

    // Calculate P&L
    const priceDiff = trade.side === 'long'
      ? exitPrice - trade.entryPrice
      : trade.entryPrice - exitPrice
    const grossPnl = priceDiff * trade.quantity

    // Calculate exit fee
    const exitNotional = exitPrice * trade.quantity
    const exitFee = this.calculateExitFee(exitNotional, 'market') // Closing is always market

    // Net P&L after exit fee
    const netPnl = grossPnl - exitFee

    // Return margin to balance
    const entryNotional = trade.entryPrice * trade.quantity
    const margin = entryNotional / trade.leverage

    // Update trade
    trade.status = 'closed'
    trade.exitPrice = exitPrice
    trade.exitTimestamp = Date.now()
    trade.pnl = netPnl
    trade.fees += exitFee
    trade.closeReason = closeReason

    // Update account
    account.balance += margin + netPnl // Return margin + P&L
    account.totalPnl += netPnl
    account.totalFees += exitFee

    if (netPnl >= 0) {
      account.winCount++
    } else {
      account.lossCount++
    }

    this.saveAccount(userId)

    return { success: true, trade }
  }

  /**
   * Check and execute TP/SL for all open trades
   */
  checkAndExecuteTPSL(userId: string, currentPrices: Map<string, number>): PaperTrade[] {
    const account = this.getAccount(userId)
    const closedTrades: PaperTrade[] = []

    for (const trade of account.trades) {
      if (trade.status !== 'open') continue

      const currentPrice = currentPrices.get(trade.symbol)
      if (!currentPrice) continue

      // Check liquidation first
      const liqPrice = this.calculateLiquidationPrice(trade)
      const isLiquidated = trade.side === 'long'
        ? currentPrice <= liqPrice
        : currentPrice >= liqPrice

      if (isLiquidated) {
        const result = this.closeTrade(userId, trade.id, liqPrice, 'liquidation')
        if (result.success && result.trade) {
          closedTrades.push(result.trade)
        }
        continue
      }

      // Check Take Profit
      if (trade.takeProfit) {
        const tpHit = trade.side === 'long'
          ? currentPrice >= trade.takeProfit
          : currentPrice <= trade.takeProfit

        if (tpHit) {
          const result = this.closeTrade(userId, trade.id, trade.takeProfit, 'takeProfit')
          if (result.success && result.trade) {
            closedTrades.push(result.trade)
          }
          continue
        }
      }

      // Check Stop Loss
      if (trade.stopLoss) {
        const slHit = trade.side === 'long'
          ? currentPrice <= trade.stopLoss
          : currentPrice >= trade.stopLoss

        if (slHit) {
          const result = this.closeTrade(userId, trade.id, trade.stopLoss, 'stopLoss')
          if (result.success && result.trade) {
            closedTrades.push(result.trade)
          }
        }
      }
    }

    return closedTrades
  }

  /**
   * Get all open trades for a user
   */
  getOpenTrades(userId: string): PaperTrade[] {
    const account = this.getAccount(userId)
    return account.trades.filter(t => t.status === 'open')
  }

  /**
   * Get trade history for a user
   */
  getTradeHistory(userId: string, limit?: number): PaperTrade[] {
    const account = this.getAccount(userId)
    const closedTrades = account.trades
      .filter(t => t.status === 'closed')
      .sort((a, b) => (b.exitTimestamp || 0) - (a.exitTimestamp || 0))

    return limit ? closedTrades.slice(0, limit) : closedTrades
  }

  /**
   * Get account statistics
   */
  getAccountStats(userId: string): {
    balance: number
    initialBalance: number
    totalPnl: number
    totalFees: number
    winCount: number
    lossCount: number
    winRate: number
    totalTrades: number
    openPositions: number
  } {
    const account = this.getAccount(userId)
    const totalTrades = account.winCount + account.lossCount
    const winRate = totalTrades > 0 ? (account.winCount / totalTrades) * 100 : 0

    return {
      balance: account.balance,
      initialBalance: account.initialBalance,
      totalPnl: account.totalPnl,
      totalFees: account.totalFees,
      winCount: account.winCount,
      lossCount: account.lossCount,
      winRate,
      totalTrades,
      openPositions: account.trades.filter(t => t.status === 'open').length
    }
  }

  /**
   * Reset account to default state
   */
  resetAccount(userId: string): void {
    const newAccount: PaperAccount = {
      balance: DEFAULT_BALANCE,
      initialBalance: DEFAULT_BALANCE,
      totalPnl: 0,
      totalFees: 0,
      winCount: 0,
      lossCount: 0,
      trades: [],
      lastUpdated: Date.now()
    }

    this.accounts.set(userId, newAccount)
    this.saveAccount(userId)
  }

  /**
   * Add funds to account (for testing)
   */
  addFunds(userId: string, amount: number): void {
    const account = this.getAccount(userId)
    account.balance += amount
    account.initialBalance += amount
    this.saveAccount(userId)
  }
}

export const paperTradingService = new PaperTradingService()
