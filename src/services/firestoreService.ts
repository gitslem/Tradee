import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData
} from 'firebase/firestore'
import { db } from '../config/firebase'

export interface Trade {
  id: string
  userId: string
  pair: string
  type: 'long' | 'short'
  entryPrice: number
  exitPrice?: number | null
  quantity: number
  quantityType: 'base' | 'quote' // 'base' = ETH in ETH/USDT, 'quote' = USDT in ETH/USDT
  entryDate: string
  exitDate?: string | null
  stopLoss?: number | null
  takeProfit?: number | null
  leverage: number
  exchange: string
  status: 'open' | 'closed'
  outcome: 'win' | 'loss' | 'pending'
  profitLoss: number
  profitLossPercent: number
  fees: number
  notes: string
  tags: string[]
  screenshots: string[]
  createdAt: string
  updatedAt: string
}

export interface TradeStats {
  totalTrades: number
  openTrades: number
  closedTrades: number
  wins: number
  losses: number
  winRate: number
  totalProfitLoss: number
  avgWin: number
  avgLoss: number
  largestWin: number
  largestLoss: number
  profitFactor: number
  bestPair: string
  worstPair: string
  bestExchange: string
}

class FirestoreService {
  private collectionName = 'trades'

  // Add a new trade
  async addTrade(userId: string, trade: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const tradeData = {
        ...trade,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const docRef = await addDoc(collection(db, this.collectionName), tradeData)
      return docRef.id
    } catch (error) {
      console.error('Error adding trade:', error)
      throw error
    }
  }

  // Update an existing trade
  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    try {
      const tradeRef = doc(db, this.collectionName, tradeId)
      await updateDoc(tradeRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating trade:', error)
      throw error
    }
  }

  // Delete a trade
  async deleteTrade(tradeId: string): Promise<void> {
    try {
      const tradeRef = doc(db, this.collectionName, tradeId)
      await deleteDoc(tradeRef)
    } catch (error) {
      console.error('Error deleting trade:', error)
      throw error
    }
  }

  // Get all trades for a user
  async getUserTrades(userId: string): Promise<Trade[]> {
    try {
      // Note: Removed orderBy to avoid needing a composite index
      // We'll sort client-side instead
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      )

      const querySnapshot = await getDocs(q)
      const trades = this.convertToTrades(querySnapshot)

      // Sort by createdAt descending (newest first) on the client side
      return trades.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // Descending order
      })
    } catch (error) {
      console.error('Error getting user trades:', error)
      throw error
    }
  }

  // Listen to real-time updates for user trades
  subscribeToUserTrades(userId: string, callback: (trades: Trade[]) => void): () => void {
    // Note: Removed orderBy to avoid needing a composite index
    // We'll sort client-side instead
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId)
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const trades = this.convertToTrades(querySnapshot)
      // Sort by createdAt descending (newest first) on the client side
      const sortedTrades = trades.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // Descending order
      })
      callback(sortedTrades)
    }, (error) => {
      console.error('Error listening to trades:', error)
    })

    return unsubscribe
  }

  // Calculate statistics from trades
  calculateStats(trades: Trade[]): TradeStats {
    const closedTrades = trades.filter(t => t.status === 'closed')
    const wins = closedTrades.filter(t => t.outcome === 'win')
    const losses = closedTrades.filter(t => t.outcome === 'loss')

    const totalProfitLoss = closedTrades.reduce((sum, t) => sum + t.profitLoss, 0)
    const totalWins = wins.reduce((sum, t) => sum + t.profitLoss, 0)
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.profitLoss, 0))

    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0

    const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.profitLoss)) : 0
    const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.profitLoss)) : 0

    // Best pair by total P&L
    const pairStats = new Map<string, number>()
    closedTrades.forEach(t => {
      pairStats.set(t.pair, (pairStats.get(t.pair) || 0) + t.profitLoss)
    })
    const bestPair = pairStats.size > 0
      ? Array.from(pairStats.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : 'N/A'
    const worstPair = pairStats.size > 0
      ? Array.from(pairStats.entries()).sort((a, b) => a[1] - b[1])[0][0]
      : 'N/A'

    // Best exchange by total P&L
    const exchangeStats = new Map<string, number>()
    closedTrades.forEach(t => {
      exchangeStats.set(t.exchange, (exchangeStats.get(t.exchange) || 0) + t.profitLoss)
    })
    const bestExchange = exchangeStats.size > 0
      ? Array.from(exchangeStats.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : 'N/A'

    return {
      totalTrades: trades.length,
      openTrades: trades.filter(t => t.status === 'open').length,
      closedTrades: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      totalProfitLoss,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      profitFactor,
      bestPair,
      worstPair,
      bestExchange
    }
  }

  // Export trades to CSV
  exportToCSV(trades: Trade[]): string {
    const headers = [
      'Date',
      'Pair',
      'Type',
      'Entry Price',
      'Exit Price',
      'Quantity',
      'Quantity Type',
      'Leverage',
      'P&L',
      'P&L %',
      'Fees',
      'Status',
      'Outcome',
      'Exchange',
      'Notes',
      'Tags'
    ].join(',')

    const rows = trades.map(trade => [
      trade.entryDate,
      trade.pair,
      trade.type,
      trade.entryPrice,
      trade.exitPrice || '',
      trade.quantity,
      trade.quantityType,
      trade.leverage,
      trade.profitLoss,
      trade.profitLossPercent,
      trade.fees,
      trade.status,
      trade.outcome,
      trade.exchange,
      `"${trade.notes.replace(/"/g, '""')}"`,
      `"${trade.tags.join(', ')}"`
    ].join(','))

    return [headers, ...rows].join('\n')
  }

  // Export trades to JSON
  exportToJSON(trades: Trade[]): string {
    return JSON.stringify(trades, null, 2)
  }

  // Download export file
  downloadExport(content: string, filename: string, type: 'csv' | 'json'): void {
    const mimeType = type === 'csv' ? 'text/csv' : 'application/json'
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Helper method to convert Firestore documents to Trade objects
  private convertToTrades(querySnapshot: QuerySnapshot<DocumentData>): Trade[] {
    return querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data
      } as Trade
    })
  }
}

export const firestoreService = new FirestoreService()
