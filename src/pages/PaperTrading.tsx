import { useState, useEffect, useCallback, useRef } from 'react'
import './PaperTrading.css'
import TradingBackground from '../components/TradingBackground'
import { useAuth } from '../context/auth'
import { useTheme } from '../context/theme'
import { apiKeyService } from '../services/apiKeyService'
import { bybitService } from '../services/bybitService'
import { paperTradingService, BYBIT_FEES } from '../services/paperTradingService'
import type { PaperTrade } from '../services/paperTradingService'
import type { BybitTicker, BybitPosition, BybitOrder, BybitBalance } from '../services/bybitService'
import {
  Play, Settings, TrendingUp, TrendingDown, Wallet, Key, Eye, EyeOff,
  RefreshCw, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp,
  Target, Shield, Zap, Clock, BarChart3, DollarSign,
  ArrowUpRight, ArrowDownRight, Layers, Activity, Lock, Unlock,
  LineChart, Info, ExternalLink, RotateCcw, AlertTriangle
} from 'lucide-react'

const POPULAR_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT'
]

// TradingView timeframe format
const TIMEFRAMES = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1H' },
  { value: '240', label: '4H' },
  { value: 'D', label: '1D' }
]

const PaperTrading = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const userId = user?.uid || 'anonymous'

  // API Configuration State
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  // Trading State
  const [selectedPair, setSelectedPair] = useState('BTCUSDT')
  const [selectedTimeframe, setSelectedTimeframe] = useState('15')
  const [ticker, setTicker] = useState<BybitTicker | null>(null)
  const [allTickers, setAllTickers] = useState<Map<string, number>>(new Map())
  // Latest prices for the polling loop, without restarting it on every update
  const allTickersRef = useRef(allTickers)
  const [balance, setBalance] = useState<BybitBalance[]>([])
  const [positions, setPositions] = useState<BybitPosition[]>([])
  const [openOrders, setOpenOrders] = useState<BybitOrder[]>([])
  const [orderHistory, setOrderHistory] = useState<BybitOrder[]>([])

  // Order Form State
  const [orderSide, setOrderSide] = useState<'Buy' | 'Sell'>('Buy')
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market')
  const [orderQty, setOrderQty] = useState('')
  const [orderPrice, setOrderPrice] = useState('')
  const [orderLeverage, setOrderLeverage] = useState('10')
  const [orderTakeProfit, setOrderTakeProfit] = useState('')
  const [orderStopLoss, setOrderStopLoss] = useState('')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState('')

  // Paper Trading State
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([])
  const [paperBalance, setPaperBalance] = useState(10000)
  const [paperStats, setPaperStats] = useState({
    totalPnl: 0,
    totalFees: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0
  })
  const [usePaperMode, setUsePaperMode] = useState(true)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // TradingView Chart
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  // UI State
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions')
  const [isLoading, setIsLoading] = useState(false)
  const [showOrderPanel, setShowOrderPanel] = useState(true)
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' }[]>([])

  const loadPaperTradingData = useCallback(() => {
    const account = paperTradingService.getAccount(userId)
    setPaperBalance(account.balance)
    setPaperTrades(account.trades)
    const stats = paperTradingService.getAccountStats(userId)
    setPaperStats({
      totalPnl: stats.totalPnl,
      totalFees: stats.totalFees,
      winCount: stats.winCount,
      lossCount: stats.lossCount,
      winRate: stats.winRate
    })
  }, [userId])

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }, [])

  const fetchAccountData = useCallback(async (skipConnectionCheck = false) => {
    if (!isConnected && !skipConnectionCheck) return

    setIsLoading(true)
    try {
      const [balanceData, positionsData, ordersData, historyData] = await Promise.all([
        bybitService.getWalletBalance(userId),
        bybitService.getPositions(userId),
        bybitService.getOpenOrders(userId),
        bybitService.getOrderHistory(userId)
      ])

      setBalance(balanceData)
      setPositions(positionsData.filter(p => parseFloat(p.size) > 0))
      setOpenOrders(ordersData)
      setOrderHistory(historyData)
    } catch (error) {
      console.error('Failed to fetch account data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, userId])

  const testConnection = useCallback(async () => {
    setIsConnecting(true)
    setConnectionError('')

    try {
      const connected = await bybitService.testConnection(userId)
      setIsConnected(connected)

      if (connected) {
        // isConnected state hasn't updated yet in this closure, so skip the check
        await fetchAccountData(true)
        setUsePaperMode(false)
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed')
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }, [userId, fetchAccountData])

  useEffect(() => {
    allTickersRef.current = allTickers
  }, [allTickers])

  // Load paper trading data on mount
  useEffect(() => {
    loadPaperTradingData()
  }, [loadPaperTradingData])

  // Check for existing API credentials on mount
  useEffect(() => {
    const hasCredentials = apiKeyService.hasCredentials(userId, 'bybit_testnet')
    if (hasCredentials) {
      testConnection()
    }
  }, [userId, testConnection])


  // Initialize TradingView Advanced Chart Widget
  useEffect(() => {
    const chartContainer = chartContainerRef.current
    if (!chartContainer) return

    // Clear previous widget
    if (widgetRef.current) {
      chartContainer.innerHTML = ''
    }

    // Create widget container
    const container = document.createElement('div')
    container.id = 'tradingview_chart'
    container.style.width = '100%'
    container.style.height = '100%'
    chartContainer.appendChild(container)
    widgetRef.current = container

    // TradingView symbol format for Bybit perpetual: BYBIT:BTCUSDT.P
    const tvSymbol = `BYBIT:${selectedPair}.P`

    // Load TradingView widget script
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: selectedTimeframe,
      timezone: 'Etc/UTC',
      theme: theme === 'night' ? 'dark' : 'light',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      backgroundColor: theme === 'night' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 1)',
      gridColor: theme === 'night' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)',
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      save_image: true,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      allow_symbol_change: false,
      details: true,
      hotlist: false,
      calendar: false,
      studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      withdateranges: true,
      drawings_access: { type: 'all' },
      container_id: 'tradingview_chart'
    })

    container.appendChild(script)

    return () => {
      chartContainer.innerHTML = ''
    }
  }, [selectedPair, selectedTimeframe, theme])

  // Fetch ticker data periodically and check TP/SL
  useEffect(() => {
    const fetchTickerAndCheckTPSL = async () => {
      try {
        const tickerData = await bybitService.getTicker(selectedPair)
        setTicker(tickerData)

        // Update all tickers map for TP/SL checking
        const newTickers = new Map(allTickersRef.current)
        newTickers.set(selectedPair, parseFloat(tickerData.lastPrice))
        setAllTickers(newTickers)

        // Check and execute TP/SL for paper trades
        if (usePaperMode) {
          const closedTrades = paperTradingService.checkAndExecuteTPSL(userId, newTickers)
          if (closedTrades.length > 0) {
            loadPaperTradingData()
            closedTrades.forEach(trade => {
              const reason = trade.closeReason === 'takeProfit' ? 'Take Profit' :
                            trade.closeReason === 'stopLoss' ? 'Stop Loss' :
                            trade.closeReason === 'liquidation' ? 'Liquidated' : 'Closed'
              const pnlText = (trade.pnl || 0) >= 0 ? `+$${(trade.pnl || 0).toFixed(2)}` : `-$${Math.abs(trade.pnl || 0).toFixed(2)}`
              addNotification(
                `${trade.symbol} ${reason}: ${pnlText}`,
                (trade.pnl || 0) >= 0 ? 'success' : 'error'
              )
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch ticker:', error)
      }
    }

    fetchTickerAndCheckTPSL()
    const interval = setInterval(fetchTickerAndCheckTPSL, 2000)
    return () => clearInterval(interval)
  }, [selectedPair, userId, usePaperMode, loadPaperTradingData, addNotification])

  // Fetch prices for all open positions' symbols
  useEffect(() => {
    const fetchAllPrices = async () => {
      const openTrades = paperTradingService.getOpenTrades(userId)
      const symbols = [...new Set(openTrades.map(t => t.symbol))]

      for (const symbol of symbols) {
        if (symbol !== selectedPair) {
          try {
            const tickerData = await bybitService.getTicker(symbol)
            setAllTickers(prev => {
              const newMap = new Map(prev)
              newMap.set(symbol, parseFloat(tickerData.lastPrice))
              return newMap
            })
          } catch (error) {
            console.error(`Failed to fetch ${symbol} ticker:`, error)
          }
        }
      }
    }

    if (usePaperMode) {
      fetchAllPrices()
      const interval = setInterval(fetchAllPrices, 5000)
      return () => clearInterval(interval)
    }
  }, [userId, usePaperMode, selectedPair])

  const saveApiCredentials = async () => {
    if (!apiKey || !apiSecret) {
      setConnectionError('Please enter both API key and secret')
      return
    }

    const saved = apiKeyService.saveCredentials(userId, 'bybit_testnet', {
      apiKey,
      apiSecret
    })

    if (saved) {
      await testConnection()
      setApiKey('')
      setApiSecret('')
      setShowApiConfig(false)
    } else {
      setConnectionError('Invalid API key format')
    }
  }

  const disconnectApi = () => {
    apiKeyService.deleteCredentials(userId, 'bybit_testnet')
    setIsConnected(false)
    setBalance([])
    setPositions([])
    setOpenOrders([])
    setUsePaperMode(true)
  }

  const placeOrder = async () => {
    if (!orderQty || parseFloat(orderQty) <= 0) {
      setOrderError('Please enter a valid quantity')
      return
    }

    if (orderType === 'Limit' && (!orderPrice || parseFloat(orderPrice) <= 0)) {
      setOrderError('Please enter a valid price for limit order')
      return
    }

    setIsPlacingOrder(true)
    setOrderError('')
    setOrderSuccess('')

    if (usePaperMode) {
      // Paper trading mode - use paperTradingService
      const entryPrice = orderType === 'Limit'
        ? parseFloat(orderPrice)
        : (ticker ? parseFloat(ticker.lastPrice) : 0)

      if (entryPrice <= 0) {
        setOrderError('Unable to get current price')
        setIsPlacingOrder(false)
        return
      }

      const result = paperTradingService.openTrade(userId, {
        symbol: selectedPair,
        side: orderSide === 'Buy' ? 'long' : 'short',
        entryPrice,
        quantity: parseFloat(orderQty),
        leverage: parseFloat(orderLeverage),
        takeProfit: orderTakeProfit ? parseFloat(orderTakeProfit) : undefined,
        stopLoss: orderStopLoss ? parseFloat(orderStopLoss) : undefined,
        orderType: orderType === 'Market' ? 'market' : 'limit'
      })

      if (result.success) {
        loadPaperTradingData()
        const notional = entryPrice * parseFloat(orderQty)
        const fee = notional * (orderType === 'Market' ? BYBIT_FEES.TAKER : BYBIT_FEES.MAKER)
        setOrderSuccess(
          `${orderSide} order placed! Entry: $${entryPrice.toFixed(2)}, Fee: $${fee.toFixed(4)}`
        )
        setOrderQty('')
        setOrderPrice('')
        setOrderTakeProfit('')
        setOrderStopLoss('')
      } else {
        setOrderError(result.error || 'Order failed')
      }
    } else {
      // Real testnet order
      try {
        await bybitService.setLeverage(userId, selectedPair, orderLeverage)

        const result = await bybitService.placeOrder(userId, {
          symbol: selectedPair,
          side: orderSide,
          orderType,
          qty: orderQty,
          price: orderType === 'Limit' ? orderPrice : undefined,
          takeProfit: orderTakeProfit || undefined,
          stopLoss: orderStopLoss || undefined
        })

        setOrderSuccess(`Order placed! ID: ${result.orderId.slice(0, 8)}...`)
        await fetchAccountData()
        setOrderQty('')
        setOrderPrice('')
        setOrderTakeProfit('')
        setOrderStopLoss('')
      } catch (error) {
        setOrderError(error instanceof Error ? error.message : 'Order failed')
      }
    }

    setIsPlacingOrder(false)
  }

  const closePaperTrade = (tradeId: string) => {
    if (!ticker) return

    const result = paperTradingService.closeTrade(
      userId,
      tradeId,
      parseFloat(ticker.lastPrice),
      'manual'
    )

    if (result.success && result.trade) {
      loadPaperTradingData()
      const pnlText = (result.trade.pnl || 0) >= 0
        ? `+$${(result.trade.pnl || 0).toFixed(2)}`
        : `-$${Math.abs(result.trade.pnl || 0).toFixed(2)}`
      addNotification(`Position closed: ${pnlText}`, (result.trade.pnl || 0) >= 0 ? 'success' : 'error')
    }
  }

  const closeRealPosition = async (position: BybitPosition) => {
    try {
      await bybitService.closePosition(userId, position.symbol, position.side, position.size)
      setOrderSuccess('Position closed successfully!')
      await fetchAccountData()
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Failed to close position')
    }
  }

  const resetPaperAccount = () => {
    paperTradingService.resetAccount(userId)
    loadPaperTradingData()
    setShowResetConfirm(false)
    addNotification('Account reset to $10,000', 'success')
  }

  const calculateUnrealizedPnL = useCallback((trade: PaperTrade): number => {
    const currentPrice = allTickers.get(trade.symbol) || (ticker ? parseFloat(ticker.lastPrice) : trade.entryPrice)
    return paperTradingService.calculateUnrealizedPnL(trade, currentPrice)
  }, [allTickers, ticker])

  const calculateROE = useCallback((trade: PaperTrade): number => {
    const currentPrice = allTickers.get(trade.symbol) || (ticker ? parseFloat(ticker.lastPrice) : trade.entryPrice)
    return paperTradingService.calculateROE(trade, currentPrice)
  }, [allTickers, ticker])

  const getLiquidationPrice = useCallback((trade: PaperTrade): number => {
    return paperTradingService.calculateLiquidationPrice(trade)
  }, [])

  const totalUsdtBalance = balance.find(b => b.coin === 'USDT')
  const openPaperTrades = paperTrades.filter(t => t.status === 'open')
  const closedPaperTrades = paperTrades.filter(t => t.status === 'closed').sort((a, b) => (b.exitTimestamp || 0) - (a.exitTimestamp || 0))

  // Calculate total unrealized P&L for open positions
  const totalUnrealizedPnL = openPaperTrades.reduce((sum, trade) => sum + calculateUnrealizedPnL(trade), 0)

  return (
    <div className="paper-trading-page">
      <TradingBackground variant="calculator" />

      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            {notification.type === 'success' && <CheckCircle size={16} />}
            {notification.type === 'error' && <AlertCircle size={16} />}
            {notification.type === 'warning' && <AlertTriangle size={16} />}
            <span>{notification.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="pt-header">
        <div className="pt-header-left">
          <div className="pt-logo">
            <Play size={28} />
            <h1>Paper Trading</h1>
          </div>
          <p>Practice strategies with live Bybit data • Bybit fee structure applied</p>
        </div>
        <div className="pt-header-right">
          <div className={`connection-status ${isConnected ? 'connected' : usePaperMode ? 'paper' : 'disconnected'}`}>
            {isConnected ? (
              <>
                <CheckCircle size={16} />
                <span>Testnet Connected</span>
              </>
            ) : usePaperMode ? (
              <>
                <Activity size={16} />
                <span>Paper Mode</span>
              </>
            ) : (
              <>
                <AlertCircle size={16} />
                <span>Disconnected</span>
              </>
            )}
          </div>
          <button
            className="settings-btn"
            onClick={() => setShowApiConfig(!showApiConfig)}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* API Configuration Panel */}
      {showApiConfig && (
        <div className="api-config-panel glass-card">
          <div className="api-config-header">
            <h3>
              <Key size={18} />
              Bybit Testnet API Configuration
            </h3>
            <button onClick={() => setShowApiConfig(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="api-config-info">
            <Info size={16} />
            <p>
              Get your testnet API keys from{' '}
              <a href="https://testnet.bybit.com" target="_blank" rel="noopener noreferrer">
                testnet.bybit.com
                <ExternalLink size={12} />
              </a>
              {' '}(Create account, go to API Management)
            </p>
          </div>

          {isConnected ? (
            <div className="api-connected-state">
              <div className="connected-badge">
                <CheckCircle size={20} />
                <span>API Connected</span>
              </div>
              <p>Your Bybit testnet is connected. Place real orders with demo funds!</p>
              <button className="disconnect-btn" onClick={disconnectApi}>
                <Unlock size={16} />
                Disconnect & Remove Keys
              </button>
            </div>
          ) : (
            <>
              <div className="api-input-group">
                <label>API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your testnet API key"
                />
              </div>

              <div className="api-input-group">
                <label>API Secret</label>
                <div className="secret-input-wrapper">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your testnet API secret"
                  />
                  <button
                    className="toggle-secret"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {connectionError && (
                <div className="api-error">
                  <AlertCircle size={16} />
                  {connectionError}
                </div>
              )}

              <div className="api-actions">
                <button
                  className="connect-btn"
                  onClick={saveApiCredentials}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Connect & Save
                    </>
                  )}
                </button>
              </div>

              <div className="api-security-note">
                <Shield size={14} />
                <span>Keys are encrypted and stored locally. Never shared.</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Trading Interface */}
      <div className="pt-main-container">
        {/* Left Panel - Chart & Controls */}
        <div className="pt-chart-panel">
          {/* Symbol Selector */}
          <div className="symbol-selector glass-card">
            <div className="symbol-dropdown">
              <select
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
              >
                {POPULAR_PAIRS.map(pair => (
                  <option key={pair} value={pair}>{pair}</option>
                ))}
              </select>
            </div>

            {ticker && (
              <div className="ticker-display">
                <div className="ticker-price-wrapper">
                  <span className="ticker-price">${parseFloat(ticker.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="ticker-source">Live</span>
                </div>
                <span className={`ticker-change ${parseFloat(ticker.price24hPcnt) >= 0 ? 'positive' : 'negative'}`}>
                  {parseFloat(ticker.price24hPcnt) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {(parseFloat(ticker.price24hPcnt) * 100).toFixed(2)}%
                </span>
              </div>
            )}

            <div className="timeframe-selector">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  className={selectedTimeframe === tf.value ? 'active' : ''}
                  onClick={() => setSelectedTimeframe(tf.value)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* TradingView Chart Container */}
          <div className="chart-container glass-card tradingview-chart">
            <div ref={chartContainerRef} className="chart-inner tradingview-widget-container" />
          </div>

          {/* Market Info */}
          {ticker && (
            <div className="market-info glass-card">
              <div className="market-stat">
                <span className="stat-label">Mark Price</span>
                <span className="stat-value">${parseFloat(ticker.markPrice).toLocaleString()}</span>
              </div>
              <div className="market-stat">
                <span className="stat-label">24h High</span>
                <span className="stat-value positive">${parseFloat(ticker.highPrice24h).toLocaleString()}</span>
              </div>
              <div className="market-stat">
                <span className="stat-label">24h Low</span>
                <span className="stat-value negative">${parseFloat(ticker.lowPrice24h).toLocaleString()}</span>
              </div>
              <div className="market-stat">
                <span className="stat-label">24h Volume</span>
                <span className="stat-value">{parseFloat(ticker.volume24h).toLocaleString()}</span>
              </div>
              <div className="market-stat">
                <span className="stat-label">Funding Rate</span>
                <span className={`stat-value ${parseFloat(ticker.fundingRate) >= 0 ? 'positive' : 'negative'}`}>
                  {(parseFloat(ticker.fundingRate) * 100).toFixed(4)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Trading */}
        <div className="pt-trading-panel">
          {/* Account Balance */}
          <div className="account-balance glass-card">
            <div className="balance-header">
              <h3>
                <Wallet size={18} />
                Account Balance
              </h3>
              {usePaperMode ? (
                <button
                  className="reset-btn"
                  onClick={() => setShowResetConfirm(true)}
                  title="Reset Account"
                >
                  <RotateCcw size={16} />
                </button>
              ) : isConnected && (
                <button className="refresh-btn" onClick={() => fetchAccountData()} disabled={isLoading}>
                  <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
                </button>
              )}
            </div>

            {usePaperMode ? (
              <div className="paper-balance">
                <div className="balance-item">
                  <span className="coin">USDT</span>
                  <span className="amount">${paperBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="label">Available Balance</span>
                </div>
                <div className="balance-stats">
                  <div className="balance-row">
                    <span>Unrealized P&L:</span>
                    <span className={totalUnrealizedPnL >= 0 ? 'positive' : 'negative'}>
                      {totalUnrealizedPnL >= 0 ? '+' : ''}{totalUnrealizedPnL.toFixed(2)}
                    </span>
                  </div>
                  <div className="balance-row">
                    <span>Realized P&L:</span>
                    <span className={paperStats.totalPnl >= 0 ? 'positive' : 'negative'}>
                      {paperStats.totalPnl >= 0 ? '+' : ''}${paperStats.totalPnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="balance-row">
                    <span>Total Fees:</span>
                    <span className="negative">-${paperStats.totalFees.toFixed(4)}</span>
                  </div>
                  <div className="balance-row highlight">
                    <span>Win Rate:</span>
                    <span className={paperStats.winRate >= 50 ? 'positive' : 'negative'}>
                      {paperStats.winRate.toFixed(1)}% ({paperStats.winCount}W/{paperStats.lossCount}L)
                    </span>
                  </div>
                </div>
              </div>
            ) : totalUsdtBalance ? (
              <div className="balance-details">
                <div className="balance-item">
                  <span className="coin">USDT</span>
                  <span className="amount">${parseFloat(totalUsdtBalance.walletBalance).toFixed(2)}</span>
                </div>
                <div className="balance-row">
                  <span>Available:</span>
                  <span>${parseFloat(totalUsdtBalance.availableBalance).toFixed(2)}</span>
                </div>
                <div className="balance-row">
                  <span>Unrealized P&L:</span>
                  <span className={parseFloat(totalUsdtBalance.unrealisedPnl) >= 0 ? 'positive' : 'negative'}>
                    ${parseFloat(totalUsdtBalance.unrealisedPnl).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="no-balance">
                <p>Connect API to view balance</p>
              </div>
            )}
          </div>

          {/* Reset Confirmation Modal */}
          {showResetConfirm && (
            <div className="modal-overlay">
              <div className="modal-content glass-card">
                <h4><AlertTriangle size={20} /> Reset Account?</h4>
                <p>This will clear all trades and reset your balance to $10,000. This action cannot be undone.</p>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowResetConfirm(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={resetPaperAccount}>Reset Account</button>
                </div>
              </div>
            </div>
          )}

          {/* Order Form */}
          <div className="order-form glass-card">
            <div className="order-header">
              <h3>
                <Zap size={18} />
                Place Order
              </h3>
              <button
                className="toggle-panel"
                onClick={() => setShowOrderPanel(!showOrderPanel)}
              >
                {showOrderPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {showOrderPanel && (
              <>
                {/* Side Toggle */}
                <div className="side-toggle">
                  <button
                    className={`side-btn buy ${orderSide === 'Buy' ? 'active' : ''}`}
                    onClick={() => setOrderSide('Buy')}
                  >
                    <TrendingUp size={16} />
                    Long
                  </button>
                  <button
                    className={`side-btn sell ${orderSide === 'Sell' ? 'active' : ''}`}
                    onClick={() => setOrderSide('Sell')}
                  >
                    <TrendingDown size={16} />
                    Short
                  </button>
                </div>

                {/* Order Type */}
                <div className="order-type-toggle">
                  <button
                    className={orderType === 'Market' ? 'active' : ''}
                    onClick={() => setOrderType('Market')}
                  >
                    Market
                  </button>
                  <button
                    className={orderType === 'Limit' ? 'active' : ''}
                    onClick={() => setOrderType('Limit')}
                  >
                    Limit
                  </button>
                </div>

                {/* Order Inputs */}
                <div className="order-inputs">
                  {orderType === 'Limit' && (
                    <div className="input-group">
                      <label>
                        <DollarSign size={14} />
                        Price
                      </label>
                      <input
                        type="number"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        placeholder={ticker ? parseFloat(ticker.lastPrice).toFixed(2) : '0.00'}
                        step="0.01"
                      />
                    </div>
                  )}

                  <div className="input-group">
                    <label>
                      <Layers size={14} />
                      Quantity ({selectedPair.replace('USDT', '')})
                    </label>
                    <input
                      type="number"
                      value={orderQty}
                      onChange={(e) => setOrderQty(e.target.value)}
                      placeholder="0.001"
                      step="0.001"
                    />
                  </div>

                  <div className="input-group">
                    <label>
                      <BarChart3 size={14} />
                      Leverage
                    </label>
                    <div className="leverage-input">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={orderLeverage}
                        onChange={(e) => setOrderLeverage(e.target.value)}
                      />
                      <span>{orderLeverage}x</span>
                    </div>
                  </div>

                  <div className="tp-sl-inputs">
                    <div className="input-group half">
                      <label>
                        <Target size={14} />
                        Take Profit
                      </label>
                      <input
                        type="number"
                        value={orderTakeProfit}
                        onChange={(e) => setOrderTakeProfit(e.target.value)}
                        placeholder="Optional"
                        step="0.01"
                      />
                    </div>
                    <div className="input-group half">
                      <label>
                        <Shield size={14} />
                        Stop Loss
                      </label>
                      <input
                        type="number"
                        value={orderStopLoss}
                        onChange={(e) => setOrderStopLoss(e.target.value)}
                        placeholder="Optional"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                {orderQty && ticker && (
                  <div className="order-summary">
                    <div className="summary-row">
                      <span>Order Value:</span>
                      <span>${(parseFloat(orderQty) * parseFloat(ticker.lastPrice)).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Margin Required:</span>
                      <span>${(parseFloat(orderQty) * parseFloat(ticker.lastPrice) / parseFloat(orderLeverage)).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Est. Fee ({orderType === 'Market' ? 'Taker' : 'Maker'}):</span>
                      <span>${(parseFloat(orderQty) * parseFloat(ticker.lastPrice) * (orderType === 'Market' ? BYBIT_FEES.TAKER : BYBIT_FEES.MAKER)).toFixed(4)}</span>
                    </div>
                  </div>
                )}

                {/* Error/Success Messages */}
                {orderError && (
                  <div className="order-message error">
                    <AlertCircle size={14} />
                    {orderError}
                  </div>
                )}
                {orderSuccess && (
                  <div className="order-message success">
                    <CheckCircle size={14} />
                    {orderSuccess}
                  </div>
                )}

                {/* Place Order Button */}
                <button
                  className={`place-order-btn ${orderSide === 'Buy' ? 'buy' : 'sell'}`}
                  onClick={placeOrder}
                  disabled={isPlacingOrder}
                >
                  {isPlacingOrder ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      {orderSide === 'Buy' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {orderSide === 'Buy' ? 'Long' : 'Short'} {selectedPair}
                    </>
                  )}
                </button>

                {usePaperMode && (
                  <div className="paper-mode-note">
                    <Info size={12} />
                    <span>Paper mode • Taker: 0.055% • Maker: 0.02% • Auto TP/SL execution</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Positions & Orders Tabs */}
          <div className="positions-panel glass-card">
            <div className="tabs-header">
              <button
                className={activeTab === 'positions' ? 'active' : ''}
                onClick={() => setActiveTab('positions')}
              >
                <LineChart size={14} />
                Positions ({usePaperMode ? openPaperTrades.length : positions.length})
              </button>
              <button
                className={activeTab === 'orders' ? 'active' : ''}
                onClick={() => setActiveTab('orders')}
              >
                <Clock size={14} />
                Orders
              </button>
              <button
                className={activeTab === 'history' ? 'active' : ''}
                onClick={() => setActiveTab('history')}
              >
                <Activity size={14} />
                History
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'positions' && (
                <div className="positions-list">
                  {usePaperMode ? (
                    openPaperTrades.length > 0 ? (
                      openPaperTrades.map(trade => {
                        const unrealizedPnL = calculateUnrealizedPnL(trade)
                        const roe = calculateROE(trade)
                        const liqPrice = getLiquidationPrice(trade)
                        const currentPrice = allTickers.get(trade.symbol) || trade.entryPrice

                        return (
                          <div key={trade.id} className="position-item detailed">
                            <div className="position-header">
                              <span className="symbol">{trade.symbol}</span>
                              <span className={`side ${trade.side}`}>{trade.side.toUpperCase()}</span>
                              <span className="leverage">{trade.leverage}x</span>
                            </div>
                            <div className="position-details-grid">
                              <div className="detail">
                                <span className="label">Entry Price</span>
                                <span className="value">${trade.entryPrice.toFixed(2)}</span>
                              </div>
                              <div className="detail">
                                <span className="label">Mark Price</span>
                                <span className="value">${currentPrice.toFixed(2)}</span>
                              </div>
                              <div className="detail">
                                <span className="label">Size</span>
                                <span className="value">{trade.quantity}</span>
                              </div>
                              <div className="detail">
                                <span className="label">Margin</span>
                                <span className="value">${((trade.entryPrice * trade.quantity) / trade.leverage).toFixed(2)}</span>
                              </div>
                              <div className="detail">
                                <span className="label">Unrealized PnL</span>
                                <span className={`value ${unrealizedPnL >= 0 ? 'positive' : 'negative'}`}>
                                  {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
                                </span>
                              </div>
                              <div className="detail">
                                <span className="label">ROE</span>
                                <span className={`value ${roe >= 0 ? 'positive' : 'negative'}`}>
                                  {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
                                </span>
                              </div>
                              <div className="detail">
                                <span className="label">Liq. Price</span>
                                <span className="value warning">${liqPrice.toFixed(2)}</span>
                              </div>
                              <div className="detail">
                                <span className="label">Entry Fee</span>
                                <span className="value">-${trade.fees.toFixed(4)}</span>
                              </div>
                              {trade.takeProfit && (
                                <div className="detail">
                                  <span className="label">Take Profit</span>
                                  <span className="value positive">${trade.takeProfit.toFixed(2)}</span>
                                </div>
                              )}
                              {trade.stopLoss && (
                                <div className="detail">
                                  <span className="label">Stop Loss</span>
                                  <span className="value negative">${trade.stopLoss.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                            <button
                              className="close-position-btn"
                              onClick={() => closePaperTrade(trade.id)}
                            >
                              <X size={14} />
                              Close Position
                            </button>
                          </div>
                        )
                      })
                    ) : (
                      <div className="empty-state">
                        <LineChart size={32} />
                        <p>No open positions</p>
                      </div>
                    )
                  ) : positions.length > 0 ? (
                    positions.map((pos, idx) => (
                      <div key={idx} className="position-item">
                        <div className="position-header">
                          <span className="symbol">{pos.symbol}</span>
                          <span className={`side ${pos.side.toLowerCase()}`}>{pos.side}</span>
                          <span className="leverage">{pos.leverage}x</span>
                        </div>
                        <div className="position-details">
                          <div className="detail">
                            <span className="label">Entry</span>
                            <span className="value">${parseFloat(pos.entryPrice).toFixed(2)}</span>
                          </div>
                          <div className="detail">
                            <span className="label">Size</span>
                            <span className="value">{pos.size}</span>
                          </div>
                          <div className="detail">
                            <span className="label">P&L</span>
                            <span className={`value ${parseFloat(pos.unrealisedPnl) >= 0 ? 'positive' : 'negative'}`}>
                              ${parseFloat(pos.unrealisedPnl).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <button
                          className="close-position-btn"
                          onClick={() => closeRealPosition(pos)}
                        >
                          <X size={14} />
                          Close
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <LineChart size={32} />
                      <p>No open positions</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="orders-list">
                  {openOrders.length > 0 ? (
                    openOrders.map((order, idx) => (
                      <div key={idx} className="order-item">
                        <div className="order-header">
                          <span className="symbol">{order.symbol}</span>
                          <span className={`side ${order.side.toLowerCase()}`}>{order.side}</span>
                          <span className="type">{order.orderType}</span>
                        </div>
                        <div className="order-details">
                          <span>Price: ${parseFloat(order.price).toFixed(2)}</span>
                          <span>Qty: {order.qty}</span>
                          <span className="status">{order.orderStatus}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Clock size={32} />
                      <p>No open orders</p>
                      {usePaperMode && <p className="empty-note">Paper mode uses market orders only</p>}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="history-list">
                  {usePaperMode ? (
                    closedPaperTrades.length > 0 ? (
                      closedPaperTrades.slice(0, 20).map(trade => (
                        <div key={trade.id} className="history-item detailed">
                          <div className="history-header">
                            <span className="symbol">{trade.symbol}</span>
                            <span className={`side ${trade.side}`}>{trade.side.toUpperCase()}</span>
                            <span className={`close-reason ${trade.closeReason}`}>
                              {trade.closeReason === 'takeProfit' && <Target size={12} />}
                              {trade.closeReason === 'stopLoss' && <Shield size={12} />}
                              {trade.closeReason === 'liquidation' && <AlertTriangle size={12} />}
                              {trade.closeReason === 'manual' && <X size={12} />}
                              {trade.closeReason}
                            </span>
                            <span className={`pnl ${(trade.pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                              {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="history-details">
                            <span>Entry: ${trade.entryPrice.toFixed(2)}</span>
                            <span>Exit: ${(trade.exitPrice || 0).toFixed(2)}</span>
                            <span>Size: {trade.quantity}</span>
                            <span>Fees: -${trade.fees.toFixed(4)}</span>
                          </div>
                          <div className="history-time">
                            {new Date(trade.exitTimestamp || trade.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <Activity size={32} />
                        <p>No trade history</p>
                      </div>
                    )
                  ) : orderHistory.length > 0 ? (
                    orderHistory.slice(0, 10).map((order, idx) => (
                      <div key={idx} className="history-item">
                        <div className="history-header">
                          <span className="symbol">{order.symbol}</span>
                          <span className={`side ${order.side.toLowerCase()}`}>{order.side}</span>
                          <span className="status">{order.orderStatus}</span>
                        </div>
                        <div className="history-details">
                          <span>Price: ${parseFloat(order.price).toFixed(2)}</span>
                          <span>Qty: {order.qty}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Activity size={32} />
                      <p>No order history</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaperTrading
