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
  /** pending = resting limit order (margin and fee reserved, not yet filled) */
  status: 'pending' | 'open' | 'closed' | 'cancelled'
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
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(account))
      } catch (error) {
        console.error('Failed to save paper trading account:', error)
      }
    }
  }

  private margin(trade: PaperTrade): number {
    return (trade.entryPrice * trade.quantity) / trade.leverage
  }

  /**
   * Validate an order before it is placed. Returns an error message or null.
   */
  validateOrder(params: {
    side: 'long' | 'short'
    entryPrice: number
    quantity: number
    leverage: number
    takeProfit?: number
    stopLoss?: number
  }): string | null {
    const { side, entryPrice, quantity, leverage, takeProfit, stopLoss } = params
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) return 'Invalid price'
    if (!Number.isFinite(quantity) || quantity <= 0) return 'Please enter a valid quantity'
    if (!Number.isFinite(leverage) || leverage < 1 || leverage > 100) return 'Leverage must be between 1x and 100x'

    const isLong = side === 'long'
    if (takeProfit !== undefined) {
      if (!Number.isFinite(takeProfit) || takeProfit <= 0) return 'Invalid take profit'
      if (isLong ? takeProfit <= entryPrice : takeProfit >= entryPrice) {
        return `Take profit must be ${isLong ? 'above' : 'below'} the entry price for a ${side}`
      }
    }
    if (stopLoss !== undefined) {
      if (!Number.isFinite(stopLoss) || stopLoss <= 0) return 'Invalid stop loss'
      if (isLong ? stopLoss >= entryPrice : stopLoss <= entryPrice) {
        return `Stop loss must be ${isLong ? 'below' : 'above'} the entry price for a ${side}`
      }
      const liq = this.calculateLiquidationPrice({ side, entryPrice, leverage })
      if (isLong ? stopLoss <= liq : stopLoss >= liq) {
        return `Stop loss is past the liquidation price ($${liq.toFixed(2)}). Lower the leverage or tighten the stop.`
      }
    }
    return null
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
  calculateLiquidationPrice(trade: Pick<PaperTrade, 'side' | 'entryPrice' | 'leverage'>): number {
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
    },
    marketPrice: number
  ): { success: boolean; trade?: PaperTrade; error?: string } {
    const account = this.getAccount(userId)

    if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
      return { success: false, error: 'Unable to get current price' }
    }

    // A limit order that is already marketable fills immediately at the market
    // price as a taker; otherwise it rests until price reaches it.
    const isLimit = params.orderType === 'limit'
    const marketable = !isLimit || (params.side === 'long'
      ? marketPrice <= params.entryPrice
      : marketPrice >= params.entryPrice)
    const entryPrice = marketable ? marketPrice : params.entryPrice
    const feeType: 'market' | 'limit' = marketable ? 'market' : 'limit'

    const validationError = this.validateOrder({ ...params, entryPrice })
    if (validationError) {
      return { success: false, error: validationError }
    }

    // Calculate notional value and required margin
    const notionalValue = entryPrice * params.quantity
    const requiredMargin = notionalValue / params.leverage
    const entryFee = this.calculateEntryFee(notionalValue, feeType)
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
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      symbol: params.symbol,
      side: params.side,
      entryPrice,
      quantity: params.quantity,
      leverage: params.leverage,
      takeProfit: params.takeProfit,
      stopLoss: params.stopLoss,
      timestamp: Date.now(),
      status: marketable ? 'open' : 'pending',
      fees: entryFee,
      orderType: feeType
    }

    // Deduct (or, for pending orders, reserve) margin and fees from balance
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

    const margin = this.margin(trade)
    const entryFee = trade.fees
    const isLiquidation = closeReason === 'liquidation'

    // Closing is always a market (taker) order. On liquidation (isolated
    // margin) the whole position margin is lost and nothing is returned.
    const exitFee = isLiquidation ? 0 : this.calculateExitFee(exitPrice * trade.quantity, 'market')
    const returned = isLiquidation ? 0 : margin + grossPnl - exitFee

    // Net P&L includes both entry and exit fees, so it matches the balance change
    const netPnl = returned - margin - entryFee

    // Update trade
    trade.status = 'closed'
    trade.exitPrice = exitPrice
    trade.exitTimestamp = Date.now()
    trade.pnl = netPnl
    trade.fees += exitFee
    trade.closeReason = closeReason

    // Update account
    account.balance += returned
    account.totalPnl += netPnl
    account.totalFees += exitFee

    if (netPnl > 0) {
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
  checkAndExecuteTPSL(
    userId: string,
    currentPrices: Map<string, number>
  ): { closed: PaperTrade[]; filled: PaperTrade[] } {
    const account = this.getAccount(userId)
    const closedTrades: PaperTrade[] = []
    const filledOrders: PaperTrade[] = []

    for (const trade of account.trades) {
      const currentPrice = currentPrices.get(trade.symbol)
      if (!currentPrice) continue

      // Fill resting limit orders once price reaches them
      if (trade.status === 'pending') {
        const reached = trade.side === 'long'
          ? currentPrice <= trade.entryPrice
          : currentPrice >= trade.entryPrice
        if (reached) {
          trade.status = 'open'
          trade.timestamp = Date.now()
          filledOrders.push(trade)
          this.saveAccount(userId)
        }
        continue
      }

      if (trade.status !== 'open') continue

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
          // Stops fill at market, which may be worse than the stop price
          const result = this.closeTrade(userId, trade.id, currentPrice, 'stopLoss')
          if (result.success && result.trade) {
            closedTrades.push(result.trade)
          }
        }
      }
    }

    return { closed: closedTrades, filled: filledOrders }
  }

  /**
   * Cancel a pending limit order and release its reserved margin and fee
   */
  cancelOrder(userId: string, tradeId: string): { success: boolean; error?: string } {
    const account = this.getAccount(userId)
    const trade = account.trades.find(t => t.id === tradeId)
    if (!trade || trade.status !== 'pending') {
      return { success: false, error: 'Order not found' }
    }
    account.balance += this.margin(trade) + trade.fees
    account.totalFees -= trade.fees
    trade.fees = 0
    trade.status = 'cancelled'
    trade.exitTimestamp = Date.now()
    this.saveAccount(userId)
    return { success: true }
  }

  /**
   * Get resting limit orders for a user
   */
  getPendingOrders(userId: string): PaperTrade[] {
    return this.getAccount(userId).trades.filter(t => t.status === 'pending')
  }

  /**
   * Symbols that need live prices (open positions and pending orders)
   */
  getActiveSymbols(userId: string): string[] {
    const active = this.getAccount(userId).trades.filter(t => t.status === 'open' || t.status === 'pending')
    return [...new Set(active.map(t => t.symbol))]
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
