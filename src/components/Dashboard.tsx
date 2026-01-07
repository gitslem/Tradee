import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, BookOpen, FileText, Download,
  BarChart3, PieChart, Target, DollarSign
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { firestoreService } from '../services/firestoreService'
import { analyticsService } from '../services/analyticsService'
import type { Trade, JournalNote, TradeStats } from '../services/firestoreService'
import TradingBackground from './TradingBackground'
import PerformanceCharts from './PerformanceCharts'
import './Dashboard.css'

const Dashboard = () => {
  const { user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  const [trades, setTrades] = useState<Trade[]>([])
  const [notes, setNotes] = useState<JournalNote[]>([])
  const [stats, setStats] = useState<TradeStats | null>(null)

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (user?.uid) {
      // Subscribe to real-time updates
      const unsubscribeTrades = firestoreService.subscribeToUserTrades(user.uid, (updatedTrades) => {
        setTrades(updatedTrades)
        const userStats = firestoreService.calculateStats(updatedTrades)
        setStats(userStats)
      })

      const unsubscribeNotes = firestoreService.subscribeToUserNotes(user.uid, (updatedNotes) => {
        setNotes(updatedNotes)
      })

      return () => {
        unsubscribeTrades()
        unsubscribeNotes()
      }
    }
  }, [user, isAuthenticated, loading, navigate])

  const handleExportAll = () => {
    if (!user) return

    if (trades.length === 0 && notes.length === 0) {
      alert('No data to export. Add some trades or notes first!')
      return
    }

    try {
      const json = firestoreService.exportCombinedToJSON(trades, notes)
      firestoreService.downloadExport(
        json,
        `trading-data-export-${new Date().toISOString().split('T')[0]}.json`,
        'json'
      )
      alert(`Successfully exported ${trades.length} trade(s) and ${notes.length} note(s)!`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data. Please try again.')
    }
  }

  const handleExportTradesCSV = () => {
    if (!user || trades.length === 0) {
      alert('No trades to export!')
      return
    }

    try {
      const csv = firestoreService.exportToCSV(trades)
      firestoreService.downloadExport(
        csv,
        `trades-${new Date().toISOString().split('T')[0]}.csv`,
        'csv'
      )
      alert(`Successfully exported ${trades.length} trade(s) to CSV!`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export trades. Please try again.')
    }
  }

  const handleExportNotesCSV = () => {
    if (!user || notes.length === 0) {
      alert('No notes to export!')
      return
    }

    try {
      const csv = firestoreService.exportNotesToCSV(notes)
      firestoreService.downloadExport(
        csv,
        `journal-notes-${new Date().toISOString().split('T')[0]}.csv`,
        'csv'
      )
      alert(`Successfully exported ${notes.length} note(s) to CSV!`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export notes. Please try again.')
    }
  }

  const recentTrades = trades.slice(0, 5)
  const recentNotes = notes.slice(0, 5)

  // Calculate advanced stats for charts
  const advancedStats = trades.length > 0 ? analyticsService.calculateAdvancedStats(trades) : null

  if (loading) {
    return (
      <div className="dashboard">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '1.2rem',
          color: '#6b7280'
        }}>
          Loading...
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="dashboard">
      <TradingBackground variant="home" />

      <div className="dashboard-header">
        <div>
          <h1>Trading Dashboard</h1>
          <p>Your complete trading overview - performance, trades, and insights</p>
        </div>
        <div className="dashboard-actions">
          <button onClick={handleExportTradesCSV} className="action-btn secondary">
            <Download size={18} />
            Export Trades CSV
          </button>
          <button onClick={handleExportNotesCSV} className="action-btn secondary">
            <Download size={18} />
            Export Notes CSV
          </button>
          <button onClick={handleExportAll} className="action-btn primary">
            <Download size={18} />
            Export All Data
          </button>
        </div>
      </div>

      {stats && (
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card total">
            <div className="stat-icon">
              <BarChart3 size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Trades</span>
              <span className="stat-value">{stats.totalTrades}</span>
              <span className="stat-detail">{stats.openTrades} open, {stats.closedTrades} closed</span>
            </div>
          </div>

          <div className="dashboard-stat-card win">
            <div className="stat-icon">
              <Target size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Win Rate</span>
              <span className="stat-value">{stats.winRate.toFixed(1)}%</span>
              <span className="stat-detail">{stats.wins}W / {stats.losses}L</span>
            </div>
          </div>

          <div className={`dashboard-stat-card ${stats.totalProfitLoss >= 0 ? 'profit' : 'loss'}`}>
            <div className="stat-icon">
              <DollarSign size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total P&L</span>
              <span className="stat-value">
                {stats.totalProfitLoss >= 0 ? '+' : ''}${stats.totalProfitLoss.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="dashboard-stat-card notes">
            <div className="stat-icon">
              <BookOpen size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Journal Notes</span>
              <span className="stat-value">{notes.length}</span>
              <span className="stat-detail">{notes.filter(n => n.isPinned).length} pinned</span>
            </div>
          </div>

          {advancedStats && (
            <>
              <div className={`dashboard-stat-card ${advancedStats.expectancy >= 0 ? 'profit' : 'loss'}`}>
                <div className="stat-icon">
                  <TrendingUp size={28} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Expectancy</span>
                  <span className="stat-value">
                    {advancedStats.expectancy >= 0 ? '+' : ''}${advancedStats.expectancy.toFixed(2)}
                  </span>
                  <span className="stat-detail">Per trade average</span>
                </div>
              </div>

              <div className="dashboard-stat-card loss">
                <div className="stat-icon">
                  <TrendingDown size={28} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Max Drawdown</span>
                  <span className="stat-value">{advancedStats.maxDrawdown.toFixed(1)}%</span>
                  <span className="stat-detail">Peak to trough</span>
                </div>
              </div>

              <div className="dashboard-stat-card win">
                <div className="stat-icon">
                  <Target size={28} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Best Streak</span>
                  <span className="stat-value">{advancedStats.longestWinStreak}</span>
                  <span className="stat-detail">Consecutive wins</span>
                </div>
              </div>

              <div className="dashboard-stat-card total">
                <div className="stat-icon">
                  <BarChart3 size={28} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Sharpe Ratio</span>
                  <span className="stat-value">{advancedStats.sharpeRatio.toFixed(2)}</span>
                  <span className="stat-detail">Risk-adjusted return</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Performance Charts Section */}
      {trades.length > 0 && (
        <div className="dashboard-charts-section">
          <PerformanceCharts trades={trades} initialBalance={10000} />
        </div>
      )}

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <TrendingUp size={24} />
              Recent Trades
            </h2>
            <button onClick={() => navigate('/journal')} className="view-all-btn">
              View All
            </button>
          </div>

          {recentTrades.length === 0 ? (
            <div className="empty-state-small">
              <p>No trades yet. Start tracking your trades!</p>
              <button onClick={() => navigate('/journal')} className="action-btn primary">
                Go to Journal
              </button>
            </div>
          ) : (
            <div className="recent-trades-list">
              {recentTrades.map(trade => (
                <div key={trade.id} className={`recent-trade-item ${trade.status} ${trade.outcome}`}>
                  <div className="trade-info">
                    <span className="trade-pair">{trade.pair}</span>
                    <span className={`trade-type ${trade.type}`}>{trade.type.toUpperCase()}</span>
                    <span className="trade-date">{new Date(trade.entryDate).toLocaleDateString()}</span>
                  </div>
                  <div className="trade-result">
                    {trade.status === 'closed' ? (
                      <span className={`pnl ${trade.profitLoss >= 0 ? 'profit' : 'loss'}`}>
                        {trade.profitLoss >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}
                      </span>
                    ) : (
                      <span className="status-badge open">OPEN</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <FileText size={24} />
              Recent Notes
            </h2>
            <button onClick={() => navigate('/journal')} className="view-all-btn">
              View All
            </button>
          </div>

          {recentNotes.length === 0 ? (
            <div className="empty-state-small">
              <p>No notes yet. Start documenting your trading journey!</p>
              <button onClick={() => navigate('/journal')} className="action-btn primary">
                Add Note
              </button>
            </div>
          ) : (
            <div className="recent-notes-list">
              {recentNotes.map(note => (
                <div key={note.id} className="recent-note-item">
                  <div className="note-header">
                    <span className="note-title">{note.title}</span>
                    <span className={`note-category ${note.category}`}>{note.category}</span>
                  </div>
                  <p className="note-preview">
                    {note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}
                  </p>
                  <div className="note-meta">
                    <span className="note-date">{new Date(note.updatedAt).toLocaleDateString()}</span>
                    {note.tags.length > 0 && (
                      <div className="note-tags">
                        {note.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="note-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-quick-actions">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <button onClick={() => navigate('/journal')} className="quick-action-card">
            <TrendingUp size={32} />
            <span>Add Trade</span>
          </button>
          <button onClick={() => navigate('/journal')} className="quick-action-card">
            <FileText size={32} />
            <span>Write Note</span>
          </button>
          <button onClick={() => navigate('/calculator')} className="quick-action-card">
            <BarChart3 size={32} />
            <span>Position Calculator</span>
          </button>
          <button onClick={() => navigate('/market-structure')} className="quick-action-card">
            <PieChart size={32} />
            <span>Market Analysis</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
