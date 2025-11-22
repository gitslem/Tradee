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
  Timestamp,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Trade {
  id?: string;
  userId: string;
  pair: string;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  side: 'long' | 'short';
  entryDate: string;
  exitDate: string;
  pnl: number;
  pnlPercent: number;
  fees: number;
  notes: string;
  tags: string[];
  strategy: string;
  exchange: string;
  timeframe: string;
  riskRewardRatio: number;
  stopLoss: number;
  takeProfit: number;
  createdAt: Date;
  updatedAt: Date;
}

class FirestoreService {
  private collectionName = 'trades';

  // Add a new trade
  async addTrade(userId: string, trade: Omit<Trade, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const tradeData = {
        ...trade,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, this.collectionName), tradeData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding trade:', error);
      throw error;
    }
  }

  // Update an existing trade
  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    try {
      const tradeRef = doc(db, this.collectionName, tradeId);
      await updateDoc(tradeRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating trade:', error);
      throw error;
    }
  }

  // Delete a trade
  async deleteTrade(tradeId: string): Promise<void> {
    try {
      const tradeRef = doc(db, this.collectionName, tradeId);
      await deleteDoc(tradeRef);
    } catch (error) {
      console.error('Error deleting trade:', error);
      throw error;
    }
  }

  // Get all trades for a user
  async getUserTrades(userId: string): Promise<Trade[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('entryDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return this.convertToTrades(querySnapshot);
    } catch (error) {
      console.error('Error getting user trades:', error);
      throw error;
    }
  }

  // Listen to real-time updates for user trades
  subscribeToUserTrades(userId: string, callback: (trades: Trade[]) => void): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      orderBy('entryDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const trades = this.convertToTrades(querySnapshot);
      callback(trades);
    }, (error) => {
      console.error('Error listening to trades:', error);
    });

    return unsubscribe;
  }

  // Get trades by date range
  async getTradesByDateRange(userId: string, startDate: string, endDate: string): Promise<Trade[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('entryDate', '>=', startDate),
        where('entryDate', '<=', endDate),
        orderBy('entryDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return this.convertToTrades(querySnapshot);
    } catch (error) {
      console.error('Error getting trades by date range:', error);
      throw error;
    }
  }

  // Export trades to CSV
  exportToCSV(trades: Trade[]): string {
    const headers = [
      'Date',
      'Pair',
      'Side',
      'Entry Price',
      'Exit Price',
      'Position Size',
      'PnL',
      'PnL %',
      'Fees',
      'R:R Ratio',
      'Strategy',
      'Exchange',
      'Notes'
    ].join(',');

    const rows = trades.map(trade => [
      trade.entryDate,
      trade.pair,
      trade.side,
      trade.entryPrice,
      trade.exitPrice,
      trade.positionSize,
      trade.pnl,
      trade.pnlPercent,
      trade.fees,
      trade.riskRewardRatio,
      trade.strategy,
      trade.exchange,
      `"${trade.notes.replace(/"/g, '""')}"`
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  // Export trades to JSON
  exportToJSON(trades: Trade[]): string {
    return JSON.stringify(trades, null, 2);
  }

  // Download export file
  downloadExport(content: string, filename: string, type: 'csv' | 'json'): void {
    const mimeType = type === 'csv' ? 'text/csv' : 'application/json';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Helper method to convert Firestore documents to Trade objects
  private convertToTrades(querySnapshot: QuerySnapshot<DocumentData>): Trade[] {
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Trade;
    });
  }
}

export default new FirestoreService();
