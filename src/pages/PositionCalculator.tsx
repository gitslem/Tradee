import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './PositionCalculator.css'
import LivePriceCard from '../components/LivePriceCard'
import FloatingExchangeSelector from '../components/FloatingExchangeSelector'
import TradingBackground from '../components/TradingBackground'
import { getExchangeFees, getMaxLeverage, getMaintenanceMargin, calculateFundingCost, EXCHANGES } from '../config/exchanges'
import type { AccountType } from '../config/exchanges'
import { formatPrice } from '../utils/format'
import {
  Calculator, TrendingUp, TrendingDown, Shield, AlertTriangle,
  DollarSign, Percent, Target, Zap, ChevronDown, ChevronUp,
  BarChart3, Activity, Wallet, Scale, Info, CheckCircle2, XCircle, Send
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

const ACCOUNT_TYPE_ORDER: AccountType[] = ['futures', 'spot', 'margin']

type Message = { type: 'error' | 'warning' | 'success'; message: string }

// Account settings are remembered between visits (trade prices are not)
const SETTINGS_KEY = 'calculator-settings'
interface SavedSettings {
  accountBalance?: string
  riskPercentage?: string
  cryptoPair?: string
  selectedExchange?: string
  accountType?: AccountType
  useLeverage?: boolean
  leverage?: string
}
const loadSettings = (): SavedSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) as SavedSettings : {}
  } catch {
    return {}
  }
}

// Quantity text for an order form: enough precision, no float noise
const formatQty = (qty: number): string =>
  qty >= 1 ? String(Number(qty.toFixed(4))) : String(Number(qty.toPrecision(4)))

