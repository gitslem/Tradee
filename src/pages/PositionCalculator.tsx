import { useState, useMemo, useCallback } from 'react'
import './PositionCalculator.css'
import LivePriceCard from '../components/LivePriceCard'
import FloatingExchangeSelector from '../components/FloatingExchangeSelector'
import TradingBackground from '../components/TradingBackground'
import { getExchangeFees, getMaxLeverage, getMaintenanceMargin, calculateFundingCost, EXCHANGES } from '../config/exchanges'
import type { AccountType } from '../config/exchanges'
import {
  Calculator, TrendingUp, TrendingDown, Shield, AlertTriangle,
  DollarSign, Percent, Target, Zap, ChevronDown, ChevronUp,
  BarChart3, Activity, Wallet, Scale, Info, CheckCircle2, XCircle
} from 'lucide-react'

interface TakeProfitResult {
  name: string
  price: number
  percentGain: number
  profit: number
  rrRatio: number
}

interface CalculationResults {
  stopLossDistance: number
  riskAmount: number
  positionSize: number
  positionValue: number
  quantity: number
  potentialProfit: number
  riskRewardRatio: number
  liquidationPrice: number
  marginRequired: number
  distanceToLiquidation: number
  notionalValue: number
  breakevenPrice: number
  winRateNeeded: number
  takeProfitResults: TakeProfitResult[]
  maintenanceMargin: number
  maintenanceMarginRate: number
  totalFees: number
  fundingCost: number
  roiOnMargin: number
  actualRiskWithLeverage: number
}

// Risk presets for quick selection
const RISK_PRESETS = [
  { label: 'Conservative', risk: 0.5, color: '#10b981' },
  { label: 'Moderate', risk: 1, color: '#f59e0b' },
  { label: 'Aggressive', risk: 2, color: '#ef4444' },
]

// Leverage presets
const LEVERAGE_PRESETS = [1, 3, 5, 10, 20, 50]

