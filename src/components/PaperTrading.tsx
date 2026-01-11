import { useState, useEffect, useCallback, useRef } from 'react'
import './PaperTrading.css'
import TradingBackground from './TradingBackground'
import { useAuth } from '../context/AuthContext'
import { apiKeyService } from '../services/apiKeyService'
import { bybitService } from '../services/bybitService'
import type { BybitTicker, BybitPosition, BybitOrder, BybitBalance } from '../services/bybitService'
import {
  Play, Settings, TrendingUp, TrendingDown, Wallet, Key, Eye, EyeOff,
  RefreshCw, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp,
  Target, Shield, Zap, Clock, BarChart3, DollarSign,
  ArrowUpRight, ArrowDownRight, Layers, Activity, Lock, Unlock,
  LineChart, Info, ExternalLink
} from 'lucide-react'

interface PaperTrade {
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
  pnl?: number
}

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

  // Local Paper Trades (for offline practice)
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([])
  const [usePaperMode, setUsePaperMode] = useState(true)

  // TradingView Chart
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  // UI State
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions')
  const [isLoading, setIsLoading] = useState(false)
  const [showOrderPanel, setShowOrderPanel] = useState(true)

  // Check for existing credentials on mount
  useEffect(() => {
    const hasCredentials = apiKeyService.hasCredentials(userId, 'bybit_testnet')
    if (hasCredentials) {
      testConnection()
    }
  }, [userId])

  // Initialize TradingView Advanced Chart Widget
  useEffect(() => {
    if (!chartContainerRef.current) return

    // Clear previous widget
    if (widgetRef.current) {
      chartContainerRef.current.innerHTML = ''
    }

    // Create widget container
    const container = document.createElement('div')
    container.id = 'tradingview_chart'
    container.style.width = '100%'
    container.style.height = '100%'
    chartContainerRef.current.appendChild(container)
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
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      gridColor: 'rgba(255, 255, 255, 0.05)',
      hide_top_toolbar: false,
      hide_legend: false,
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
      container_id: 'tradingview_chart'
    })

    container.appendChild(script)

    return () => {
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = ''
      }
    }
  }, [selectedPair, selectedTimeframe])

  // Fetch ticker data periodically
  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const tickerData = await bybitService.getTicker(selectedPair)
        setTicker(tickerData)
      } catch (error) {
        console.error('Failed to fetch ticker:', error)
      }
    }

    fetchTicker()
    const interval = setInterval(fetchTicker, 2000)
    return () => clearInterval(interval)
  }, [selectedPair])

  const testConnection = async () => {
    setIsConnecting(true)
    setConnectionError('')

    try {
      const connected = await bybitService.testConnection(userId)
      setIsConnected(connected)

      if (connected) {
        await fetchAccountData()
        setUsePaperMode(false)
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed')
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }

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

  const fetchAccountData = async () => {
    if (!isConnected) return

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
      // Paper trading mode - simulate order
      const newTrade: PaperTrade = {
        id: Date.now().toString(),
        symbol: selectedPair,
        side: orderSide === 'Buy' ? 'long' : 'short',
        entryPrice: ticker ? parseFloat(ticker.lastPrice) : 0,
        quantity: parseFloat(orderQty),
        leverage: parseFloat(orderLeverage),
        takeProfit: orderTakeProfit ? parseFloat(orderTakeProfit) : undefined,
        stopLoss: orderStopLoss ? parseFloat(orderStopLoss) : undefined,
        timestamp: Date.now(),
        status: 'open'
      }

      setPaperTrades(prev => [...prev, newTrade])
      setOrderSuccess(`Paper ${orderSide} order placed successfully!`)
      setOrderQty('')
      setOrderPrice('')
      setOrderTakeProfit('')
      setOrderStopLoss('')
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
    setPaperTrades(prev => prev.map(trade => {
      if (trade.id === tradeId && ticker) {
        const exitPrice = parseFloat(ticker.lastPrice)
        const priceDiff = trade.side === 'long'
          ? exitPrice - trade.entryPrice
          : trade.entryPrice - exitPrice
        const pnl = priceDiff * trade.quantity * trade.leverage

        return {
          ...trade,
          status: 'closed' as const,
          exitPrice,
          pnl
        }
      }
      return trade
    }))
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

  const calculatePnL = useCallback((trade: PaperTrade): number => {
    if (!ticker) return 0
    const currentPrice = parseFloat(ticker.lastPrice)
    const priceDiff = trade.side === 'long'
      ? currentPrice - trade.entryPrice
      : trade.entryPrice - currentPrice
    return priceDiff * trade.quantity * trade.leverage
  }, [ticker])

  const totalUsdtBalance = balance.find(b => b.coin === 'USDT')

  return (
    <div className="paper-trading-page">
      <TradingBackground variant="calculator" />

      {/* Header */}
      <div className="pt-header">
        <div className="pt-header-left">
          <div className="pt-logo">
            <Play size={28} />
            <h1>Paper Trading</h1>
          </div>
          <p>Practice strategies with live Bybit data</p>
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
                <span className="ticker-price">${parseFloat(ticker.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              {isConnected && (
                <button className="refresh-btn" onClick={fetchAccountData} disabled={isLoading}>
                  <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
                </button>
              )}
            </div>

            {usePaperMode ? (
              <div className="paper-balance">
                <div className="balance-item">
                  <span className="coin">USDT</span>
                  <span className="amount">$10,000.00</span>
                  <span className="label">Demo Balance</span>
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
                    <span>Paper mode - orders are simulated locally</span>
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
                Positions
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
                    paperTrades.filter(t => t.status === 'open').length > 0 ? (
                      paperTrades.filter(t => t.status === 'open').map(trade => (
                        <div key={trade.id} className="position-item">
                          <div className="position-header">
                            <span className="symbol">{trade.symbol}</span>
                            <span className={`side ${trade.side}`}>{trade.side.toUpperCase()}</span>
                            <span className="leverage">{trade.leverage}x</span>
                          </div>
                          <div className="position-details">
                            <div className="detail">
                              <span className="label">Entry</span>
                              <span className="value">${trade.entryPrice.toFixed(2)}</span>
                            </div>
                            <div className="detail">
                              <span className="label">Size</span>
                              <span className="value">{trade.quantity}</span>
                            </div>
                            <div className="detail">
                              <span className="label">P&L</span>
                              <span className={`value ${calculatePnL(trade) >= 0 ? 'positive' : 'negative'}`}>
                                ${calculatePnL(trade).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <button
                            className="close-position-btn"
                            onClick={() => closePaperTrade(trade.id)}
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
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="history-list">
                  {usePaperMode ? (
                    paperTrades.filter(t => t.status === 'closed').length > 0 ? (
                      paperTrades.filter(t => t.status === 'closed').map(trade => (
                        <div key={trade.id} className="history-item">
                          <div className="history-header">
                            <span className="symbol">{trade.symbol}</span>
                            <span className={`side ${trade.side}`}>{trade.side.toUpperCase()}</span>
                            <span className={`pnl ${(trade.pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                              ${(trade.pnl || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="history-details">
                            <span>Entry: ${trade.entryPrice.toFixed(2)}</span>
                            <span>Exit: ${(trade.exitPrice || 0).toFixed(2)}</span>
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
