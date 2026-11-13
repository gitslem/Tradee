import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, TrendingUp, TrendingDown, Calendar, DollarSign, Target,
  Edit2, Trash2, CheckCircle, Clock, X, BarChart3, Award,
  Percent, Activity, ArrowUpRight, ArrowDownRight, Zap, Filter,
  ChevronLeft, ChevronRight, Search
} from 'lucide-react'
import { useAuth } from '../context/auth'
import { firestoreService } from '../services/firestoreService'
import { EXCHANGES } from '../config/exchanges'
import type { Trade, TradeStats } from '../services/firestoreService'
import './TradingJournal.css'

interface TradingJournalProps {
  onTradesUpdate?: (trades: Trade[]) => void
  compact?: boolean
}

const TradingJournal = ({ onTradesUpdate, compact = false }: TradingJournalProps = {}) => {
  const { user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'wins' | 'losses'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (user?.uid) {
      const unsubscribe = firestoreService.subscribeToUserTrades(user.uid, (updatedTrades) => {
        setTrades(updatedTrades)
        const userStats = firestoreService.calculateStats(updatedTrades)
        setStats(userStats)
        onTradesUpdate?.(updatedTrades)
      })

      return () => unsubscribe()
    }
  }, [user, isAuthenticated, loading, navigate, onTradesUpdate])

  const handleAddTrade = () => {
    setEditingTrade(null)
    setShowAddModal(true)
  }

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade)
    setShowAddModal(true)
  }

  const handleDeleteTrade = async (tradeId: string) => {
    if (!user) return
    if (confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
      try {
        await firestoreService.deleteTrade(tradeId)
      } catch (error) {
        console.error('Delete error:', error)
        alert('Failed to delete trade. Please try again.')
      }
    }
  }

  const handleCloseTrade = async (trade: Trade) => {
    if (!user || trade.status === 'closed') return

    const exitPrice = prompt(`Enter exit price for ${trade.pair}:`)
    if (!exitPrice) return

    const price = parseFloat(exitPrice)
    if (isNaN(price) || price <= 0) {
      alert('Invalid price. Please enter a valid positive number.')
      return
    }

    try {
      const baseQuantity = trade.quantityType === 'base'
        ? trade.quantity
        : trade.quantity / trade.entryPrice

      const profitLoss = trade.type === 'long'
        ? (price - trade.entryPrice) * baseQuantity
        : (trade.entryPrice - price) * baseQuantity

      const profitLossPercent = trade.type === 'long'
        ? ((price - trade.entryPrice) / trade.entryPrice) * 100 * trade.leverage
        : ((trade.entryPrice - price) / trade.entryPrice) * 100 * trade.leverage

      const outcome = profitLoss > 0 ? 'win' : 'loss'

      await firestoreService.updateTrade(trade.id, {
        exitPrice: price,
        exitDate: new Date().toISOString(),
        status: 'closed',
        outcome,
        profitLoss,
        profitLossPercent,
        updatedAt: new Date().toISOString()
      })

      const isProfitable = profitLoss > 0
      alert(`Trade closed!\n\nP&L: ${isProfitable ? '+' : ''}$${profitLoss.toFixed(2)} (${isProfitable ? '+' : ''}${profitLossPercent.toFixed(2)}%)`)
    } catch (error) {
      console.error('Close trade error:', error)
      alert('Failed to close trade. Please try again.')
    }
  }

  const filteredTrades = trades.filter(trade => {
    const matchesFilter = filter === 'all' ? true
      : filter === 'open' ? trade.status === 'open'
      : filter === 'closed' ? trade.status === 'closed'
      : filter === 'wins' ? trade.outcome === 'win'
      : filter === 'losses' ? trade.outcome === 'loss'
      : true

    const matchesSearch = searchTerm === '' ||
      trade.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.exchange.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage)
  const indexOfLastTrade = currentPage * itemsPerPage
  const indexOfFirstTrade = indexOfLastTrade - itemsPerPage
  const currentTrades = filteredTrades.slice(indexOfFirstTrade, indexOfLastTrade)

  if (loading) {
    return (
      <div className="trading-journal">
        <div className="journal-loading">
          <div className="loading-spinner"></div>
          <span>Loading your trades...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className={`trading-journal ${compact ? 'compact' : ''}`}>
      {/* Header Section */}
      {!compact && (
        <div className="tj-header">
          <div className="tj-header-content">
            <div className="tj-icon">
              <BarChart3 size={28} />
            </div>
            <div className="tj-title-group">
              <h2>Trading Journal</h2>
              <p>Track and analyze your trading performance</p>
            </div>
          </div>
          <button onClick={handleAddTrade} className="tj-add-btn">
            <Plus size={20} />
            <span>New Trade</span>
          </button>
        </div>
      )}

      {compact && (
        <div className="compact-header">
          <h3>Recent Trades</h3>
          <button onClick={handleAddTrade} className="add-trade-btn-compact">
            <Plus size={18} />
            <span>Add Trade</span>
          </button>
        </div>
      )}

      {/* Stats Dashboard */}
      {stats && (
        <div className="tj-stats-dashboard">
          <div className="tj-stat-card highlight">
            <div className="stat-icon-wrap primary">
              <Activity size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalTrades}</span>
              <span className="stat-label">Total Trades</span>
            </div>
          </div>

          <div className="tj-stat-card">
            <div className="stat-icon-wrap success">
              <Percent size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.winRate.toFixed(1)}%</span>
              <span className="stat-label">Win Rate</span>
              <span className="stat-detail">{stats.wins}W / {stats.losses}L</span>
            </div>
          </div>

          <div className={`tj-stat-card ${stats.totalProfitLoss >= 0 ? 'profit' : 'loss'}`}>
            <div className={`stat-icon-wrap ${stats.totalProfitLoss >= 0 ? 'success' : 'danger'}`}>
              <DollarSign size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {stats.totalProfitLoss >= 0 ? '+' : '-'}${Math.abs(stats.totalProfitLoss).toFixed(2)}
              </span>
              <span className="stat-label">Total P&L</span>
            </div>
            <div className="stat-trend">
              {stats.totalProfitLoss >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            </div>
          </div>

          <div className="tj-stat-card">
            <div className="stat-icon-wrap warning">
              <Target size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
              </span>
              <span className="stat-label">Profit Factor</span>
            </div>
          </div>

          <div className="tj-stat-card">
            <div className="stat-icon-wrap info">
              <Clock size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.openTrades}</span>
              <span className="stat-label">Open Trades</span>
            </div>
          </div>

          <div className="tj-stat-card">
            <div className="stat-icon-wrap purple">
              <Award size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-value stat-text">{stats.bestPair}</span>
              <span className="stat-label">Best Pair</span>
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="tj-content">
        <div className="tj-content-header">
          <div className="tj-search-filter">
            <div className="tj-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); setCurrentPage(1) }} className="clear-search">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="tj-filters">
              <Filter size={16} />
              {[
                { key: 'all', label: 'All', count: trades.length },
                { key: 'open', label: 'Open', count: trades.filter(t => t.status === 'open').length },
                { key: 'closed', label: 'Closed', count: trades.filter(t => t.status === 'closed').length },
                { key: 'wins', label: 'Wins', count: trades.filter(t => t.outcome === 'win').length },
                { key: 'losses', label: 'Losses', count: trades.filter(t => t.outcome === 'loss').length }
              ].map(f => (
                <button
                  key={f.key}
                  className={`filter-btn ${filter === f.key ? 'active' : ''}`}
                  onClick={() => { setFilter(f.key as typeof filter); setCurrentPage(1) }}
                >
                  {f.label}
                  <span className="filter-count">{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTrades.length === 0 ? (
          <div className="tj-empty-state">
            <div className="empty-icon">
              <TrendingUp size={56} />
            </div>
            <h3>{searchTerm || filter !== 'all' ? 'No trades found' : 'No trades yet'}</h3>
            <p>
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Start tracking your trades to analyze your performance'
              }
            </p>
            {!searchTerm && filter === 'all' && (
              <button onClick={handleAddTrade} className="tj-add-btn large">
                <Plus size={20} />
                <span>Add Your First Trade</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="tj-trades-list">
              {currentTrades.map(trade => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onEdit={handleEditTrade}
                  onDelete={handleDeleteTrade}
                  onClose={handleCloseTrade}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="tj-pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                <div className="pagination-info">
                  <span>Page {currentPage} of {totalPages}</span>
                  <span className="pagination-total">({filteredTrades.length} trades)</span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Trade Modal */}
      {showAddModal && (
        <TradeModal
          trade={editingTrade}
          onClose={() => {
            setShowAddModal(false)
            setEditingTrade(null)
          }}
          onSave={async (tradeData) => {
            if (!user?.uid) return
            try {
              if (editingTrade) {
                await firestoreService.updateTrade(editingTrade.id, tradeData)
              } else {
                await firestoreService.addTrade(user.uid, tradeData as Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>)
              }
              setShowAddModal(false)
              setEditingTrade(null)
            } catch (error) {
              console.error('Save error:', error)
              alert('Failed to save trade. Please try again.')
            }
          }}
        />
      )}
    </div>
  )
}

// Trade Card Component
interface TradeCardProps {
  trade: Trade
  onEdit: (trade: Trade) => void
  onDelete: (tradeId: string) => void
  onClose: (trade: Trade) => void
}

const TradeCard = ({ trade, onEdit, onDelete, onClose }: TradeCardProps) => {
  const isProfitable = trade.profitLoss > 0
  const isOpen = trade.status === 'open'
  const [baseCurrency, quoteCurrency] = trade.pair.split('/')
  const quantityType = trade.quantityType || 'base'
  const currency = quantityType === 'base' ? baseCurrency : quoteCurrency

  return (
    <div className={`tj-trade-card ${trade.status} ${trade.outcome || ''}`}>
      <div className="trade-card-left">
        <div className={`trade-direction ${trade.type}`}>
          {trade.type === 'long' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
        </div>
        <div className="trade-main-info">
          <div className="trade-pair-row">
            <span className="trade-pair">{trade.pair}</span>
            <span className={`trade-type-badge ${trade.type}`}>{trade.type.toUpperCase()}</span>
            <span className="trade-leverage">{trade.leverage}x</span>
          </div>
          <div className="trade-details-row">
            <span className="trade-entry">Entry: ${trade.entryPrice.toFixed(2)}</span>
            <span className="trade-divider">→</span>
            <span className="trade-exit">
              {trade.exitPrice ? `Exit: $${trade.exitPrice.toFixed(2)}` : 'Open'}
            </span>
            <span className="trade-qty">{trade.quantity} {currency}</span>
          </div>
        </div>
      </div>

      <div className="trade-card-right">
        {!isOpen && (
          <div className={`trade-pnl ${isProfitable ? 'profit' : 'loss'}`}>
            <span className="pnl-amount">
              {isProfitable ? '+' : '-'}${Math.abs(trade.profitLoss).toFixed(2)}
            </span>
            <span className="pnl-percent">
              {isProfitable ? '+' : ''}{trade.profitLossPercent.toFixed(2)}%
            </span>
          </div>
        )}

        {isOpen && (
          <div className="trade-status-open">
            <Clock size={16} />
            <span>Open</span>
          </div>
        )}

        <div className="trade-actions">
          {isOpen && (
            <button onClick={() => onClose(trade)} className="action-btn close" title="Close Trade">
              <CheckCircle size={16} />
            </button>
          )}
          <button onClick={() => onEdit(trade)} className="action-btn edit" title="Edit">
            <Edit2 size={16} />
          </button>
          <button onClick={() => onDelete(trade.id)} className="action-btn delete" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="trade-card-footer">
        <div className="trade-meta">
          <Calendar size={14} />
          <span>{new Date(trade.entryDate).toLocaleDateString()}</span>
        </div>
        <div className="trade-exchange">{trade.exchange}</div>
        {trade.notes && <div className="trade-has-notes" title={trade.notes}>📝</div>}
      </div>
    </div>
  )
}

// Trade Modal Component
interface TradeModalProps {
  trade: Trade | null
  onClose: () => void
  onSave: (trade: Partial<Trade>) => void
}

const TradeModal = ({ trade, onClose, onSave }: TradeModalProps) => {
  const [formData, setFormData] = useState({
    pair: trade?.pair || 'BTC/USDT',
    type: trade?.type || 'long' as 'long' | 'short',
    entryPrice: trade?.entryPrice.toString() || '',
    exitPrice: trade?.exitPrice?.toString() || '',
    quantity: trade?.quantity.toString() || '',
    quantityType: trade?.quantityType || 'base' as 'base' | 'quote',
    entryDate: trade?.entryDate ? trade.entryDate.split('T')[0] : new Date().toISOString().split('T')[0],
    exitDate: trade?.exitDate ? trade.exitDate.split('T')[0] : '',
    stopLoss: trade?.stopLoss?.toString() || '',
    takeProfit: trade?.takeProfit?.toString() || '',
    leverage: trade?.leverage.toString() || '1',
    exchange: trade?.exchange || 'binance',
    notes: trade?.notes || '',
    tags: trade?.tags?.join(', ') || ''
  })

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const getCurrencies = (pair: string) => {
    const [base, quote] = pair.split('/')
    return { base, quote }
  }

  const currencies = getCurrencies(formData.pair)

  const getBaseQuantity = () => {
    const qty = parseFloat(formData.quantity)
    const price = parseFloat(formData.entryPrice)
    if (isNaN(qty) || isNaN(price)) return 0
    return formData.quantityType === 'base' ? qty : qty / price
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const entryPrice = parseFloat(formData.entryPrice)
    const inputQuantity = parseFloat(formData.quantity)
    const leverage = parseFloat(formData.leverage)

    if (isNaN(entryPrice) || entryPrice <= 0) {
      alert('Please enter a valid entry price')
      return
    }

    if (isNaN(inputQuantity) || inputQuantity <= 0) {
      alert('Please enter a valid quantity')
      return
    }

    if (isNaN(leverage) || leverage < 1 || leverage > 125) {
      alert('Leverage must be between 1x and 125x')
      return
    }

    const exitPrice = formData.exitPrice ? parseFloat(formData.exitPrice) : null
    if (exitPrice !== null && (isNaN(exitPrice) || exitPrice <= 0)) {
      alert('Please enter a valid exit price or leave it empty')
      return
    }

    const baseQuantity = getBaseQuantity()

    let profitLoss = 0
    let profitLossPercent = 0
    let status: 'open' | 'closed' = 'open'
    let outcome: 'win' | 'loss' | 'pending' = 'pending'

    if (exitPrice) {
      profitLoss = formData.type === 'long'
        ? (exitPrice - entryPrice) * baseQuantity
        : (entryPrice - exitPrice) * baseQuantity

      profitLossPercent = formData.type === 'long'
        ? ((exitPrice - entryPrice) / entryPrice) * 100 * leverage
        : ((entryPrice - exitPrice) / entryPrice) * 100 * leverage

      status = 'closed'
      outcome = profitLoss > 0 ? 'win' : 'loss'
    }

    const tradeData: Partial<Trade> = {
      pair: formData.pair,
      type: formData.type,
      entryPrice,
      exitPrice,
      quantity: inputQuantity,
      quantityType: formData.quantityType,
      entryDate: new Date(formData.entryDate).toISOString(),
      exitDate: formData.exitDate ? new Date(formData.exitDate).toISOString() : null,
      stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : null,
      takeProfit: formData.takeProfit ? parseFloat(formData.takeProfit) : null,
      leverage,
      exchange: formData.exchange,
      status,
      outcome,
      profitLoss,
      profitLossPercent,
      fees: 0,
      notes: formData.notes,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      screenshots: trade?.screenshots || []
    }

    onSave(tradeData)
  }

  return (
    <div className="tj-modal-overlay" onClick={onClose}>
      <div className="tj-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tj-modal-header">
          <div className="modal-title-group">
            <Zap size={24} />
            <h2>{trade ? 'Edit Trade' : 'Log New Trade'}</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tj-modal-form">
          <div className="form-section">
            <h3>Trade Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Trading Pair</label>
                <select
                  value={formData.pair}
                  onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                >
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

              <div className="form-group">
                <label>Direction</label>
                <div className="direction-toggle">
                  <button
                    type="button"
                    className={`direction-btn long ${formData.type === 'long' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'long' })}
                  >
                    <TrendingUp size={18} />
                    Long
                  </button>
                  <button
                    type="button"
                    className={`direction-btn short ${formData.type === 'short' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'short' })}
                  >
                    <TrendingDown size={18} />
                    Short
                  </button>
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Entry Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.entryPrice}
                  onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Exit Price (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.exitPrice}
                  onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                  placeholder="Leave empty if still open"
                />
              </div>
            </div>

            <div className="form-grid three">
              <div className="form-group">
                <label>Quantity Type</label>
                <select
                  value={formData.quantityType}
                  onChange={(e) => setFormData({ ...formData, quantityType: e.target.value as 'base' | 'quote' })}
                >
                  <option value="base">{currencies.base}</option>
                  <option value="quote">{currencies.quote}</option>
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder={`Amount in ${formData.quantityType === 'base' ? currencies.base : currencies.quote}`}
                  required
                />
                {formData.entryPrice && formData.quantity && (
                  <small className="conversion-hint">
                    ≈ {formData.quantityType === 'base'
                      ? `${(parseFloat(formData.quantity) * parseFloat(formData.entryPrice)).toFixed(2)} ${currencies.quote}`
                      : `${(parseFloat(formData.quantity) / parseFloat(formData.entryPrice)).toFixed(8)} ${currencies.base}`
                    }
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Leverage</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="125"
                  value={formData.leverage}
                  onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Risk Management</h3>
            <div className="form-grid three">
              <div className="form-group">
                <label>Stop Loss</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.stopLoss}
                  onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>Take Profit</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.takeProfit}
                  onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>Exchange</label>
                <select
                  value={formData.exchange}
                  onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                >
                  {Object.values(EXCHANGES).map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.displayName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Entry Date</label>
              <input
                type="date"
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Notes & Tags</h3>
            <div className="form-group">
              <label>Trade Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Strategy, market conditions, emotions, lessons learned..."
              />
            </div>

            <div className="form-group">
              <label>Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="breakout, trend-following, scalp (comma separated)"
              />
            </div>
          </div>

          <div className="tj-modal-footer">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-save">
              <CheckCircle size={18} />
              {trade ? 'Update Trade' : 'Save Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TradingJournal
