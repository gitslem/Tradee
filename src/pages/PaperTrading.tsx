import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageGuide from '../components/PageGuide'
import './PaperTrading.css'
import TradingBackground from '../components/TradingBackground'
import { useAuth } from '../context/auth'
import { useTheme } from '../context/theme'
import { apiKeyService } from '../services/apiKeyService'
import { bybitService, getBybitEnv, setBybitEnv, BYBIT_ENV_LABEL } from '../services/bybitService'
import type { BybitEnv } from '../services/bybitService'
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

// Order pre-filled from the Position Calculator (?pair=&side=&qty=&sl=&tp=&lev=)
interface OrderPrefill {
  pair?: string
  side?: 'Buy' | 'Sell'
  qty?: string
  sl?: string
  tp?: string
  lev?: string
}
const readPrefill = (params: URLSearchParams): OrderPrefill | null => {
  if (!params.has('pair') && !params.has('qty')) return null
  const num = (key: string) => {
    const v = params.get(key)
    return v && parseFloat(v) > 0 ? v : undefined
  }
  const pair = params.get('pair')?.toUpperCase()
  const side = params.get('side')
  const lev = num('lev')
  return {
    pair: pair && POPULAR_PAIRS.includes(pair) ? pair : undefined,
    side: side === 'Buy' || side === 'Sell' ? side : undefined,
    qty: num('qty'),
    sl: num('sl'),
    tp: num('tp'),
    lev: lev ? String(Math.min(Math.max(Math.round(parseFloat(lev)), 1), 100)) : undefined
  }
}

