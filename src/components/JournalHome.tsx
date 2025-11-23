import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, TrendingUp, BarChart3, User, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { firestoreService } from '../services/firestoreService'
import type { Trade, JournalNote } from '../services/firestoreService'
import TradingJournal from './TradingJournal'
import PersonalNotes from './PersonalNotes'
import './JournalHome.css'

const JournalHome = () => {
  const { user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'notes'>('overview')
  const [trades, setTrades] = useState<Trade[]>([])
  const [notes, setNotes] = useState<JournalNote[]>([])

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (user?.uid) {
      // Subscribe to notes for stats
      const unsubscribe = firestoreService.subscribeToUserNotes(user.uid, (updatedNotes) => {
        setNotes(updatedNotes)
      })
      return () => unsubscribe()
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
        `complete-journal-${new Date().toISOString().split('T')[0]}.json`,
        'json'
      )
      alert(`Successfully exported ${trades.length} trade(s) and ${notes.length} note(s)!`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="journal-home">
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
    <div className="journal-home">
      <div className="journal-home-header">
        <div className="profile-section">
          <div className="profile-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} />
            ) : (
              <User size={40} />
            )}
          </div>
          <div className="profile-info">
            <h1>Welcome back, {user?.displayName?.split(' ')[0] || 'Trader'}</h1>
            <p>Track your trades, document strategies, and grow your trading journal</p>
          </div>
        </div>

        <button onClick={handleExportAll} className="export-all-btn" disabled={trades.length === 0 && notes.length === 0}>
          <Download size={20} />
          <span>Export Everything</span>
        </button>
      </div>

      <div className="journal-tabs">
        <button
          className={`journal-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={20} />
          <span>Overview</span>
        </button>
        <button
          className={`journal-tab ${activeTab === 'trades' ? 'active' : ''}`}
          onClick={() => setActiveTab('trades')}
        >
          <TrendingUp size={20} />
          <span>Trades</span>
        </button>
        <button
          className={`journal-tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <BookOpen size={20} />
          <span>Notes</span>
        </button>
      </div>

      <div className="journal-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <TradingJournal
              onTradesUpdate={setTrades}
              compact={true}
            />
            <PersonalNotes
              trades={trades}
              compact={true}
            />
          </div>
        )}

        {activeTab === 'trades' && (
          <TradingJournal
            onTradesUpdate={setTrades}
            compact={false}
          />
        )}

        {activeTab === 'notes' && (
          <PersonalNotes
            trades={trades}
            compact={false}
          />
        )}
      </div>
    </div>
  )
}

export default JournalHome