const PositionCalculator = () => {
  const [accountBalance, setAccountBalance] = useState<string>('10000')
  const [riskPercentage, setRiskPercentage] = useState<string>('1')
  const [entryPrice, setEntryPrice] = useState<string>('3500')
  const [stopPrice, setStopPrice] = useState<string>('3400')
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('3800')
  const [tp2Price, setTp2Price] = useState<string>('')
  const [tp3Price, setTp3Price] = useState<string>('')
  const [cryptoPair, setCryptoPair] = useState<string>('ETH/USDT')
  const [positionType, setPositionType] = useState<'long' | 'short'>('long')
  const [leverage, setLeverage] = useState<string>('1')
  const [useLeverage, setUseLeverage] = useState<boolean>(false)
  const [selectedExchange, setSelectedExchange] = useState<string>('binance')
  const [accountType, setAccountType] = useState<AccountType>('futures')
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [showLeverage, setShowLeverage] = useState<boolean>(false)

  // Get exchange-specific fees
  const exchangeFees = getExchangeFees(selectedExchange, accountType)
  const maxLeverageAllowed = getMaxLeverage(selectedExchange, accountType)

  const calculatePosition = useCallback((): CalculationResults | null => {
    const balance = parseFloat(accountBalance)
    const risk = parseFloat(riskPercentage)
    const entry = parseFloat(entryPrice)
    const stop = parseFloat(stopPrice)
    const takeProfit = parseFloat(takeProfitPrice)
    const tp2 = parseFloat(tp2Price)
    const tp3 = parseFloat(tp3Price)
    const lev = useLeverage ? parseFloat(leverage) : 1
    const feePercent = exchangeFees.taker / 100

    if (isNaN(balance) || isNaN(risk) || isNaN(entry) || isNaN(stop) || isNaN(lev)) {
      return null
    }

    // Position sizing
    // Stop Loss Distance = |Entry - Stop| / Entry (as decimal)
    // Risk Amount = Account Balance × Risk Percentage
    // Base Position Size = Risk Amount / Stop Loss Distance (position size without leverage)
    // Position Size = Base Position Size × Leverage (notional value of the position)
    // Margin Required = Base Position Size (initial margin needed)
    // Quantity = Position Size / Entry Price (amount of asset to buy/sell)
    const stopLossDistance = Math.abs(entry - stop) / entry
    const riskAmount = balance * (risk / 100)
    const basePositionSize = riskAmount / stopLossDistance
    const positionSize = basePositionSize * lev
    const marginRequired = basePositionSize // Initial Margin = Position Value / Leverage
    const notionalValue = positionSize // Total position value
    const quantity = positionSize / entry // Quantity of the asset
    const positionValue = quantity // Legacy: same as quantity for compatibility

    // Liquidation Price Calculation (Bybit Isolated Margin Formula)
    // For Long: Liq Price = Entry × (1 - Initial Margin Rate + Maintenance Margin Rate)
    // For Short: Liq Price = Entry × (1 + Initial Margin Rate - Maintenance Margin Rate)
    // Where: Initial Margin Rate = 1 / Leverage
    let liquidationPrice = 0
    if (useLeverage && lev > 1) {
      const maintenanceMarginRate = getMaintenanceMargin(selectedExchange, lev) / 100 // Convert from percentage
      const initialMarginRate = 1 / lev

      if (positionType === 'long') {
        // Bybit Long Liquidation Formula
        liquidationPrice = entry * (1 - initialMarginRate + maintenanceMarginRate)
      } else {
        // Bybit Short Liquidation Formula
        liquidationPrice = entry * (1 + initialMarginRate - maintenanceMarginRate)
      }

      // Ensure liquidation price is valid (positive and within reasonable bounds)
      liquidationPrice = Math.max(0, liquidationPrice)
    }

    const distanceToLiquidation = liquidationPrice > 0
      ? (Math.abs(entry - liquidationPrice) / entry) * 100
      : 0

    const breakevenDistance = entry * feePercent * 2
    const breakevenPrice = positionType === 'long'
      ? entry + breakevenDistance
      : entry - breakevenDistance

    // Take Profit & P&L Calculations (Bybit Formula)
    // P&L (Long) = Quantity × (Exit Price - Entry Price)
    // P&L (Short) = Quantity × (Entry Price - Exit Price)
    // Percent Gain = (Price Distance / Entry Price) × 100
    // Risk:Reward = Take Profit Distance / Stop Loss Distance
    const takeProfitResults: TakeProfitResult[] = []

    if (!isNaN(takeProfit)) {
      const tpDistance = Math.abs(takeProfit - entry)
      const tpPercentDistance = (tpDistance / entry) * 100
      const potentialProfit = quantity * tpDistance
      const rrRatio = tpDistance / Math.abs(entry - stop)

      takeProfitResults.push({
        name: 'TP1',
        price: takeProfit,
        percentGain: tpPercentDistance,
        profit: potentialProfit,
        rrRatio: rrRatio
      })
    }

    if (!isNaN(tp2)) {
      const tpDistance = Math.abs(tp2 - entry)
      const tpPercentDistance = (tpDistance / entry) * 100
      const potentialProfit = quantity * tpDistance
      const rrRatio = tpDistance / Math.abs(entry - stop)

      takeProfitResults.push({
        name: 'TP2',
        price: tp2,
        percentGain: tpPercentDistance,
        profit: potentialProfit,
        rrRatio: rrRatio
      })
    }

    if (!isNaN(tp3)) {
      const tpDistance = Math.abs(tp3 - entry)
      const tpPercentDistance = (tpDistance / entry) * 100
      const potentialProfit = quantity * tpDistance
      const rrRatio = tpDistance / Math.abs(entry - stop)

      takeProfitResults.push({
        name: 'TP3',
        price: tp3,
        percentGain: tpPercentDistance,
        profit: potentialProfit,
        rrRatio: rrRatio
      })
    }

    const potentialProfit = takeProfitResults.length > 0 ? takeProfitResults[0].profit : 0
    const riskRewardRatio = takeProfitResults.length > 0 ? takeProfitResults[0].rrRatio : 0
    const winRateNeeded = riskRewardRatio > 0 ? (1 / (1 + riskRewardRatio)) * 100 : 0

    // Maintenance Margin Calculation (Bybit Formula)
    // Maintenance Margin = Position Value × Maintenance Margin Rate
    const maintenanceMarginRate = getMaintenanceMargin(selectedExchange, lev)
    const maintenanceMargin = (notionalValue * maintenanceMarginRate) / 100

    // Trading Fees Calculation
    // Entry Fee = Position Size × Taker Fee Rate
    // Exit Fee = Position Size × Taker Fee Rate
    // Total Fees = Entry Fee + Exit Fee
    const entryFee = positionSize * (exchangeFees.taker / 100)
    const exitFee = positionSize * (exchangeFees.taker / 100)
    const totalFees = entryFee + exitFee

    // Funding Cost Calculation (for perpetual futures)
    // Funding Cost = Position Size × Funding Rate × Number of Funding Periods
    const fundingCost = accountType === 'futures'
      ? calculateFundingCost(selectedExchange, accountType, notionalValue, 24)
      : 0

    // ROI on Margin (Bybit Formula)
    // ROI = (P&L / Initial Margin) × 100%
    const roiOnMargin = marginRequired > 0 && potentialProfit > 0
      ? (potentialProfit / marginRequired) * 100
      : 0

    // Actual Risk with Leverage
    // This represents the maximum loss if stop loss is hit
    const actualRiskWithLeverage = positionSize * stopLossDistance

    return {
      stopLossDistance: stopLossDistance * 100,
      riskAmount,
      positionSize,
      positionValue,
      quantity,
      potentialProfit,
      riskRewardRatio,
      liquidationPrice,
      marginRequired,
      distanceToLiquidation,
      notionalValue,
      breakevenPrice,
      winRateNeeded,
      takeProfitResults,
      maintenanceMargin,
      maintenanceMarginRate,
      totalFees,
      fundingCost,
      roiOnMargin,
      actualRiskWithLeverage
    }
  }, [accountBalance, riskPercentage, entryPrice, stopPrice, takeProfitPrice, tp2Price, tp3Price, leverage, useLeverage, positionType, selectedExchange, accountType, exchangeFees])

  const results = useMemo(() => calculatePosition(), [calculatePosition])

  const validatePosition = useCallback((): { type: 'error' | 'warning' | 'success'; message: string }[] => {
    const warnings: { type: 'error' | 'warning' | 'success'; message: string }[] = []
    const entry = parseFloat(entryPrice)
    const stop = parseFloat(stopPrice)
    const takeProfit = parseFloat(takeProfitPrice)
    const risk = parseFloat(riskPercentage)
    const lev = useLeverage ? parseFloat(leverage) : 1

    if (positionType === 'long') {
      if (stop >= entry) {
        warnings.push({ type: 'error', message: 'Stop loss must be below entry for LONG' })
      }
      if (!isNaN(takeProfit) && takeProfit <= entry) {
        warnings.push({ type: 'error', message: 'Take profit must be above entry for LONG' })
      }
    } else {
      if (stop <= entry) {
        warnings.push({ type: 'error', message: 'Stop loss must be above entry for SHORT' })
      }
      if (!isNaN(takeProfit) && takeProfit >= entry) {
        warnings.push({ type: 'error', message: 'Take profit must be below entry for SHORT' })
      }
    }

    if (risk > 2) {
      warnings.push({ type: 'warning', message: `Risk ${risk}% is above recommended 2%` })
    } else if (risk <= 1) {
      warnings.push({ type: 'success', message: 'Conservative risk management' })
    }

    if (results && results.riskRewardRatio >= 2) {
      warnings.push({ type: 'success', message: `Good R:R ratio (1:${results.riskRewardRatio.toFixed(1)})` })
    } else if (results && results.riskRewardRatio < 1.5 && results.riskRewardRatio > 0) {
      warnings.push({ type: 'warning', message: 'Consider better R:R ratio (< 1:1.5)' })
    }

    if (useLeverage && lev > 1) {
      if (lev > maxLeverageAllowed) {
        warnings.push({ type: 'error', message: `Max leverage is ${maxLeverageAllowed}x` })
      }
      if (lev >= 20) {
        warnings.push({ type: 'error', message: 'Extreme leverage risk!' })
      } else if (lev >= 10) {
        warnings.push({ type: 'warning', message: 'High leverage risk' })
      }

      if (results && results.distanceToLiquidation < 5 && results.distanceToLiquidation > 0) {
        warnings.push({ type: 'error', message: 'Liquidation within 5%!' })
      }
    }

    return warnings
  }, [entryPrice, stopPrice, takeProfitPrice, riskPercentage, leverage, useLeverage, positionType, maxLeverageAllowed, results])

  const warnings = useMemo(() => validatePosition(), [validatePosition])

  const handleUseCurrentPrice = (price: number) => {
    setEntryPrice(price.toString())
  }

  const getRiskLevel = () => {
    const risk = parseFloat(riskPercentage)
    if (risk <= 0.5) return { level: 'low', color: '#10b981', label: 'Low Risk' }
    if (risk <= 1) return { level: 'moderate', color: '#f59e0b', label: 'Moderate' }
    if (risk <= 2) return { level: 'high', color: '#f97316', label: 'High Risk' }
    return { level: 'extreme', color: '#ef4444', label: 'Extreme' }
  }

  const riskLevel = getRiskLevel()

  return (
    <div className="calculator-page">
      <TradingBackground variant="calculator" />

      {/* Hero Section */}
      <div className="calculator-hero">
        <div className="hero-icon">
          <Calculator size={40} />
        </div>
        <h1>Position Calculator</h1>
        <p>Professional position sizing for smart risk management</p>
      </div>

      {/* Exchange Selector */}
      <FloatingExchangeSelector
        selectedExchange={selectedExchange}
        onSelectExchange={setSelectedExchange}
      />

      <div className="calculator-container">
        {/* Quick Stats Bar */}
        <div className="quick-stats-bar">
          <div className="stat-chip">
            <Wallet size={16} />
            <span>${parseFloat(accountBalance || '0').toLocaleString()}</span>
          </div>
          <div className="stat-chip" style={{ borderColor: riskLevel.color }}>
            <Shield size={16} style={{ color: riskLevel.color }} />
            <span style={{ color: riskLevel.color }}>{riskLevel.label}</span>
          </div>
          <div className="stat-chip">
            <Activity size={16} />
            <span>{cryptoPair}</span>
          </div>
          {useLeverage && parseFloat(leverage) > 1 && (
            <div className="stat-chip leverage-chip">
              <Zap size={16} />
              <span>{leverage}x</span>
            </div>
          )}
        </div>

        <div className="calculator-main">
          {/* Input Panel */}
          <div className="input-panel glass-card">
            <div className="panel-header">
              <h2>
                <Scale size={20} />
                Trade Setup
              </h2>
            </div>

            {/* Account Type Toggle */}
            <div className="account-type-toggle">
              {EXCHANGES[selectedExchange].accountTypes.spot && (
                <button
                  className={`type-btn ${accountType === 'spot' ? 'active' : ''}`}
                  onClick={() => setAccountType('spot')}
                >
                  Spot
                </button>
              )}
              {EXCHANGES[selectedExchange].accountTypes.futures && (
                <button
                  className={`type-btn ${accountType === 'futures' ? 'active' : ''}`}
                  onClick={() => setAccountType('futures')}
                >
                  Futures
                </button>
              )}
              {EXCHANGES[selectedExchange].accountTypes.margin && (
                <button
                  className={`type-btn ${accountType === 'margin' ? 'active' : ''}`}
                  onClick={() => setAccountType('margin')}
                >
                  Margin
                </button>
              )}
            </div>

            {/* Position Type */}
            <div className="position-type-selector">
              <button
                className={`position-btn long ${positionType === 'long' ? 'active' : ''}`}
                onClick={() => setPositionType('long')}
              >
                <TrendingUp size={20} />
                <span>Long</span>
              </button>
              <button
                className={`position-btn short ${positionType === 'short' ? 'active' : ''}`}
                onClick={() => setPositionType('short')}
              >
                <TrendingDown size={20} />
                <span>Short</span>
              </button>
            </div>

            {/* Crypto Pair */}
            <div className="input-group">
              <label>
                <BarChart3 size={16} />
                Trading Pair
              </label>
              <select value={cryptoPair} onChange={(e) => setCryptoPair(e.target.value)}>
                <option>BTC/USDT</option>
                <option>ETH/USDT</option>
                <option>BNB/USDT</option>
                <option>SOL/USDT</option>
                <option>XRP/USDT</option>
                <option>ADA/USDT</option>
                <option>DOGE/USDT</option>
                <option>MATIC/USDT</option>
                <option>DOT/USDT</option>
                <option>AVAX/USDT</option>
              </select>
            </div>

            {/* Live Price Card */}
            <LivePriceCard pair={cryptoPair} exchange={selectedExchange} onUsePrice={handleUseCurrentPrice} />

            {/* Account Balance */}
            <div className="input-group">
              <label>
                <Wallet size={16} />
                Account Balance
              </label>
              <div className="input-with-unit">
                <span className="unit">$</span>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  placeholder="10000"
                />
              </div>
            </div>

            {/* Risk Percentage with Presets */}
            <div className="input-group">
              <label>
                <Percent size={16} />
                Risk Per Trade
              </label>
              <div className="risk-presets">
                {RISK_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    className={`preset-btn ${parseFloat(riskPercentage) === preset.risk ? 'active' : ''}`}
                    style={{ '--preset-color': preset.color } as React.CSSProperties}
                    onClick={() => setRiskPercentage(preset.risk.toString())}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="input-with-unit">
                <input
                  type="number"
                  value={riskPercentage}
                  onChange={(e) => setRiskPercentage(e.target.value)}
                  placeholder="1"
                  step="0.1"
                />
                <span className="unit">%</span>
              </div>
              <div className="risk-indicator">
                <div
                  className="risk-fill"
                  style={{
                    width: `${Math.min(parseFloat(riskPercentage) * 20, 100)}%`,
                    background: riskLevel.color
                  }}
                />
              </div>
            </div>

            {/* Price Inputs */}
            <div className="price-inputs-grid">
              <div className="input-group">
                <label>Entry Price</label>
                <div className="input-with-unit">
                  <span className="unit">$</span>
                  <input
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder="3500"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Stop Loss</label>
                <div className="input-with-unit stop-loss">
                  <span className="unit">$</span>
                  <input
                    type="number"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    placeholder="3400"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Take Profit</label>
                <div className="input-with-unit take-profit">
                  <span className="unit">$</span>
                  <input
                    type="number"
                    value={takeProfitPrice}
                    onChange={(e) => setTakeProfitPrice(e.target.value)}
                    placeholder="3800"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Leverage Section */}
            <div className="section-toggle" onClick={() => setShowLeverage(!showLeverage)}>
              <div className="toggle-header">
                <Zap size={18} />
                <span>Leverage Settings</span>
                {useLeverage && <span className="active-badge">{leverage}x Active</span>}
              </div>
              {showLeverage ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {showLeverage && (
              <div className="leverage-section animated-section">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={useLeverage}
                    onChange={(e) => setUseLeverage(e.target.checked)}
                  />
                  <span className="slider"></span>
                  <span className="toggle-label">Enable Leverage</span>
                </label>

                {useLeverage && (
                  <>
                    <div className="leverage-presets">
                      {LEVERAGE_PRESETS.filter(l => l <= maxLeverageAllowed).map(lev => (
                        <button
                          key={lev}
                          className={`leverage-preset ${parseFloat(leverage) === lev ? 'active' : ''}`}
                          onClick={() => setLeverage(lev.toString())}
                        >
                          {lev}x
                        </button>
                      ))}
                    </div>
                    <div className="leverage-slider-container">
                      <input
                        type="range"
                        min="1"
                        max={maxLeverageAllowed}
                        value={leverage}
                        onChange={(e) => setLeverage(e.target.value)}
                        className="leverage-slider"
                      />
                      <div className="leverage-display">{leverage}x</div>
                    </div>
                    <div className="leverage-warning">
                      <AlertTriangle size={16} />
                      <span>Leverage multiplies both profits and losses</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Advanced Section */}
            <div className="section-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
              <div className="toggle-header">
                <Target size={18} />
                <span>Multiple Take Profits</span>
              </div>
              {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {showAdvanced && (
              <div className="advanced-section animated-section">
                <div className="tp-grid">
                  <div className="input-group">
                    <label>Take Profit 2</label>
                    <div className="input-with-unit take-profit">
                      <span className="unit">$</span>
                      <input
                        type="number"
                        value={tp2Price}
                        onChange={(e) => setTp2Price(e.target.value)}
                        placeholder="Optional"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Take Profit 3</label>
                    <div className="input-with-unit take-profit">
                      <span className="unit">$</span>
                      <input
                        type="number"
                        value={tp3Price}
                        onChange={(e) => setTp3Price(e.target.value)}
                        placeholder="Optional"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="results-panel">
            {results ? (
              <>
                {/* Main Result Card */}
                <div className="result-hero glass-card">
                  <div className="result-hero-header">
                    <span>Position Size</span>
                    <span className="exchange-badge">{selectedExchange}</span>
                  </div>
                  <div className="result-hero-value">
                    <DollarSign size={32} />
                    <span>{results.positionSize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="result-hero-sub">
                    {results.quantity.toFixed(6)} {cryptoPair.split('/')[0]}
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="metrics-grid">
                  <div className="metric-card glass-card">
                    <div className="metric-icon risk">
                      <Shield size={20} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Risk Amount</span>
                      <span className="metric-value">${results.riskAmount.toFixed(2)}</span>
                      <span className="metric-sub">{riskPercentage}% of account</span>
                    </div>
                  </div>

                  <div className="metric-card glass-card">
                    <div className="metric-icon profit">
                      <TrendingUp size={20} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Potential Profit</span>
                      <span className="metric-value profit-text">${results.potentialProfit.toFixed(2)}</span>
                      <span className="metric-sub">R:R 1:{results.riskRewardRatio.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="metric-card glass-card">
                    <div className="metric-icon neutral">
                      <Scale size={20} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Stop Distance</span>
                      <span className="metric-value">{results.stopLossDistance.toFixed(2)}%</span>
                      <span className="metric-sub">${Math.abs(parseFloat(entryPrice) - parseFloat(stopPrice)).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="metric-card glass-card">
                    <div className="metric-icon info">
                      <Target size={20} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Breakeven</span>
                      <span className="metric-value">${results.breakevenPrice.toFixed(2)}</span>
                      <span className="metric-sub">Inc. {exchangeFees.taker}% fees</span>
                    </div>
                  </div>
                </div>

                {/* Leverage Info */}
                {useLeverage && parseFloat(leverage) > 1 && (
                  <div className="leverage-results glass-card">
                    <h3>
                      <Zap size={20} />
                      Leverage Analysis ({leverage}x)
                    </h3>

                    <div className="liquidation-visual">
                      <div className="price-ladder">
                        <div className="price-point entry">
                          <span className="price-label">Entry</span>
                          <span className="price-value">${parseFloat(entryPrice).toFixed(2)}</span>
                        </div>
                        <div className="price-line">
                          <div
                            className="distance-indicator"
                            style={{ height: `${Math.min(results.distanceToLiquidation * 5, 100)}%` }}
                          />
                        </div>
                        <div className={`price-point liquidation ${results.distanceToLiquidation < 10 ? 'danger' : ''}`}>
                          <span className="price-label">Liquidation</span>
                          <span className="price-value">${results.liquidationPrice.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="distance-info">
                        <span className={`distance-badge ${
                          results.distanceToLiquidation < 5 ? 'critical' :
                          results.distanceToLiquidation < 10 ? 'danger' :
                          results.distanceToLiquidation < 20 ? 'warning' : 'safe'
                        }`}>
                          {results.distanceToLiquidation.toFixed(1)}% to liquidation
                        </span>
                      </div>
                    </div>

                    <div className="leverage-metrics">
                      <div className="leverage-metric">
                        <span>Margin Required</span>
                        <strong>${results.marginRequired.toFixed(2)}</strong>
                      </div>
                      <div className="leverage-metric">
                        <span>Actual Risk</span>
                        <strong className="danger-text">${results.actualRiskWithLeverage.toFixed(2)}</strong>
                      </div>
                      <div className="leverage-metric">
                        <span>ROI on Margin</span>
                        <strong className="profit-text">{results.roiOnMargin.toFixed(1)}%</strong>
                      </div>
                      {results.fundingCost > 0 && (
                        <div className="leverage-metric">
                          <span>Funding (24h)</span>
                          <strong>${results.fundingCost.toFixed(2)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Take Profit Targets */}
                {results.takeProfitResults.length > 0 && (
                  <div className="tp-results glass-card">
                    <h3>
                      <Target size={20} />
                      Take Profit Targets
                    </h3>
                    <div className="tp-list">
                      {results.takeProfitResults.map((tp, index) => (
                        <div key={index} className="tp-item">
                          <div className="tp-header">
                            <span className="tp-name">{tp.name}</span>
                            <span className="tp-price">${tp.price.toFixed(2)}</span>
                          </div>
                          <div className="tp-details">
                            <span className="tp-profit">+${tp.profit.toFixed(2)}</span>
                            <span className="tp-percent">+{tp.percentGain.toFixed(2)}%</span>
                            <span className="tp-rr">R:R 1:{tp.rrRatio.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="win-rate-needed">
                      <Info size={16} />
                      <span>Win rate needed: <strong>{results.winRateNeeded.toFixed(1)}%</strong></span>
                    </div>
                  </div>
                )}

                {/* Warnings & Validations */}
                {warnings.length > 0 && (
                  <div className="validations glass-card">
                    <h3>Trade Analysis</h3>
                    <div className="validation-list">
                      {warnings.map((w, index) => (
                        <div key={index} className={`validation-item ${w.type}`}>
                          {w.type === 'success' && <CheckCircle2 size={18} />}
                          {w.type === 'warning' && <AlertTriangle size={18} />}
                          {w.type === 'error' && <XCircle size={18} />}
                          <span>{w.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fee Summary */}
                <div className="fee-summary glass-card">
                  <div className="fee-item">
                    <span>Total Fees</span>
                    <span>${results.totalFees.toFixed(2)}</span>
                  </div>
                  <div className="fee-item">
                    <span>Fee Rate</span>
                    <span>{exchangeFees.taker}% × 2</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-results glass-card">
                <Calculator size={48} />
                <p>Enter trade parameters to calculate position size</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PositionCalculator