const POPULAR_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'POLUSDT', 'DOTUSDT', 'AVAXUSDT'
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
  // Bybit Demo Trading (real prices) or the older testnet
  const [bybitEnv, setBybitEnvState] = useState<BybitEnv>(() => getBybitEnv(userId))
  useEffect(() => { setBybitEnvState(getBybitEnv(userId)) }, [userId])
  const envLabel = BYBIT_ENV_LABEL[bybitEnv]
  const envName = bybitEnv === 'demo' ? 'Bybit Demo Trading' : 'Bybit testnet'
  const [connectionError, setConnectionError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  // Trading State
  const [searchParams, setSearchParams] = useSearchParams()
  const [prefill] = useState(() => readPrefill(searchParams))
  const [selectedPair, setSelectedPair] = useState(prefill?.pair ?? 'BTCUSDT')
  // Drop the previous pair's ticker as soon as the pair changes, so orders
  // can never be placed at another symbol's price
  const [tickerPair, setTickerPair] = useState(selectedPair)
  const [selectedTimeframe, setSelectedTimeframe] = useState('15')
  const [ticker, setTicker] = useState<BybitTicker | null>(null)
  if (tickerPair !== selectedPair) {
    setTickerPair(selectedPair)
    setTicker(null)
  }
  const [allTickers, setAllTickers] = useState<Map<string, number>>(new Map())
  // Latest prices for the polling loop, without restarting it on every update
  const allTickersRef = useRef(allTickers)
  const [balance, setBalance] = useState<BybitBalance[]>([])
  const [positions, setPositions] = useState<BybitPosition[]>([])
  const [openOrders, setOpenOrders] = useState<BybitOrder[]>([])
  const [orderHistory, setOrderHistory] = useState<BybitOrder[]>([])

  // Order Form State
  const [orderSide, setOrderSide] = useState<'Buy' | 'Sell'>(prefill?.side ?? 'Buy')
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market')
  const [orderQty, setOrderQty] = useState(prefill?.qty ?? '')
  const [orderPrice, setOrderPrice] = useState('')
  const [orderLeverage, setOrderLeverage] = useState(prefill?.lev ?? '10')
  const [orderTakeProfit, setOrderTakeProfit] = useState(prefill?.tp ?? '')
  const [orderStopLoss, setOrderStopLoss] = useState(prefill?.sl ?? '')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(
    prefill ? 'Order filled in from the Position Calculator. Review it, then place it.' : ''
  )

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
  // Bybit lot size rules per symbol (testnet orders must match the qty step)
  const [instruments, setInstruments] = useState<Map<string, { minOrderQty: number; qtyStep: number }>>(new Map())
  const credentialsCheckedFor = useRef<string | null>(null)
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
    const id = crypto.randomUUID()
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

  const testConnection = useCallback(async (): Promise<boolean> => {
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
      return connected
    } catch (error) {
      setConnectionError(error instanceof Error ? `Connection failed: ${error.message}` : 'Connection failed')
      setIsConnected(false)
      return false
    } finally {
      setIsConnecting(false)
    }
  }, [userId, fetchAccountData])

  useEffect(() => {
    allTickersRef.current = allTickers
  }, [allTickers])

  // Drop the pre-fill parameters from the URL so a refresh doesn't re-apply them
  useEffect(() => {
    if (prefill) setSearchParams({}, { replace: true })
  }, [prefill, setSearchParams])

  // Load paper trading data on mount
  useEffect(() => {
    loadPaperTradingData()
  }, [loadPaperTradingData])

  // Check for existing API credentials on mount
  useEffect(() => {
    if (credentialsCheckedFor.current === userId) return
    credentialsCheckedFor.current = userId
    if (apiKeyService.hasCredentials(userId, 'bybit_testnet')) {
      testConnection()
    }
  }, [userId, testConnection])

  // Keep testnet balance, positions and orders fresh while in testnet mode
  useEffect(() => {
    if (!isConnected || usePaperMode) return
    const interval = setInterval(() => { fetchAccountData() }, 10000)
    return () => clearInterval(interval)
  }, [isConnected, usePaperMode, fetchAccountData])

  // Load Bybit lot size rules once testnet trading is in use
  useEffect(() => {
    if (!isConnected || instruments.size > 0) return
    let cancelled = false
    bybitService.getSymbols()
      .then(list => {
        if (cancelled) return
        setInstruments(new Map(list.map(s => [s.symbol, {
          minOrderQty: parseFloat(s.minOrderQty),
          qtyStep: parseFloat(s.qtyStep)
        }])))
      })
      .catch(error => console.error('Failed to load instrument info:', error))
    return () => { cancelled = true }
  }, [isConnected, instruments.size])


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
    let cancelled = false

    const fetchTickerAndCheckTPSL = async () => {
      let prices = allTickersRef.current
      try {
        const tickerData = await bybitService.getTicker(selectedPair)
        if (cancelled || tickerData.symbol !== selectedPair) return
        setTicker(tickerData)

        // Update all tickers map for TP/SL checking
        prices = new Map(allTickersRef.current)
        prices.set(selectedPair, parseFloat(tickerData.lastPrice))
        allTickersRef.current = prices
        setAllTickers(prices)
      } catch (error) {
        console.error('Failed to fetch ticker:', error)
      }
      if (cancelled) return

      // Check limit fills, TP/SL and liquidation for every paper position,
      // using whatever prices we have (one failing symbol must not block others)
      if (usePaperMode) {
        const { closed: closedTrades, filled } = paperTradingService.checkAndExecuteTPSL(userId, prices)
        if (closedTrades.length > 0 || filled.length > 0) {
          loadPaperTradingData()
          filled.forEach(trade => {
            addNotification(
              `${trade.symbol} ${trade.side.toUpperCase()} limit filled at $${trade.entryPrice}`,
              'success'
            )
          })
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
    }

    fetchTickerAndCheckTPSL()
    const interval = setInterval(fetchTickerAndCheckTPSL, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [selectedPair, userId, usePaperMode, loadPaperTradingData, addNotification])

  // Fetch prices for all open positions' symbols
  useEffect(() => {
    const fetchAllPrices = async () => {
      const symbols = paperTradingService.getActiveSymbols(userId)

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

    setBybitEnv(userId, bybitEnv)
    const saved = apiKeyService.saveCredentials(userId, 'bybit_testnet', {
      apiKey,
      apiSecret
    })

    if (saved) {
      const ok = await testConnection()
      if (ok) {
        setApiKey('')
        setApiSecret('')
        setShowApiConfig(false)
        addNotification(`${envName} connected`, 'success')
      } else {
        // Don't keep keys that don't work
        apiKeyService.deleteCredentials(userId, 'bybit_testnet')
      }
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
      const marketPrice = ticker && ticker.symbol === selectedPair ? parseFloat(ticker.lastPrice) : 0
      const entryPrice = orderType === 'Limit' ? parseFloat(orderPrice) : marketPrice

      if (marketPrice <= 0) {
        setOrderError('Waiting for the current price. Try again in a moment.')
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
      }, marketPrice)

      if (result.success && result.trade) {
        loadPaperTradingData()
        const t = result.trade
        setOrderSuccess(
          t.status === 'pending'
            ? `Limit ${orderSide} order placed at $${t.entryPrice}. It fills when price reaches it.`
            : `${orderSide} order filled! Entry: $${t.entryPrice}, Fee: $${t.fees.toFixed(4)}`
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
      const rules = instruments.get(selectedPair)
      let qty = orderQty
      if (rules && rules.qtyStep > 0) {
        const decimals = (rules.qtyStep.toString().split('.')[1] || '').length
        const rounded = Math.floor(parseFloat(orderQty) / rules.qtyStep + 1e-9) * rules.qtyStep
        if (rounded < rules.minOrderQty) {
          setOrderError(`Minimum order size for ${selectedPair} is ${rules.minOrderQty}`)
          setIsPlacingOrder(false)
          return
        }
        qty = rounded.toFixed(decimals)
      }
      try {
        await bybitService.setLeverage(userId, selectedPair, orderLeverage)

        const result = await bybitService.placeOrder(userId, {
          symbol: selectedPair,
          side: orderSide,
          orderType,
          qty,
          price: orderType === 'Limit' ? orderPrice : undefined,
          takeProfit: orderTakeProfit || undefined,
          stopLoss: orderStopLoss || undefined
        })

        setOrderSuccess(`Order placed! Qty ${qty}, ID: ${result.orderId.slice(0, 8)}...`)
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

  const closePaperTrade = (trade: PaperTrade) => {
    const price = allTickers.get(trade.symbol)
    if (!price) {
      addNotification(`No live price for ${trade.symbol} yet. Try again in a moment.`, 'warning')
      return
    }

    const result = paperTradingService.closeTrade(userId, trade.id, price, 'manual')

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

  const cancelPaperOrder = (tradeId: string) => {
    const result = paperTradingService.cancelOrder(userId, tradeId)
    if (result.success) {
      loadPaperTradingData()
      addNotification('Limit order cancelled', 'success')
    }
  }

  const cancelTestnetOrder = async (order: BybitOrder) => {
    try {
      await bybitService.cancelOrder(userId, order.symbol, order.orderId)
      addNotification('Order cancelled', 'success')
      await fetchAccountData()
    } catch (error) {
      addNotification(error instanceof Error ? error.message : 'Failed to cancel order', 'error')
    }
  }

  const switchMode = (paper: boolean) => {
    if (!paper && !isConnected) {
      setShowApiConfig(true)
      return
    }
    setUsePaperMode(paper)
    setOrderError('')
    setOrderSuccess('')
    if (!paper) fetchAccountData()
  }

  const resetPaperAccount = () => {
    paperTradingService.resetAccount(userId)
    loadPaperTradingData()
    setShowResetConfirm(false)
    addNotification('Account reset to $10,000', 'success')
  }

  const calculateUnrealizedPnL = useCallback((trade: PaperTrade): number => {
    const currentPrice = allTickers.get(trade.symbol) ?? trade.entryPrice
    return paperTradingService.calculateUnrealizedPnL(trade, currentPrice)
  }, [allTickers])

  const calculateROE = useCallback((trade: PaperTrade): number => {
    const currentPrice = allTickers.get(trade.symbol) ?? trade.entryPrice
    return paperTradingService.calculateROE(trade, currentPrice)
  }, [allTickers])

  const getLiquidationPrice = useCallback((trade: PaperTrade): number => {
    return paperTradingService.calculateLiquidationPrice(trade)
  }, [])

  const totalUsdtBalance = balance.find(b => b.coin === 'USDT')
  const openPaperTrades = paperTrades.filter(t => t.status === 'open')
  const pendingPaperOrders = paperTrades.filter(t => t.status === 'pending')
  const closedPaperTrades = paperTrades.filter(t => t.status === 'closed').sort((a, b) => (b.exitTimestamp || 0) - (a.exitTimestamp || 0))

  // Calculate total unrealized P&L for open positions
  const orderSummary = (() => {
    const qty = parseFloat(orderQty)
    const last = ticker ? parseFloat(ticker.lastPrice) : NaN
    const limit = parseFloat(orderPrice)
    const lev = parseFloat(orderLeverage)
    if (!(qty > 0) || !(last > 0) || !(lev > 0)) return null
    // A limit order that is not marketable rests as a maker order
    const resting = orderType === 'Limit' && limit > 0 &&
      (orderSide === 'Buy' ? limit < last : limit > last)
    const price = resting ? limit : last
    const value = qty * price
    return {
      value,
      margin: value / lev,
      fee: value * (resting ? BYBIT_FEES.MAKER : BYBIT_FEES.TAKER),
      feeLabel: resting ? 'Maker' : 'Taker'
    }
  })()

  const lockedMargin = openPaperTrades.reduce((sum, t) => sum + (t.entryPrice * t.quantity) / t.leverage, 0) +
    pendingPaperOrders.reduce((sum, t) => sum + (t.entryPrice * t.quantity) / t.leverage + t.fees, 0)

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
          <PageGuide page="practice" placement="inline" />
          <div className="mode-switch" role="group" aria-label="Trading mode">
            <button
              className={usePaperMode ? 'active paper' : ''}
              aria-pressed={usePaperMode}
              onClick={() => switchMode(true)}
            >
              <Activity size={14} />
              Paper
            </button>
            <button
              className={!usePaperMode ? 'active testnet' : ''}
              aria-pressed={!usePaperMode}
              onClick={() => switchMode(false)}
              title={isConnected ? `Trade on your ${envName} account` : 'Connect Bybit Demo Trading or testnet API keys first'}
            >
              {isConnected ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {isConnected ? envLabel : 'Demo'}
            </button>
          </div>
          <button
            className="settings-btn"
            onClick={() => setShowApiConfig(!showApiConfig)}
            aria-label="Bybit API settings"
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
              {isConnected ? `${envName} API` : 'Connect a Bybit practice account'}
            </h3>
            <button onClick={() => setShowApiConfig(false)}>
              <X size={18} />
            </button>
          </div>

          {!isConnected && (
            <div className="bybit-env-choice" role="radiogroup" aria-label="Bybit practice account">
              <button
                role="radio"
                aria-checked={bybitEnv === 'demo'}
                className={bybitEnv === 'demo' ? 'active' : ''}
                onClick={() => setBybitEnvState('demo')}
              >
                <strong>Demo Trading</strong>
                <span>Recommended. Real Bybit prices with demo funds.</span>
              </button>
              <button
                role="radio"
                aria-checked={bybitEnv === 'testnet'}
                className={bybitEnv === 'testnet' ? 'active' : ''}
                onClick={() => setBybitEnvState('testnet')}
              >
                <strong>Testnet</strong>
                <span>Separate test exchange with its own prices.</span>
              </button>
            </div>
          )}

          <div className="api-config-info">
            <Info size={16} />
            {bybitEnv === 'demo' ? (
              <p>
                Log in at{' '}
                <a href="https://www.bybit.com" target="_blank" rel="noopener noreferrer">
                  bybit.com
                  <ExternalLink size={12} />
                </a>
                , switch to <strong>Demo Trading</strong>, then open API Management from your profile and create a key there. Demo keys only work on demo funds.
              </p>
            ) : (
              <p>
                Get your testnet API keys from{' '}
                <a href="https://testnet.bybit.com" target="_blank" rel="noopener noreferrer">
                  testnet.bybit.com
                  <ExternalLink size={12} />
                </a>
                {' '}(Create account, go to API Management)
              </p>
            )}
          </div>

          {isConnected ? (
            <div className="api-connected-state">
              <div className="connected-badge">
                <CheckCircle size={20} />
                <span>API Connected</span>
              </div>
              <p>Your {envName} account is connected. Place real orders with demo funds.</p>
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
                  placeholder={`Enter your ${envLabel.toLowerCase()} API key`}
                />
              </div>

              <div className="api-input-group">
                <label>API Secret</label>
                <div className="secret-input-wrapper">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder={`Enter your ${envLabel.toLowerCase()} API secret`}
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
                <span>Keys are stored only in this browser (obfuscated, not encrypted). Use demo or testnet keys only - never keys for a real-money account.</span>
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
                  <div className="balance-row equity-row">
                    <span>Equity:</span>
                    <span>${(paperBalance + lockedMargin + totalUnrealizedPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="balance-row">
                    <span>In Margin / Orders:</span>
                    <span>${lockedMargin.toFixed(2)}</span>
                  </div>
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
                {orderSummary && (
                  <div className="order-summary">
                    <div className="summary-row">
                      <span>Order Value:</span>
                      <span>${orderSummary.value.toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Est. Fee ({orderSummary.feeLabel}):</span>
                      <span>${orderSummary.fee.toFixed(4)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Margin + Fee Required:</span>
                      <span>${(orderSummary.margin + orderSummary.fee).toFixed(2)}</span>
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
                Orders{usePaperMode && pendingPaperOrders.length > 0 ? ` (${pendingPaperOrders.length})` : ''}
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
                              onClick={() => closePaperTrade(trade)}
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
                  {usePaperMode ? (
                    pendingPaperOrders.length > 0 ? (
                      pendingPaperOrders.map(order => (
                        <div key={order.id} className="order-item">
                          <div className="order-header">
                            <span className="symbol">{order.symbol}</span>
                            <span className={`side ${order.side === 'long' ? 'buy' : 'sell'}`}>
                              {order.side === 'long' ? 'Buy' : 'Sell'}
                            </span>
                            <span className="type">Limit · {order.leverage}x</span>
                          </div>
                          <div className="order-details">
                            <span>Price: ${order.entryPrice}</span>
                            <span>Qty: {order.quantity}</span>
                            <span>Last: {allTickers.get(order.symbol) ? `$${allTickers.get(order.symbol)}` : '—'}</span>
                          </div>
                          <button
                            className="close-position-btn"
                            onClick={() => cancelPaperOrder(order.id)}
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <Clock size={32} />
                        <p>No open orders</p>
                        <p className="empty-note">Limit orders below (buy) or above (sell) the market rest here until filled</p>
                      </div>
                    )
                  ) : openOrders.length > 0 ? (
                    openOrders.map(order => (
                      <div key={order.orderId} className="order-item">
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
                        <button
                          className="close-position-btn"
                          onClick={() => cancelTestnetOrder(order)}
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Clock size={32} />
                      <p>No open orders</p>
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
