import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Download, TrendingUp, TrendingDown, BookOpen,
  Calendar, DollarSign, X, Pin, List, Grid, Plus,
  FileText, FileJson, FileSpreadsheet, File
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { firestoreService } from '../services/firestoreService'
import type { Trade, JournalNote } from '../services/firestoreService'
import TradingJournal from './TradingJournal'
import PersonalNotes from './PersonalNotes'
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
      let dataToExport: any
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
        // Export based on type
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
          // Handle text export manually since downloadExport only supports csv and json
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
          <h2>Export Journal Data</h2>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="export-modal-body">
          <div className="export-section">
            <h3>What to Export</h3>
            <div className="export-type-buttons">
              <button
                className={`export-type-btn ${exportType === 'all' ? 'active' : ''}`}
                onClick={() => { setExportType('all'); setShowItemSelection(false) }}
              >
                All Data ({trades.length} trades + {notes.length} notes)
              </button>
              <button
                className={`export-type-btn ${exportType === 'trades' ? 'active' : ''}`}
                onClick={() => { setExportType('trades'); setShowItemSelection(false) }}
              >
                All Trades ({trades.length})
              </button>
              <button
                className={`export-type-btn ${exportType === 'notes' ? 'active' : ''}`}
                onClick={() => { setExportType('notes'); setShowItemSelection(false) }}
              >
                All Notes ({notes.length})
              </button>
              <button
                className={`export-type-btn ${showItemSelection ? 'active' : ''}`}
                onClick={() => setShowItemSelection(!showItemSelection)}
              >
                Select Individual Items
              </button>
            </div>
          </div>

          {showItemSelection && (
            <div className="export-section">
              <h3>Select Items ({selectedItems.size} selected)</h3>
              <div className="item-selection-list">
                {trades.length > 0 && (
                  <div className="item-group">
                    <h4>Trades</h4>
                    {trades.map(trade => (
                      <label key={trade.id} className="item-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(trade.id)}
                          onChange={() => toggleItemSelection(trade.id)}
                        />
                        <span>{trade.pair} - {trade.type.toUpperCase()} - ${trade.profitLoss.toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                )}
                {notes.length > 0 && (
                  <div className="item-group">
                    <h4>Notes</h4>
                    {notes.map(note => (
                      <label key={note.id} className="item-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(note.id)}
                          onChange={() => toggleItemSelection(note.id)}
                        />
                        <span>{note.title}</span>
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
                <FileJson size={20} />
                <span>JSON</span>
              </button>
              <button
                className={`format-btn ${exportFormat === 'csv' ? 'active' : ''}`}
                onClick={() => setExportFormat('csv')}
              >
                <FileSpreadsheet size={20} />
                <span>CSV</span>
              </button>
              <button
                className={`format-btn ${exportFormat === 'txt' ? 'active' : ''}`}
                onClick={() => setExportFormat('txt')}
              >
                <FileText size={20} />
                <span>Text</span>
              </button>
              <button
                className={`format-btn ${exportFormat === 'pdf' ? 'active' : ''}`}
                onClick={() => setExportFormat('pdf')}
                disabled
                title="Coming soon"
              >
                <File size={20} />
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
            <span>Export</span>
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
          <h2>Trade Details</h2>
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

  if (loading) {
    return (
      <div className="journal-home">
        <div className="loading-container">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const recentTrades = trades.slice(0, 10)
  const recentNotes = notes.slice(0, 10)

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
            <p>Your trading journal - {trades.length} trades, {notes.length} notes</p>
          </div>
        </div>

        <button
          onClick={() => setShowExportModal(true)}
          className="export-all-btn"
          disabled={trades.length === 0 && notes.length === 0}
        >
          <Download size={20} />
          <span>Export</span>
        </button>
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
                title="Add new trade"
              >
                <Plus size={18} />
                <span>Add Trade</span>
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
              {recentTrades.length === 0 ? (
                <div className="empty-state">
                  <TrendingUp size={48} />
                  <p>No trades yet. Start tracking your performance!</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {recentTrades.map(trade => (
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
                      </div>
                    </div>
                  ))}
                </div>
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
                title="Add new note"
              >
                <Plus size={18} />
                <span>Add Note</span>
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
              {recentNotes.length === 0 ? (
                <div className="empty-state">
                  <BookOpen size={48} />
                  <p>No notes yet. Document your strategies and insights!</p>
                </div>
              ) : (
                <div className="cards-grid">
                  {recentNotes.map(note => (
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
