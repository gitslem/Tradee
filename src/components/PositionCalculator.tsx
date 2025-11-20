import { useState } from 'react'
import './PositionCalculator.css'

interface CalculationResults {
  stopLossDistance: number
  riskAmount: number
  positionSize: number
  positionValue: number
  potentialProfit: number
  riskRewardRatio: number
}

const PositionCalculator = () => {
  const [accountBalance, setAccountBalance] = useState<string>('10000')
  const [riskPercentage, setRiskPercentage] = useState<string>('1')
  const [entryPrice, setEntryPrice] = useState<string>('3500')
  const [stopPrice, setStopPrice] = useState<string>('3400')
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('3800')
  const [cryptoPair, setCryptoPair] = useState<string>('ETH/USDT')
  const [positionType, setPositionType] = useState<'long' | 'short'>('long')

  const calculatePosition = (): CalculationResults | null => {
    const balance = parseFloat(accountBalance)
    const risk = parseFloat(riskPercentage)
    const entry = parseFloat(entryPrice)
    const stop = parseFloat(stopPrice)
    const takeProfit = parseFloat(takeProfitPrice)

    if (isNaN(balance) || isNaN(risk) || isNaN(entry) || isNaN(stop)) {
      return null
    }

    // Stop-Loss % Distance = |Entry Price – Stop Price| ÷ Entry Price
    const stopLossDistance = Math.abs(entry - stop) / entry

    // Risk Amount = Account Balance × Risk % per Trade
    const riskAmount = balance * (risk / 100)

    // Position Size = (Account Balance × Risk % per Trade) ÷ Stop Loss % Distance
    const positionSize = riskAmount / stopLossDistance

    // Position Value in base currency
    const positionValue = positionSize / entry

    // Potential Profit
    const potentialProfit = isNaN(takeProfit)
      ? 0
      : Math.abs(takeProfit - entry) * positionValue

    // Risk/Reward Ratio
    const riskRewardRatio = isNaN(takeProfit)
      ? 0
      : Math.abs(takeProfit - entry) / Math.abs(entry - stop)

    return {
      stopLossDistance: stopLossDistance * 100,
      riskAmount,
      positionSize,
      positionValue,
      potentialProfit,
      riskRewardRatio
    }
  }

  const results = calculatePosition()

  const validatePosition = (): string[] => {
    const warnings: string[] = []
    const entry = parseFloat(entryPrice)
    const stop = parseFloat(stopPrice)
    const takeProfit = parseFloat(takeProfitPrice)
    const risk = parseFloat(riskPercentage)

    if (positionType === 'long') {
      if (stop >= entry) {
        warnings.push('⚠️ For LONG positions, stop loss should be below entry price')
      }
      if (!isNaN(takeProfit) && takeProfit <= entry) {
        warnings.push('⚠️ For LONG positions, take profit should be above entry price')
      }
    } else {
      if (stop <= entry) {
        warnings.push('⚠️ For SHORT positions, stop loss should be above entry price')
      }
      if (!isNaN(takeProfit) && takeProfit >= entry) {
        warnings.push('⚠️ For SHORT positions, take profit should be below entry price')
      }
    }

    if (risk > 2) {
      warnings.push('⚠️ Risk per trade > 2% is considered aggressive')
    }

    if (results && results.riskRewardRatio < 2 && results.riskRewardRatio > 0) {
      warnings.push('⚠️ Risk/Reward ratio below 2:1 - consider better entry/exit')
    }

    return warnings
  }

  const warnings = validatePosition()

  return (
    <div className="position-calculator">
      <div className="calculator-grid">
        <div className="input-section">
          <h2>Trading Setup</h2>

          <div className="form-group">
            <label>Crypto Pair</label>
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

          <div className="form-group">
            <label>Position Type</label>
            <div className="radio-group">
              <label className={positionType === 'long' ? 'active' : ''}>
                <input
                  type="radio"
                  checked={positionType === 'long'}
                  onChange={() => setPositionType('long')}
                />
                Long (Buy)
              </label>
              <label className={positionType === 'short' ? 'active' : ''}>
                <input
                  type="radio"
                  checked={positionType === 'short'}
                  onChange={() => setPositionType('short')}
                />
                Short (Sell)
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Account Balance (USDT)</label>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              placeholder="10000"
            />
          </div>

          <div className="form-group">
            <label>Risk Per Trade (%)</label>
            <input
              type="number"
              value={riskPercentage}
              onChange={(e) => setRiskPercentage(e.target.value)}
              placeholder="1"
              step="0.1"
            />
            <small>Recommended: 1-2% per trade</small>
          </div>

          <div className="form-group">
            <label>Entry Price (USDT)</label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="3500"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Stop Loss Price (USDT)</label>
            <input
              type="number"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="3400"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Take Profit Price (USDT) - Optional</label>
            <input
              type="number"
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(e.target.value)}
              placeholder="3800"
              step="0.01"
            />
          </div>
        </div>

        <div className="results-section">
          <h2>Position Details</h2>

          {results ? (
            <>
              <div className="result-card highlight">
                <h3>Position Size</h3>
                <div className="result-value">${results.positionSize.toFixed(2)}</div>
                <div className="result-subtext">{results.positionValue.toFixed(6)} {cryptoPair.split('/')[0]}</div>
              </div>

              <div className="result-card">
                <h3>Risk Amount</h3>
                <div className="result-value">${results.riskAmount.toFixed(2)}</div>
                <div className="result-subtext">{riskPercentage}% of account</div>
              </div>

              <div className="result-card">
                <h3>Stop Loss Distance</h3>
                <div className="result-value">{results.stopLossDistance.toFixed(2)}%</div>
                <div className="result-subtext">${Math.abs(parseFloat(entryPrice) - parseFloat(stopPrice)).toFixed(2)} per unit</div>
              </div>

              {!isNaN(parseFloat(takeProfitPrice)) && (
                <>
                  <div className="result-card success">
                    <h3>Potential Profit</h3>
                    <div className="result-value">${results.potentialProfit.toFixed(2)}</div>
                    <div className="result-subtext">If take profit is hit</div>
                  </div>

                  <div className="result-card">
                    <h3>Risk/Reward Ratio</h3>
                    <div className="result-value">1:{results.riskRewardRatio.toFixed(2)}</div>
                    <div className="result-subtext">
                      {results.riskRewardRatio >= 2 ? '✅ Good ratio' : '⚠️ Consider better R:R'}
                    </div>
                  </div>
                </>
              )}

              {warnings.length > 0 && (
                <div className="warnings">
                  <h3>⚠️ Warnings</h3>
                  {warnings.map((warning, index) => (
                    <p key={index}>{warning}</p>
                  ))}
                </div>
              )}

              <div className="quick-stats">
                <h3>Quick Stats</h3>
                <ul>
                  <li>
                    <strong>Entry:</strong> ${parseFloat(entryPrice).toFixed(2)}
                  </li>
                  <li>
                    <strong>Stop Loss:</strong> ${parseFloat(stopPrice).toFixed(2)}
                  </li>
                  {!isNaN(parseFloat(takeProfitPrice)) && (
                    <li>
                      <strong>Take Profit:</strong> ${parseFloat(takeProfitPrice).toFixed(2)}
                    </li>
                  )}
                  <li>
                    <strong>Max Loss:</strong> ${results.riskAmount.toFixed(2)} ({riskPercentage}%)
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="no-results">
              <p>Enter valid values to calculate position size</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PositionCalculator
