import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download, TrendingUp, TrendingDown, BookOpen,
  Calendar, DollarSign, X, Pin, List, Grid, Plus,
  FileText, FileJson, FileSpreadsheet, File,
  Target, Activity, Flame, BarChart3,
  ArrowUpRight, ArrowDownRight, Clock, Zap,
  PieChart, Trophy, AlertCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { firestoreService } from '../services/firestoreService'
import type { Trade, JournalNote } from '../services/firestoreService'
import TradingJournal from './TradingJournal'
import PersonalNotes from './PersonalNotes'
import CryptoRecommendations from './CryptoRecommendations'
import TradingBackground from './TradingBackground'
import './JournalHome.css'

// Export Modal Component
interface ExportModalProps {
  trades: Trade[]
  notes: JournalNote[]
  onClose: () => void
}

const ExportModal = ({ trades, notes, onClose }: ExportModalProps) => {
  const [exportType, setExportType] = useState<'all' | 'trades' | 'notes'>('all')
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf' | 'txt'>('json')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showItemSelection, setShowItemSelection] = useState(false)

  const handleExport = () => {
    try {
      let dataToExport: string | undefined
      let filename = `export-${new Date().toISOString().split('T')[0]}`

      if (showItemSelection && selectedItems.size > 0) {
        const selectedTrades = trades.filter(t => selectedItems.has(t.id))
        const selectedNotes = notes.filter(n => selectedItems.has(n.id))

        if (exportFormat === 'json') {
          dataToExport = firestoreService.exportCombinedToJSON(selectedTrades, selectedNotes)
          filename = `selected-items-${new Date().toISOString().split('T')[0]}.json`
        } else if (exportFormat === 'csv') {
          if (selectedTrades.length > 0) {
            dataToExport = firestoreService.exportToCSV(selectedTrades)
            filename = `selected-trades-${new Date().toISOString().split('T')[0]}.csv`
          } else if (selectedNotes.length > 0) {
            dataToExport = firestoreService.exportNotesToCSV(selectedNotes)
            filename = `selected-notes-${new Date().toISOString().split('T')[0]}.csv`
          }
        } else if (exportFormat === 'txt') {
          dataToExport = generateTextExport(selectedTrades, selectedNotes)
          filename = `selected-items-${new Date().toISOString().split('T')[0]}.txt`
        } else if (exportFormat === 'pdf') {
          alert('PDF export coming soon! Please use JSON, CSV, or TXT for now.')
          return
        }
      } else {
        if (exportType === 'all') {
          if (exportFormat === 'json') {
            dataToExport = firestoreService.exportCombinedToJSON(trades, notes)
            filename = `complete-journal-${new Date().toISOString().split('T')[0]}.json`
          } else if (exportFormat === 'csv') {
            dataToExport = firestoreService.exportToCSV(trades)
            filename = `all-trades-${new Date().toISOString().split('T')[0]}.csv`
          } else if (exportFormat === 'txt') {
            dataToExport = generateTextExport(trades, notes)
            filename = `complete-journal-${new Date().toISOString().split('T')[0]}.txt`
          } else if (exportFormat === 'pdf') {
            alert('PDF export coming soon! Please use JSON, CSV, or TXT for now.')
            return
          }
        } else if (exportType === 'trades') {
          if (exportFormat === 'json') {
            dataToExport = JSON.stringify(trades, null, 2)
            filename = `trades-${new Date().toISOString().split('T')[0]}.json`
          } else if (exportFormat === 'csv') {
            dataToExport = firestoreService.exportToCSV(trades)
            filename = `trades-${new Date().toISOString().split('T')[0]}.csv`
          } else if (exportFormat === 'txt') {
            dataToExport = generateTextExport(trades, [])
            filename = `trades-${new Date().toISOString().split('T')[0]}.txt`
          } else if (exportFormat === 'pdf') {
            alert('PDF export coming soon! Please use JSON, CSV, or TXT for now.')
            return
          }
        } else if (exportType === 'notes') {
          if (exportFormat === 'json') {
            dataToExport = JSON.stringify(notes, null, 2)
            filename = `notes-${new Date().toISOString().split('T')[0]}.json`
          } else if (exportFormat === 'csv') {
            dataToExport = firestoreService.exportNotesToCSV(notes)
            filename = `notes-${new Date().toISOString().split('T')[0]}.csv`
          } else if (exportFormat === 'txt') {
            dataToExport = generateTextExport([], notes)
            filename = `notes-${new Date().toISOString().split('T')[0]}.txt`
          } else if (exportFormat === 'pdf') {
            alert('PDF export coming soon! Please use JSON, CSV, or TXT for now.')
            return
          }
        }
      }

      if (dataToExport) {
        if (exportFormat === 'txt') {
          const blob = new Blob([dataToExport], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        } else {
          firestoreService.downloadExport(dataToExport, filename, exportFormat === 'csv' ? 'csv' : 'json')
        }
        alert('Export successful!')
        onClose()
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export. Please try again.')
    }
  }

  const generateTextExport = (trades: Trade[], notes: JournalNote[]): string => {
    let text = '===== TRADING JOURNAL EXPORT =====\n\n'
    text += `Exported: ${new Date().toLocaleString()}\n\n`

    if (trades.length > 0) {
      text += '===== TRADES =====\n\n'
      trades.forEach((trade, index) => {
        text += `Trade #${index + 1}\n`
        text += `Pair: ${trade.pair}\n`
        text += `Type: ${trade.type.toUpperCase()}\n`
        text += `Entry: $${trade.entryPrice}\n`
        text += `Exit: ${trade.exitPrice ? '$' + trade.exitPrice : 'Still Open'}\n`
        text += `Quantity: ${trade.quantity} (${trade.quantityType})\n`
        text += `Leverage: ${trade.leverage}x\n`
        text += `P/L: $${trade.profitLoss.toFixed(2)}\n`
        text += `Status: ${trade.status}\n`
        text += `Date: ${new Date(trade.entryDate).toLocaleString()}\n`
        if (trade.notes) text += `Notes: ${trade.notes}\n`
        text += '\n---\n\n'
      })
    }

    if (notes.length > 0) {
      text += '===== NOTES =====\n\n'
      notes.forEach((note, index) => {
        text += `Note #${index + 1}\n`
        text += `Title: ${note.title}\n`
        text += `Category: ${note.category}\n`
        text += `Content:\n${note.content}\n`
        text += `Created: ${new Date(note.createdAt).toLocaleString()}\n`
        if (note.isPinned) text += `[PINNED]\n`
        text += '\n---\n\n'
      })
    }

    return text
  }

  const toggleItemSelection = (id: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedItems(newSelection)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-modal" onClick={e => e.stopPropagation()}>
        <div className="export-modal-header">
          <div className="modal-header-content">
            <Download className="modal-icon" />
            <h2>Export Journal Data</h2>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="export-modal-body">
          <div className="export-section">
            <h3>What to Export</h3>
            <div className="export-type-buttons">
              <button
                className={`export-type-btn ${exportType === 'all' && !showItemSelection ? 'active' : ''}`}
                onClick={() => { setExportType('all'); setShowItemSelection(false) }}
              >
                <BarChart3 size={20} />
                <span>All Data</span>
                <small>{trades.length} trades + {notes.length} notes</small>
              </button>
              <button
                className={`export-type-btn ${exportType === 'trades' && !showItemSelection ? 'active' : ''}`}
                onClick={() => { setExportType('trades'); setShowItemSelection(false) }}
              >
                <TrendingUp size={20} />
                <span>All Trades</span>
                <small>{trades.length} trades</small>
              </button>
              <button
                className={`export-type-btn ${exportType === 'notes' && !showItemSelection ? 'active' : ''}`}
                onClick={() => { setExportType('notes'); setShowItemSelection(false) }}
              >
                <BookOpen size={20} />
                <span>All Notes</span>
                <small>{notes.length} notes</small>
              </button>
              <button
                className={`export-type-btn ${showItemSelection ? 'active' : ''}`}
                onClick={() => setShowItemSelection(!showItemSelection)}
              >
                <Target size={20} />
                <span>Select Items</span>
                <small>Custom selection</small>
              </button>
            </div>
          </div>

          {showItemSelection && (
            <div className="export-section">
              <h3>Select Items <span className="selection-count">{selectedItems.size} selected</span></h3>
              <div className="item-selection-list">
                {trades.length > 0 && (
                  <div className="item-group">
                    <h4><TrendingUp size={16} /> Trades</h4>
                    {trades.map(trade => (
                      <label key={trade.id} className={`item-checkbox ${selectedItems.has(trade.id) ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(trade.id)}
                          onChange={() => toggleItemSelection(trade.id)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="item-info">
                          <span className="item-title">{trade.pair}</span>
                          <span className={`item-badge ${trade.type}`}>{trade.type}</span>
                          <span className={`item-pnl ${trade.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                            ${Math.abs(trade.profitLoss).toFixed(2)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {notes.length > 0 && (
                  <div className="item-group">
                    <h4><BookOpen size={16} /> Notes</h4>
                    {notes.map(note => (
                      <label key={note.id} className={`item-checkbox ${selectedItems.has(note.id) ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(note.id)}
                          onChange={() => toggleItemSelection(note.id)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="item-info">
                          <span className="item-title">{note.title}</span>
                          <span className={`item-category ${note.category}`}>{note.category}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="export-section">
            <h3>Export Format</h3>
            <div className="export-format-buttons">
              <button
                className={`format-btn ${exportFormat === 'json' ? 'active' : ''}`}
                onClick={() => setExportFormat('json')}
              >
                <FileJson size={24} />
                <span>JSON</span>
              </button>
              <button
                className={`format-btn ${exportFormat === 'csv' ? 'active' : ''}`}
                onClick={() => setExportFormat('csv')}
              >
                <FileSpreadsheet size={24} />
                <span>CSV</span>
              </button>
              <button
                className={`format-btn ${exportFormat === 'txt' ? 'active' : ''}`}
                onClick={() => setExportFormat('txt')}
              >
                <FileText size={24} />
                <span>Text</span>
              </button>
              <button
                className={`format-btn ${exportFormat === 'pdf' ? 'active' : ''}`}
                onClick={() => setExportFormat('pdf')}
                disabled
                title="Coming soon"
              >
                <File size={24} />
                <span>PDF</span>
                <small>(Soon)</small>
              </button>
            </div>
          </div>
        </div>

        <div className="export-modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleExport}
            className="btn-primary"
            disabled={showItemSelection && selectedItems.size === 0}
          >
            <Download size={18} />
            <span>Export Now</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Trade Detail Modal
interface TradeDetailModalProps {
  trade: Trade
  onClose: () => void
}

const TradeDetailModal = ({ trade, onClose }: TradeDetailModalProps) => {
  const isProfitable = trade.profitLoss > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-modal-header">
          <div className="modal-header-content">
            {isProfitable ? <TrendingUp className="modal-icon profit" /> : <TrendingDown className="modal-icon loss" />}
            <h2>Trade Details</h2>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="detail-modal-body">
          <div className="detail-section">
            <div className="detail-pair">
              <span className="pair-name">{trade.pair}</span>
              <span className={`trade-type ${trade.type}`}>{trade.type.toUpperCase()}</span>
              <span className="trade-leverage">{trade.leverage}x</span>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Entry Price</span>
              <span className="detail-value">${trade.entryPrice}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Exit Price</span>
              <span className="detail-value">{trade.exitPrice ? `$${trade.exitPrice}` : 'Open'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Position Size</span>
              <span className="detail-value">{trade.quantity} {trade.quantityType}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Exchange</span>
              <span className="detail-value">{trade.exchange}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className={`status-badge ${trade.status}`}>{trade.status}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date</span>
              <span className="detail-value">{new Date(trade.entryDate).toLocaleString()}</span>
            </div>
          </div>

          <div className={`pnl-display ${isProfitable ? 'profit' : 'loss'}`}>
            <span>Profit/Loss</span>
            <div className="pnl-amount">
              {isProfitable ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              <span>${Math.abs(trade.profitLoss).toFixed(2)}</span>
            </div>
          </div>

          {trade.notes && (
            <div className="detail-notes">
              <h4>Notes</h4>
              <p>{trade.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Note Detail Modal
interface NoteDetailModalProps {
  note: JournalNote
  onClose: () => void
}

const NoteDetailModal = ({ note, onClose }: NoteDetailModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-modal-header">
          <div className="note-header-content">
            <BookOpen className="modal-icon" />
            <h2>{note.title}</h2>
            {note.isPinned && <Pin size={20} className="pinned-icon" />}
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="detail-modal-body">
          <div className="note-meta">
            <span className={`note-category ${note.category}`}>{note.category}</span>
            <span className="note-date">
              <Calendar size={16} />
              {new Date(note.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="note-content-full">
            <p>{note.content}</p>
          </div>

          {note.relatedTrades && note.relatedTrades.length > 0 && (
            <div className="linked-trade-info">
              <small>Linked to {note.relatedTrades.length} trade(s)</small>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Component
const JournalHome = () => {
  const { user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [trades, setTrades] = useState<Trade[]>([])
  const [notes, setNotes] = useState<JournalNote[]>([])
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [selectedNote, setSelectedNote] = useState<JournalNote | null>(null)
  const [tradesView, setTradesView] = useState<'recent' | 'all'>('recent')
  const [notesView, setNotesView] = useState<'recent' | 'all'>('recent')
  const [tradesPage, setTradesPage] = useState(1)
  const [notesPage, setNotesPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (user?.uid) {
      const unsubscribeTrades = firestoreService.subscribeToUserTrades(user.uid, setTrades)
      const unsubscribeNotes = firestoreService.subscribeToUserNotes(user.uid, setNotes)

      return () => {
        unsubscribeTrades()
        unsubscribeNotes()
      }
    }
  }, [user, isAuthenticated, loading, navigate])

  // Calculate analytics
  const analytics = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'closed')
    const winningTrades = closedTrades.filter(t => t.profitLoss > 0)
    const losingTrades = closedTrades.filter(t => t.profitLoss < 0)

    const totalPnL = closedTrades.reduce((sum, t) => sum + t.profitLoss, 0)
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.profitLoss, 0) / winningTrades.length
      : 0
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0) / losingTrades.length)
      : 0

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0

    // Calculate streaks
    let currentStreak = 0
    let currentStreakType: 'win' | 'loss' | null = null
    let bestWinStreak = 0
    let tempWinStreak = 0

    const sortedTrades = [...closedTrades].sort((a, b) =>
      new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    )

    for (const trade of sortedTrades) {
      const isWin = trade.profitLoss > 0

      if (currentStreakType === null) {
        currentStreakType = isWin ? 'win' : 'loss'
        currentStreak = 1
      } else if ((isWin && currentStreakType === 'win') || (!isWin && currentStreakType === 'loss')) {
        currentStreak++
      } else {
        break
      }

      if (isWin) {
        tempWinStreak++
        bestWinStreak = Math.max(bestWinStreak, tempWinStreak)
      } else {
        tempWinStreak = 0
      }
    }

    // Trades this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const tradesThisWeek = trades.filter(t => new Date(t.entryDate) >= oneWeekAgo).length

    // Trades this month
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const tradesThisMonth = trades.filter(t => new Date(t.entryDate) >= oneMonthAgo).length

    return {
      totalPnL,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      openTrades: trades.filter(t => t.status === 'open').length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      currentStreak,
      currentStreakType,
      bestWinStreak,
      tradesThisWeek,
      tradesThisMonth
    }
  }, [trades])

  // Get recent activity
  const recentActivity = useMemo(() => {
    const allItems = [
      ...trades.map(t => ({
        id: t.id,
        type: 'trade' as const,
        title: t.pair,
        subtitle: `${t.type.toUpperCase()} • $${Math.abs(t.profitLoss).toFixed(2)}`,
        date: new Date(t.entryDate),
        isProfit: t.profitLoss >= 0,
        data: t
      })),
      ...notes.map(n => ({
        id: n.id,
        type: 'note' as const,
        title: n.title,
        subtitle: n.category,
        date: new Date(n.createdAt),
        isProfit: true,
        data: n
      }))
    ]

    return allItems.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8)
  }, [trades, notes])

  if (loading) {
    return (
      <div className="journal-home">
        <TradingBackground variant="home" />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading your journal...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  // Pagination for trades
  const totalTradesPages = Math.ceil(trades.length / itemsPerPage)
  const indexOfLastTrade = tradesPage * itemsPerPage
  const indexOfFirstTrade = indexOfLastTrade - itemsPerPage
  const currentTrades = trades.slice(indexOfFirstTrade, indexOfLastTrade)

  // Pagination for notes
  const totalNotesPages = Math.ceil(notes.length / itemsPerPage)
  const indexOfLastNote = notesPage * itemsPerPage
  const indexOfFirstNote = indexOfLastNote - itemsPerPage
  const currentNotes = notes.slice(indexOfFirstNote, indexOfLastNote)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="journal-home">
      <TradingBackground variant="home" />

      {/* Hero Section */}
      <div className="journal-hero">
        <div className="hero-icon-wrapper">
          <div className="hero-icon">
            <BookOpen size={48} />
          </div>
          <div className="hero-glow"></div>
        </div>
        <div className="hero-content">
          <h1>{getGreeting()}, {user?.displayName?.split(' ')[0] || 'Trader'}</h1>
          <p>Your trading journal dashboard - track performance, analyze patterns, grow consistently</p>
        </div>
        <div className="hero-actions">
          <button
            onClick={() => setShowExportModal(true)}
            className="export-btn"
            disabled={trades.length === 0 && notes.length === 0}
          >
            <Download size={20} />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="quick-stats-bar">
        <div className="stat-chip">
          <Activity size={18} />
          <span>{analytics.totalTrades} Trades</span>
        </div>
        <div className="stat-chip">
          <BookOpen size={18} />
          <span>{notes.length} Notes</span>
        </div>
        <div className="stat-chip">
          <Clock size={18} />
          <span>{analytics.tradesThisWeek} This Week</span>
        </div>
        <div className={`stat-chip ${analytics.totalPnL >= 0 ? 'profit' : 'loss'}`}>
          {analytics.totalPnL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          <span>${Math.abs(analytics.totalPnL).toFixed(2)} Total P/L</span>
        </div>
      </div>

      {/* Performance Dashboard */}
      <div className="performance-dashboard">
        <div className="dashboard-header">
          <h2><BarChart3 size={24} /> Performance Overview</h2>
        </div>
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">
              <Target size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{analytics.winRate.toFixed(1)}%</span>
              <span className="stat-label">Win Rate</span>
            </div>
            <div className="stat-bar">
              <div
                className="stat-bar-fill win"
                style={{ width: `${analytics.winRate}%` }}
              ></div>
            </div>
          </div>

          <div className={`stat-card ${analytics.totalPnL >= 0 ? 'profit' : 'loss'}`}>
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">
                {analytics.totalPnL >= 0 ? '+' : '-'}${Math.abs(analytics.totalPnL).toFixed(2)}
              </span>
              <span className="stat-label">Total Profit/Loss</span>
            </div>
            <div className="stat-trend">
              {analytics.totalPnL >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <PieChart size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{analytics.profitFactor === Infinity ? '∞' : analytics.profitFactor.toFixed(2)}</span>
              <span className="stat-label">Profit Factor</span>
            </div>
            <div className="stat-indicator">
              <span className={analytics.profitFactor >= 1.5 ? 'good' : analytics.profitFactor >= 1 ? 'neutral' : 'bad'}>
                {analytics.profitFactor >= 1.5 ? 'Excellent' : analytics.profitFactor >= 1 ? 'Good' : 'Needs Work'}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Flame size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{analytics.currentStreak}</span>
              <span className="stat-label">
                Current {analytics.currentStreakType === 'win' ? 'Win' : analytics.currentStreakType === 'loss' ? 'Loss' : ''} Streak
              </span>
            </div>
            <div className="stat-badge">
              <Trophy size={16} />
              <span>Best: {analytics.bestWinStreak}</span>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="secondary-stats">
          <div className="mini-stat">
            <span className="mini-label">Avg Win</span>
            <span className="mini-value profit">+${analytics.avgWin.toFixed(2)}</span>
          </div>
          <div className="mini-stat">
            <span className="mini-label">Avg Loss</span>
            <span className="mini-value loss">-${analytics.avgLoss.toFixed(2)}</span>
          </div>
          <div className="mini-stat">
            <span className="mini-label">Open Trades</span>
            <span className="mini-value">{analytics.openTrades}</span>
          </div>
          <div className="mini-stat">
            <span className="mini-label">Closed Trades</span>
            <span className="mini-value">{analytics.closedTrades}</span>
          </div>
          <div className="mini-stat">
            <span className="mini-label">This Month</span>
            <span className="mini-value">{analytics.tradesThisMonth}</span>
          </div>
        </div>
      </div>

      {/* Crypto Recommendations */}
      <CryptoRecommendations />

      {/* Recent Activity */}
      <div className="activity-section">
        <div className="section-header">
          <div className="section-title">
            <Zap size={24} className="section-icon" />
            <h2>Recent Activity</h2>
          </div>
        </div>

        {recentActivity.length > 0 ? (
          <div className="activity-timeline">
            {recentActivity.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`activity-item ${item.type}`}
                onClick={() => {
                  if (item.type === 'trade') {
                    setSelectedTrade(item.data as Trade)
                  } else {
                    setSelectedNote(item.data as JournalNote)
                  }
                }}
              >
                <div className="activity-icon">
                  {item.type === 'trade' ? (
                    item.isProfit ? <TrendingUp size={18} /> : <TrendingDown size={18} />
                  ) : (
                    <BookOpen size={18} />
                  )}
                </div>
                <div className="activity-content">
                  <span className="activity-title">{item.title}</span>
                  <span className="activity-subtitle">{item.subtitle}</span>
                </div>
                <div className="activity-time">
                  {item.date.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-activity">
            <AlertCircle size={24} />
            <p>No recent activity. Start tracking your trades!</p>
          </div>
        )}
      </div>

      <div className="journal-content-grid">
        {/* Trades Section */}
        <div className="journal-section">
          <div className="section-header">
            <div className="section-title">
              <TrendingUp size={24} className="section-icon" />
              <h2>Trades</h2>
            </div>
            <div className="section-actions">
              <button
                className="add-item-btn"
                onClick={() => setTradesView('all')}
                title="View all trades"
              >
                <Plus size={18} />
                <span>Manage Trades</span>
              </button>
              <div className="view-toggle">
                <button
                  className={`toggle-btn ${tradesView === 'recent' ? 'active' : ''}`}
                  onClick={() => setTradesView('recent')}
                  title="Recent view"
                >
                  <Grid size={16} />
                </button>
                <button
                  className={`toggle-btn ${tradesView === 'all' ? 'active' : ''}`}
                  onClick={() => setTradesView('all')}
                  title="All trades"
                >
                  <List size={16} />
                </button>
              </div>
              <span className="section-count">{trades.length} total</span>
            </div>
          </div>

          {tradesView === 'recent' ? (
            <>
              {currentTrades.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <TrendingUp size={48} />
                  </div>
                  <h3>No trades yet</h3>
                  <p>Start tracking your trading performance!</p>
                  <button className="empty-action" onClick={() => setTradesView('all')}>
                    <Plus size={18} />
                    <span>Add Your First Trade</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="cards-grid">
                    {currentTrades.map(trade => (
                    <div
                      key={trade.id}
                      className={`journal-card trade-card ${trade.status}`}
                      onClick={() => setSelectedTrade(trade)}
                    >
                      <div className="card-header">
                        <span className="card-title">{trade.pair}</span>
                        <span className={`card-badge ${trade.type}`}>{trade.type}</span>
                      </div>
                      <div className="card-body">
                        <div className="card-info">
                          <DollarSign size={16} />
                          <span>${trade.entryPrice}</span>
                        </div>
                        <div className={`card-pnl ${trade.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                          {trade.profitLoss >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          <span>${Math.abs(trade.profitLoss).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="card-footer">
                        <Calendar size={14} />
                        <span>{new Date(trade.entryDate).toLocaleDateString()}</span>
                        <span className="card-leverage">{trade.leverage}x</span>
                      </div>
                    </div>
                  ))}
                  </div>

                  {totalTradesPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => setTradesPage(prev => Math.max(prev - 1, 1))}
                        disabled={tradesPage === 1}
                        className="pagination-btn"
                      >
                        ← Previous
                      </button>
                      <span className="pagination-info">
                        Page {tradesPage} of {totalTradesPages}
                      </span>
                      <button
                        onClick={() => setTradesPage(prev => Math.min(prev + 1, totalTradesPages))}
                        disabled={tradesPage === totalTradesPages}
                        className="pagination-btn"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="full-component-view">
              <TradingJournal onTradesUpdate={setTrades} compact={false} />
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="journal-section">
          <div className="section-header">
            <div className="section-title">
              <BookOpen size={24} className="section-icon" />
              <h2>Notes</h2>
            </div>
            <div className="section-actions">
              <button
                className="add-item-btn"
                onClick={() => setNotesView('all')}
                title="View all notes"
              >
                <Plus size={18} />
                <span>Manage Notes</span>
              </button>
              <div className="view-toggle">
                <button
                  className={`toggle-btn ${notesView === 'recent' ? 'active' : ''}`}
                  onClick={() => setNotesView('recent')}
                  title="Recent view"
                >
                  <Grid size={16} />
                </button>
                <button
                  className={`toggle-btn ${notesView === 'all' ? 'active' : ''}`}
                  onClick={() => setNotesView('all')}
                  title="All notes"
                >
                  <List size={16} />
                </button>
              </div>
              <span className="section-count">{notes.length} total</span>
            </div>
          </div>

          {notesView === 'recent' ? (
            <>
              {currentNotes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <BookOpen size={48} />
                  </div>
                  <h3>No notes yet</h3>
                  <p>Document your strategies and insights!</p>
                  <button className="empty-action" onClick={() => setNotesView('all')}>
                    <Plus size={18} />
                    <span>Create Your First Note</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="cards-grid">
                    {currentNotes.map(note => (
                    <div
                      key={note.id}
                      className="journal-card note-card"
                      onClick={() => setSelectedNote(note)}
                    >
                      <div className="card-header">
                        <span className="card-title">{note.title}</span>
                        {note.isPinned && <Pin size={16} className="pinned-badge" />}
                      </div>
                      <div className="card-body">
                        <span className={`note-category-badge ${note.category}`}>
                          {note.category}
                        </span>
                        <p className="note-preview">{note.content.substring(0, 100)}...</p>
                      </div>
                      <div className="card-footer">
                        <Calendar size={14} />
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  </div>

                  {totalNotesPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => setNotesPage(prev => Math.max(prev - 1, 1))}
                        disabled={notesPage === 1}
                        className="pagination-btn"
                      >
                        ← Previous
                      </button>
                      <span className="pagination-info">
                        Page {notesPage} of {totalNotesPages}
                      </span>
                      <button
                        onClick={() => setNotesPage(prev => Math.min(prev + 1, totalNotesPages))}
                        disabled={notesPage === totalNotesPages}
                        className="pagination-btn"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="full-component-view">
              <PersonalNotes trades={trades} compact={false} />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showExportModal && (
        <ExportModal
          trades={trades}
          notes={notes}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}

      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
        />
      )}
    </div>
  )
}

export default JournalHome
