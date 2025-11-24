import { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, Pin, Search, Tag, BookOpen,
  Calendar, X, Save
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { firestoreService } from '../services/firestoreService'
import type { JournalNote, Trade } from '../services/firestoreService'
import './PersonalNotes.css'

interface PersonalNotesProps {
  trades?: Trade[]
  compact?: boolean
}

const PersonalNotes = ({ trades = [], compact = false }: PersonalNotesProps) => {
  const { user } = useAuth()
  const [notes, setNotes] = useState<JournalNote[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editingNote, setEditingNote] = useState<JournalNote | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)

  useEffect(() => {
    if (!user?.uid) return

    // Subscribe to real-time notes updates
    const unsubscribe = firestoreService.subscribeToUserNotes(user.uid, (updatedNotes) => {
      setNotes(updatedNotes)
    })

    return () => unsubscribe()
  }, [user])

  const handleAddNote = () => {
    setEditingNote(null)
    setShowNoteModal(true)
  }

  const handleEditNote = (note: JournalNote) => {
    setEditingNote(note)
    setShowNoteModal(true)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return
    if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      try {
        await firestoreService.deleteNote(noteId)
      } catch (error) {
        console.error('Delete error:', error)
        alert('Failed to delete note. Please try again.')
      }
    }
  }

  const handleTogglePin = async (note: JournalNote) => {
    if (!user) return
    try {
      await firestoreService.updateNote(note.id, {
        isPinned: !note.isPinned
      })
    } catch (error) {
      console.error('Pin error:', error)
      alert('Failed to pin/unpin note.')
    }
  }

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = categoryFilter === 'all' || note.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage)
  const indexOfLastNote = currentPage * itemsPerPage
  const indexOfFirstNote = indexOfLastNote - itemsPerPage
  const currentNotes = filteredNotes.slice(indexOfFirstNote, indexOfLastNote)

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, searchTerm])

  const categories = ['all', 'strategy', 'plan', 'idea', 'reflection', 'concept', 'general']

  const categoryStats = {
    all: notes.length,
    strategy: notes.filter(n => n.category === 'strategy').length,
    plan: notes.filter(n => n.category === 'plan').length,
    idea: notes.filter(n => n.category === 'idea').length,
    reflection: notes.filter(n => n.category === 'reflection').length,
    concept: notes.filter(n => n.category === 'concept').length,
    general: notes.filter(n => n.category === 'general').length
  }

  return (
    <div className={`personal-notes ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="notes-header-section">
        <div className="notes-title-group">
          <div className="notes-icon-wrapper">
            <BookOpen size={32} />
          </div>
          <div className="notes-title-content">
            <h2>Personal Journal</h2>
            <p>Capture your trading insights, strategies, and reflections</p>
          </div>
        </div>

        <div className="notes-header-actions">
          <button onClick={handleAddNote} className="add-note-btn-primary">
            <Plus size={20} />
            <span>New Note</span>
          </button>
        </div>
        </div>
      )}

      {compact && (
        <div className="compact-header">
          <h3>Recent Notes</h3>
          <button onClick={handleAddNote} className="add-note-btn-compact">
            <Plus size={18} />
            <span>Add Note</span>
          </button>
        </div>
      )}

      {!compact && (
      <div className="notes-stats-bar">
        <div className="stats-item">
          <span className="stats-label">Total Notes</span>
          <span className="stats-value">{notes.length}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Pinned</span>
          <span className="stats-value pinned">{notes.filter(n => n.isPinned).length}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">This Month</span>
          <span className="stats-value">
            {notes.filter(n => {
              const noteDate = new Date(n.createdAt)
              const now = new Date()
              return noteDate.getMonth() === now.getMonth() && noteDate.getFullYear() === now.getFullYear()
            }).length}
          </span>
        </div>
      </div>
      )}

      {!compact && (
      <div className="notes-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search notes by title, content, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="clear-search">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="category-filters">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-filter ${categoryFilter === cat ? 'active' : ''} ${cat}`}
              onClick={() => setCategoryFilter(cat)}
            >
              <span className="category-name">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
              <span className="category-count">{categoryStats[cat as keyof typeof categoryStats]}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      {filteredNotes.length === 0 ? (
        <div className="notes-empty-state">
          <div className="empty-state-icon">
            <BookOpen size={80} />
          </div>
          <h3>No notes {searchTerm || categoryFilter !== 'all' ? 'found' : 'yet'}</h3>
          {searchTerm || categoryFilter !== 'all' ? (
            <p>Try adjusting your search or filter criteria</p>
          ) : (
            <>
              <p>Start documenting your trading journey with notes, strategies, and insights</p>
              <button onClick={handleAddNote} className="add-note-btn-primary large">
                <Plus size={20} />
                <span>Create Your First Note</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="notes-grid">
            {currentNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages} ({filteredNotes.length} notes)
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {showNoteModal && (
        <NoteModal
          note={editingNote}
          trades={trades}
          onClose={() => {
            setShowNoteModal(false)
            setEditingNote(null)
          }}
          onSave={async (noteData) => {
            if (!user?.uid) return
            try {
              if (editingNote) {
                await firestoreService.updateNote(editingNote.id, noteData)
                alert('Note updated successfully!')
              } else {
                await firestoreService.addNote(user.uid, noteData as Omit<JournalNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>)
                alert('Note created successfully!')
              }
              setShowNoteModal(false)
              setEditingNote(null)
            } catch (error) {
              console.error('Save error:', error)
              alert('Failed to save note. Please try again.')
            }
          }}
        />
      )}
    </div>
  )
}

// Note Card Component
interface NoteCardProps {
  note: JournalNote
  onEdit: (note: JournalNote) => void
  onDelete: (noteId: string) => void
  onTogglePin: (note: JournalNote) => void
}

const NoteCard = ({ note, onEdit, onDelete, onTogglePin }: NoteCardProps) => {
  return (
    <div className={`note-card ${note.category} ${note.isPinned ? 'pinned' : ''}`}>
      {note.isPinned && <div className="pinned-indicator"></div>}

      <div className="note-card-header">
        <div className="note-card-title-row">
          <h3>{note.title}</h3>
          <button
            onClick={() => onTogglePin(note)}
            className={`pin-btn ${note.isPinned ? 'pinned' : ''}`}
            title={note.isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={16} />
          </button>
        </div>
        <span className={`note-card-category ${note.category}`}>
          {note.category}
        </span>
      </div>

      <div className="note-card-content">
        <p>{note.content.substring(0, 200)}{note.content.length > 200 ? '...' : ''}</p>
      </div>

      {note.tags.length > 0 && (
        <div className="note-card-tags">
          <Tag size={14} />
          {note.tags.slice(0, 4).map((tag, idx) => (
            <span key={idx} className="note-card-tag">{tag}</span>
          ))}
          {note.tags.length > 4 && <span className="more-tags">+{note.tags.length - 4}</span>}
        </div>
      )}

      <div className="note-card-footer">
        <div className="note-card-date">
          <Calendar size={14} />
          <span>{new Date(note.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}</span>
        </div>
        <div className="note-card-actions">
          <button onClick={() => onEdit(note)} className="note-action-btn edit" title="Edit">
            <Edit2 size={16} />
          </button>
          <button onClick={() => onDelete(note.id)} className="note-action-btn delete" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Note Modal Component
interface NoteModalProps {
  note: JournalNote | null
  trades: Trade[]
  onClose: () => void
  onSave: (note: Partial<JournalNote>) => void
}

const NoteModal = ({ note, trades, onClose, onSave }: NoteModalProps) => {
  const [formData, setFormData] = useState({
    title: note?.title || '',
    content: note?.content || '',
    category: note?.category || 'general' as 'strategy' | 'plan' | 'idea' | 'reflection' | 'concept' | 'general',
    tags: note?.tags?.join(', ') || '',
    relatedTrades: note?.relatedTrades || [] as string[],
    isPinned: note?.isPinned || false
  })

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      alert('Please enter a title for your note')
      return
    }

    if (!formData.content.trim()) {
      alert('Please enter some content for your note')
      return
    }

    const noteData: Partial<JournalNote> = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      category: formData.category,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      relatedTrades: formData.relatedTrades,
      isPinned: formData.isPinned
    }

    onSave(noteData)
  }

  return (
    <div className="note-modal-overlay" onClick={onClose}>
      <div className="note-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="note-modal-header">
          <div className="modal-title-group">
            <BookOpen size={28} />
            <h2>{note ? 'Edit Note' : 'Create New Note'}</h2>
          </div>
          <button onClick={onClose} className="close-note-modal">×</button>
        </div>

        <form onSubmit={handleSubmit} className="note-form">
          <div className="note-form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a descriptive title for your note..."
              required
              autoFocus
            />
          </div>

          <div className="note-form-group">
            <label>Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as 'strategy' | 'plan' | 'idea' | 'reflection' | 'concept' | 'general' })}
            >
              <option value="strategy">Strategy - Trading approaches and methodologies</option>
              <option value="plan">Plan - Trade planning and preparation</option>
              <option value="idea">Idea - Trading opportunities and setups</option>
              <option value="reflection">Reflection - Performance analysis and lessons</option>
              <option value="concept">Concept - Trading concepts and education</option>
              <option value="general">General - Other notes and thoughts</option>
            </select>
          </div>

          <div className="note-form-group">
            <label>Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={12}
              placeholder="Write your note here...&#10;&#10;You can document:&#10;• Trading strategies and setups&#10;• Market observations and analysis&#10;• Trade ideas and opportunities&#10;• Lessons learned and reflections&#10;• Concepts and educational notes&#10;• Plans and goals"
              required
            />
            <small className="char-count">{formData.content.length} characters</small>
          </div>

          <div className="note-form-group">
            <label>Tags (comma separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="breakout, swing-trade, bullish, fibonacci, etc."
            />
          </div>

          {trades.length > 0 && (
            <div className="note-form-group">
              <label>Related Trades (optional)</label>
              <select
                multiple
                value={formData.relatedTrades}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setFormData({ ...formData, relatedTrades: selected })
                }}
                className="related-trades-select"
              >
                {trades.map(trade => (
                  <option key={trade.id} value={trade.id}>
                    {trade.pair} - {trade.type.toUpperCase()} - {new Date(trade.entryDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <small>Hold Ctrl/Cmd to select multiple trades</small>
            </div>
          )}

          <div className="note-form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
              />
              <Pin size={16} />
              <span>Pin this note to the top</span>
            </label>
          </div>

          <div className="note-modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save size={18} />
              {note ? 'Update Note' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PersonalNotes