const PositionCalculator = () => {
  const navigate = useNavigate()
  const [saved] = useState(loadSettings)
  const [accountBalance, setAccountBalance] = useState<string>(saved.accountBalance ?? '10000')
  const [riskPercentage, setRiskPercentage] = useState<string>(saved.riskPercentage ?? '1')
  const [entryPrice, setEntryPrice] = useState<string>('3500')
  const [stopPrice, setStopPrice] = useState<string>('3400')
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('3800')
  const [tp2Price, setTp2Price] = useState<string>('')
  const [tp3Price, setTp3Price] = useState<string>('')
  const [cryptoPair, setCryptoPair] = useState<string>(saved.cryptoPair ?? 'ETH/USDT')
  const [positionType, setPositionType] = useState<'long' | 'short'>('long')
  const [leverage, setLeverage] = useState<string>(saved.leverage ?? '1')
  const [useLeverage, setUseLeverage] = useState<boolean>(saved.useLeverage ?? false)
  const [selectedExchange, setSelectedExchange] = useState<string>(
    saved.selectedExchange && EXCHANGES[saved.selectedExchange] ? saved.selectedExchange : 'binance'
  )
  const [accountType, setAccountType] = useState<AccountType>(saved.accountType ?? 'futures')

  useEffect(() => {
    try {
      const settings: SavedSettings = { accountBalance, riskPercentage, cryptoPair, selectedExchange, accountType, useLeverage, leverage }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Storage unavailable (private mode) - settings just won't persist
    }
  }, [accountBalance, riskPercentage, cryptoPair, selectedExchange, accountType, useLeverage, leverage])
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [showLeverage, setShowLeverage] = useState<boolean>(false)

  // Get exchange-specific fees
  const exchangeFees = getExchangeFees(selectedExchange, accountType)
  const maxLeverageAllowed = getMaxLeverage(selectedExchange, accountType)

  // Spot trades have no leverage; elsewhere clamp to the exchange maximum
  const leverageAvailable = accountType !== 'spot' && maxLeverageAllowed > 1
  const requestedLeverage = parseFloat(leverage)
  const effectiveLeverage = useLeverage && leverageAvailable
    ? Math.min(Math.max(1, Number.isFinite(requestedLeverage) ? requestedLeverage : 1), maxLeverageAllowed)
    : 1

  const calculatePosition = useCallback((): CalculationResults | null => {
    const balance = parseFloat(accountBalance)
    const risk = parseFloat(riskPercentage)
    const entry = parseFloat(entryPrice)
    const stop = parseFloat(stopPrice)
    const lev = effectiveLeverage
    const feeRate = exchangeFees.taker / 100
    const dir = positionType === 'long' ? 1 : -1

    // Invalid inputs produce no result (the validation panel explains why)
    if (!(balance > 0) || !(risk > 0) || !(entry > 0) || !(stop > 0)) return null
    if ((entry - stop) * dir <= 0) return null // stop on the wrong side, or equal to entry

    // Position sizing
    // The position is sized so that hitting the stop loses exactly the risk
    // amount, including the entry and exit (taker) fees:
    //   loss = qty × |entry - stop| + qty × entry × fee + qty × stop × fee
    // Leverage does NOT change the position size, only the margin you post.
    const stopDistancePrice = Math.abs(entry - stop)
    const stopLossDistance = stopDistancePrice / entry
    const riskAmount = balance * (risk / 100)
    const quantity = riskAmount / (stopDistancePrice + (entry + stop) * feeRate)
    const notionalValue = quantity * entry
    const positionSize = notionalValue
    const marginRequired = notionalValue / lev
    const positionValue = quantity // Legacy: same as quantity for compatibility

    // Liquidation price (isolated margin, estimate)
    //   Long:  Entry × (1 - 1/Leverage + MMR)
    //   Short: Entry × (1 + 1/Leverage - MMR)
    let liquidationPrice = 0
    if (lev > 1) {
      const mmr = getMaintenanceMargin(selectedExchange, lev) / 100
      liquidationPrice = Math.max(0, entry * (1 - dir * (1 / lev - mmr)))
    }

    const distanceToLiquidation = liquidationPrice > 0
      ? (Math.abs(entry - liquidationPrice) / entry) * 100
      : 0

    // Breakeven covers the entry and exit fee
    const breakevenPrice = positionType === 'long'
      ? entry * (1 + feeRate) / (1 - feeRate)
      : entry * (1 - feeRate) / (1 + feeRate)

    // Take profits: net of fees, ignored when on the wrong side of entry
    const takeProfitResults: TakeProfitResult[] = []
    const tpInputs: [string, string][] = [['TP1', takeProfitPrice], ['TP2', tp2Price], ['TP3', tp3Price]]
    for (const [name, raw] of tpInputs) {
      const tp = parseFloat(raw)
      if (!(tp > 0) || (tp - entry) * dir <= 0) continue
      const gross = quantity * (tp - entry) * dir
      const fees = quantity * (entry + tp) * feeRate
      const profit = gross - fees
      takeProfitResults.push({
        name,
        price: tp,
        percentGain: ((tp - entry) * dir / entry) * 100,
        profit,
        rrRatio: profit / riskAmount
      })
    }

    const potentialProfit = takeProfitResults.length > 0 ? takeProfitResults[0].profit : 0
    const riskRewardRatio = takeProfitResults.length > 0 ? takeProfitResults[0].rrRatio : 0
    const winRateNeeded = riskRewardRatio > 0 ? (1 / (1 + riskRewardRatio)) * 100 : 0

    // Maintenance Margin = Position Value × Maintenance Margin Rate
    const maintenanceMarginRate = getMaintenanceMargin(selectedExchange, lev)
    const maintenanceMargin = (notionalValue * maintenanceMarginRate) / 100

    // Round-trip taker fees at the entry price
    const totalFees = notionalValue * feeRate * 2

    // Funding Cost = Position Size × Funding Rate × Number of Funding Periods
    const fundingCost = accountType === 'futures'
      ? calculateFundingCost(selectedExchange, accountType, notionalValue, 24)
      : 0

    // ROI = (P&L / Initial Margin) × 100%
    const roiOnMargin = marginRequired > 0 && potentialProfit > 0
      ? (potentialProfit / marginRequired) * 100
      : 0

    // Loss if the stop is hit, fees included (equals the risk amount)
    const actualRiskWithLeverage = quantity * stopDistancePrice + quantity * (entry + stop) * feeRate

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
  }, [accountBalance, riskPercentage, entryPrice, stopPrice, takeProfitPrice, tp2Price, tp3Price, effectiveLeverage, positionType, selectedExchange, accountType, exchangeFees])

  const results = useMemo(() => calculatePosition(), [calculatePosition])

  const validatePosition = useCallback((): Message[] => {
    const warnings: Message[] = []
    const balance = parseFloat(accountBalance)
    const entry = parseFloat(entryPrice)
    const stop = parseFloat(stopPrice)
    const risk = parseFloat(riskPercentage)
    const isLong = positionType === 'long'
    const side = isLong ? 'LONG' : 'SHORT'

    if (!(balance > 0)) warnings.push({ type: 'error', message: 'Enter an account balance above 0' })
    if (!(risk > 0)) warnings.push({ type: 'error', message: 'Enter a risk percentage above 0' })
    if (!(entry > 0)) warnings.push({ type: 'error', message: 'Enter an entry price above 0' })
    if (!(stop > 0)) {
      warnings.push({ type: 'error', message: 'Enter a stop loss price above 0' })
    } else if (entry > 0) {
      if (stop === entry) {
        warnings.push({ type: 'error', message: 'Stop loss cannot equal the entry price' })
      } else if (isLong ? stop > entry : stop < entry) {
        warnings.push({ type: 'error', message: `Stop loss must be ${isLong ? 'below' : 'above'} entry for ${side}` })
      }
    }

    if (entry > 0) {
      const tps: [string, string][] = [['Take profit', takeProfitPrice], ['Take profit 2', tp2Price], ['Take profit 3', tp3Price]]
      for (const [name, raw] of tps) {
        const tp = parseFloat(raw)
        if (tp > 0 && (isLong ? tp <= entry : tp >= entry)) {
          warnings.push({ type: 'error', message: `${name} must be ${isLong ? 'above' : 'below'} entry for ${side} (ignored)` })
        }
      }
    }

    if (risk > 2) {
      warnings.push({ type: 'warning', message: `Risk ${risk}% is above the recommended 2%` })
    } else if (risk > 0 && risk <= 1) {
      warnings.push({ type: 'success', message: 'Risk is within the 1% guideline' })
    }

    if (results && results.riskRewardRatio >= 2) {
      warnings.push({ type: 'success', message: `Good R:R ratio after fees (1:${results.riskRewardRatio.toFixed(1)})` })
    } else if (results && results.riskRewardRatio < 1.5 && results.riskRewardRatio > 0) {
      warnings.push({ type: 'warning', message: 'Consider a better R:R ratio (below 1:1.5 after fees)' })
    }

    if (results && results.marginRequired > balance) {
      const minLeverage = Math.ceil(results.notionalValue / balance)
      warnings.push({
        type: 'error',
        message: leverageAvailable && minLeverage <= maxLeverageAllowed
          ? `Position needs $${results.marginRequired.toFixed(2)} but the balance is $${balance.toFixed(2)}. Use at least ${minLeverage}x leverage, widen the stop or lower the risk.`
          : `Position needs $${results.marginRequired.toFixed(2)} but the balance is $${balance.toFixed(2)}. Widen the stop or lower the risk.`
      })
    }

    if (useLeverage && !leverageAvailable) {
      warnings.push({ type: 'warning', message: 'Leverage is not available for spot. Calculated at 1x.' })
    } else if (useLeverage && requestedLeverage > maxLeverageAllowed) {
      warnings.push({ type: 'warning', message: `Leverage capped at the ${maxLeverageAllowed}x maximum` })
    }

    if (effectiveLeverage > 1) {
      if (effectiveLeverage >= 20) {
        warnings.push({ type: 'error', message: 'Extreme leverage risk!' })
      } else if (effectiveLeverage >= 10) {
        warnings.push({ type: 'warning', message: 'High leverage risk' })
      }

      if (results && results.liquidationPrice > 0 && (isLong ? results.liquidationPrice >= stop : results.liquidationPrice <= stop)) {
        warnings.push({
          type: 'error',
          message: `Liquidation ($${formatPrice(results.liquidationPrice)}) is hit before your stop loss. Lower the leverage.`
        })
      } else if (results && results.distanceToLiquidation < 5 && results.distanceToLiquidation > 0) {
        warnings.push({ type: 'error', message: 'Liquidation within 5%!' })
      }
    }

    return warnings
  }, [accountBalance, entryPrice, stopPrice, takeProfitPrice, tp2Price, tp3Price, riskPercentage, positionType, results, useLeverage, leverageAvailable, requestedLeverage, maxLeverageAllowed, effectiveLeverage])

  const warnings = useMemo(() => validatePosition(), [validatePosition])

  const clampLeverageTo = (max: number) => {
    const current = parseFloat(leverage)
    if (!Number.isFinite(current) || current > max) setLeverage(String(Math.max(1, max)))
  }

  const handleSelectExchange = (exchangeId: string) => {
    setSelectedExchange(exchangeId)
    const types = EXCHANGES[exchangeId]?.accountTypes
    let nextType = accountType
    if (types && !types[accountType]) {
      nextType = ACCOUNT_TYPE_ORDER.find(t => types[t]) ?? 'spot'
      setAccountType(nextType)
    }
    clampLeverageTo(getMaxLeverage(exchangeId, nextType))
  }

  const handleAccountType = (type: AccountType) => {
    setAccountType(type)
    clampLeverageTo(getMaxLeverage(selectedExchange, type))
  }

  // Open the Practice page with this setup pre-filled as an order
  const sendToPractice = () => {
    if (!results) return
    const params = new URLSearchParams({
      pair: cryptoPair.replace('/', ''),
      side: positionType === 'long' ? 'Buy' : 'Sell',
      qty: formatQty(results.quantity),
      sl: stopPrice,
      lev: String(Math.round(effectiveLeverage))
    })
    const tp = results.takeProfitResults[0]
    if (tp) params.set('tp', String(tp.price))
    navigate(`/paper-trading?${params.toString()}`)
  }

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
        onSelectExchange={handleSelectExchange}
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
          {effectiveLeverage > 1 && (
            <div className="stat-chip leverage-chip">
              <Zap size={16} />
              <span>{effectiveLeverage}x</span>
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
                  onClick={() => handleAccountType('spot')}
                >
                  Spot
                </button>
              )}
              {EXCHANGES[selectedExchange].accountTypes.futures && (
                <button
                  className={`type-btn ${accountType === 'futures' ? 'active' : ''}`}
                  onClick={() => handleAccountType('futures')}
                >
                  Futures
                </button>
              )}
              {EXCHANGES[selectedExchange].accountTypes.margin && (
                <button
                  className={`type-btn ${accountType === 'margin' ? 'active' : ''}`}
                  onClick={() => handleAccountType('margin')}
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
                <option>POL/USDT</option>
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

            {/* Leverage Section (not available for spot) */}
            {leverageAvailable && (
            <div
              className="section-toggle"
              role="button"
              tabIndex={0}
              aria-expanded={showLeverage}
              onClick={() => setShowLeverage(!showLeverage)}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setShowLeverage(!showLeverage) } }}
            >
              <div className="toggle-header">
                <Zap size={18} />
                <span>Leverage Settings</span>
                {effectiveLeverage > 1 && <span className="active-badge">{effectiveLeverage}x Active</span>}
              </div>
              {showLeverage ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            )}

            {leverageAvailable && showLeverage && (
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
                        value={effectiveLeverage}
                        onChange={(e) => setLeverage(e.target.value)}
                        className="leverage-slider"
                        aria-label="Leverage"
                      />
                      <div className="leverage-display">{effectiveLeverage}x</div>
                    </div>
                    <div className="leverage-warning">
                      <AlertTriangle size={16} />
                      <span>Leverage lowers the margin you post, not your risk. The position size stays the same.</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Advanced Section */}
            <div
              className="section-toggle"
              role="button"
              tabIndex={0}
              aria-expanded={showAdvanced}
              onClick={() => setShowAdvanced(!showAdvanced)}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setShowAdvanced(!showAdvanced) } }}
            >
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
                      <span className="metric-sub">R:R 1:{results.riskRewardRatio.toFixed(2)} after fees</span>
                    </div>
                  </div>

                  <div className="metric-card glass-card">
                    <div className="metric-icon neutral">
                      <Scale size={20} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Stop Distance</span>
                      <span className="metric-value">{results.stopLossDistance.toFixed(2)}%</span>
                      <span className="metric-sub">${formatPrice(Math.abs(parseFloat(entryPrice) - parseFloat(stopPrice)))}</span>
                    </div>
                  </div>

                  <div className="metric-card glass-card">
                    <div className="metric-icon info">
                      <Target size={20} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-label">Breakeven</span>
                      <span className="metric-value">${formatPrice(results.breakevenPrice)}</span>
                      <span className="metric-sub">Inc. {exchangeFees.taker}% fees</span>
                    </div>
                  </div>
                </div>

                {/* Leverage Info */}
                {effectiveLeverage > 1 && (
                  <div className="leverage-results glass-card">
                    <h3>
                      <Zap size={20} />
                      Leverage Analysis ({effectiveLeverage}x)
                    </h3>

                    <div className="liquidation-visual">
                      <div className="price-ladder">
                        <div className="price-point entry">
                          <span className="price-label">Entry</span>
                          <span className="price-value">${formatPrice(parseFloat(entryPrice))}</span>
                        </div>
                        <div className="price-line">
                          <div
                            className="distance-indicator"
                            style={{ height: `${Math.min(results.distanceToLiquidation * 5, 100)}%` }}
                          />
                        </div>
                        <div className={`price-point liquidation ${results.distanceToLiquidation < 10 ? 'danger' : ''}`}>
                          <span className="price-label">Liquidation (est.)</span>
                          <span className="price-value">${formatPrice(results.liquidationPrice)}</span>
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
                        <span>Loss at Stop (inc. fees)</span>
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
                            <span className="tp-price">${formatPrice(tp.price)}</span>
                          </div>
                          <div className="tp-details">
                            <span className="tp-profit">{tp.profit >= 0 ? '+' : '-'}${Math.abs(tp.profit).toFixed(2)}</span>
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
                  <div className="validations glass-card" aria-live="polite">
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

                <button
                  className="send-to-practice-btn"
                  onClick={sendToPractice}
                  disabled={warnings.some(w => w.type === 'error')}
                  title={warnings.some(w => w.type === 'error') ? 'Fix the errors above first' : 'Open this setup as a paper trade'}
                >
                  <Send size={18} />
                  Practice this trade
                </button>
              </>
            ) : (
              <div className="no-results glass-card" aria-live="polite">
                <Calculator size={48} />
                <p>Enter trade parameters to calculate position size</p>
                {warnings.filter(w => w.type === 'error').length > 0 && (
                  <div className="validation-list">
                    {warnings.filter(w => w.type === 'error').map((w, index) => (
                      <div key={index} className="validation-item error">
                        <XCircle size={18} />
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PositionCalculator
