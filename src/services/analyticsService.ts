import type { Trade, TradeStats } from './firestoreService';

export interface AdvancedStats extends TradeStats {
  expectancy: number;
  maxDrawdown: number;
  currentDrawdown: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number;
  currentStreakType: 'win' | 'loss' | 'none';
  avgHoldingTime: number; // in hours
  totalFeesId: number;
  roi: number; // Return on investment percentage
  sharpeRatio: number;
}

export interface EquityPoint {
  date: string;
  balance: number;
  pnl: number;
  trades: number;
}

export interface MonthlyPerformance {
  month: string;
  pnl: number;
  trades: number;
  winRate: number;
  wins: number;
  losses: number;
}

export interface WinLossDistribution {
  range: string;
  wins: number;
  losses: number;
}

export interface TimeBasedPerformance {
  hour: number;
  pnl: number;
  trades: number;
  winRate: number;
}

class AnalyticsService {
  /**
   * Calculate advanced statistics including expectancy, drawdown, and streaks
   */
  calculateAdvancedStats(trades: Trade[], initialBalance: number = 10000): AdvancedStats {
    const closedTrades = trades.filter(t => t.status === 'closed').sort((a, b) =>
      new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
    );

    const wins = closedTrades.filter(t => t.outcome === 'win');
    const losses = closedTrades.filter(t => t.outcome === 'loss');

    const totalProfitLoss = closedTrades.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalWins = wins.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.profitLoss, 0));

    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Expectancy: (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
    const lossRate = closedTrades.length > 0 ? (losses.length / closedTrades.length) * 100 : 0;
    const expectancy = (winRate / 100 * avgWin) - (lossRate / 100 * avgLoss);

    // Calculate drawdown
    const { maxDrawdown, currentDrawdown } = this.calculateDrawdown(closedTrades, initialBalance);

    // Calculate streaks
    const { longestWinStreak, longestLossStreak, currentStreak, currentStreakType } =
      this.calculateStreaks(closedTrades);

    // Average holding time (in hours)
    const avgHoldingTime = this.calculateAvgHoldingTime(closedTrades);

    // Total fees
    const totalFees = closedTrades.reduce((sum, t) => sum + (t.fees || 0), 0);

    // ROI
    const roi = initialBalance > 0 ? (totalProfitLoss / initialBalance) * 100 : 0;

    // Sharpe Ratio (simplified - assumes risk-free rate of 0)
    const sharpeRatio = this.calculateSharpeRatio(closedTrades);

    // Best pair and exchange
    const pairStats = new Map<string, number>();
    closedTrades.forEach(t => {
      pairStats.set(t.pair, (pairStats.get(t.pair) || 0) + t.profitLoss);
    });
    const bestPair = pairStats.size > 0
      ? Array.from(pairStats.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : 'N/A';
    const worstPair = pairStats.size > 0
      ? Array.from(pairStats.entries()).sort((a, b) => a[1] - b[1])[0][0]
      : 'N/A';

    const exchangeStats = new Map<string, number>();
    closedTrades.forEach(t => {
      exchangeStats.set(t.exchange, (exchangeStats.get(t.exchange) || 0) + t.profitLoss);
    });
    const bestExchange = exchangeStats.size > 0
      ? Array.from(exchangeStats.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : 'N/A';

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
      largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.profitLoss)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.profitLoss)) : 0,
      profitFactor,
      bestPair,
      worstPair,
      bestExchange,
      expectancy,
      maxDrawdown,
      currentDrawdown,
      longestWinStreak,
      longestLossStreak,
      currentStreak,
      currentStreakType,
      avgHoldingTime,
      totalFeesId: totalFees,
      roi,
      sharpeRatio
    };
  }

  /**
   * Calculate maximum and current drawdown
   */
  private calculateDrawdown(trades: Trade[], initialBalance: number): {
    maxDrawdown: number;
    currentDrawdown: number;
  } {
    let balance = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;
    let currentDrawdown = 0;

    trades.forEach(trade => {
      balance += trade.profitLoss;

      if (balance > peak) {
        peak = balance;
      }

      const drawdown = ((peak - balance) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });

    currentDrawdown = ((peak - balance) / peak) * 100;

    return { maxDrawdown, currentDrawdown };
  }

  /**
   * Calculate winning and losing streaks
   */
  private calculateStreaks(trades: Trade[]): {
    longestWinStreak: number;
    longestLossStreak: number;
    currentStreak: number;
    currentStreakType: 'win' | 'loss' | 'none';
  } {
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentStreak = 0;
    let currentStreakType: 'win' | 'loss' | 'none' = 'none';

    let tempWinStreak = 0;
    let tempLossStreak = 0;

    trades.forEach((trade, index) => {
      if (trade.outcome === 'win') {
        tempWinStreak++;
        tempLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);

        if (index === trades.length - 1) {
          currentStreak = tempWinStreak;
          currentStreakType = 'win';
        }
      } else if (trade.outcome === 'loss') {
        tempLossStreak++;
        tempWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak);

        if (index === trades.length - 1) {
          currentStreak = tempLossStreak;
          currentStreakType = 'loss';
        }
      }
    });

    return { longestWinStreak, longestLossStreak, currentStreak, currentStreakType };
  }

  /**
   * Calculate average holding time in hours
   */
  private calculateAvgHoldingTime(trades: Trade[]): number {
    const tradesWithExit = trades.filter(t => t.exitDate);

    if (tradesWithExit.length === 0) return 0;

    const totalHours = tradesWithExit.reduce((sum, trade) => {
      const entry = new Date(trade.entryDate);
      const exit = new Date(trade.exitDate!);
      const hours = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return totalHours / tradesWithExit.length;
  }

  /**
   * Calculate Sharpe Ratio (simplified)
   */
  private calculateSharpeRatio(trades: Trade[]): number {
    if (trades.length < 2) return 0;

    const returns = trades.map(t => t.profitLossPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate standard deviation
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Generate equity curve data
   */
  generateEquityCurve(trades: Trade[], initialBalance: number = 10000): EquityPoint[] {
    const closedTrades = trades
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());

    const equityCurve: EquityPoint[] = [
      {
        date: 'Start',
        balance: initialBalance,
        pnl: 0,
        trades: 0
      }
    ];

    let runningBalance = initialBalance;

    closedTrades.forEach((trade, index) => {
      runningBalance += trade.profitLoss;

      equityCurve.push({
        date: new Date(trade.exitDate || trade.entryDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        balance: runningBalance,
        pnl: trade.profitLoss,
        trades: index + 1
      });
    });

    return equityCurve;
  }

  /**
   * Generate monthly performance data
   */
  generateMonthlyPerformance(trades: Trade[]): MonthlyPerformance[] {
    const closedTrades = trades.filter(t => t.status === 'closed');
    const monthlyData = new Map<string, { trades: Trade[], pnl: number }>();

    closedTrades.forEach(trade => {
      const date = new Date(trade.exitDate || trade.entryDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { trades: [], pnl: 0 });
      }

      const month = monthlyData.get(monthKey)!;
      month.trades.push(trade);
      month.pnl += trade.profitLoss;
    });

    return Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, data]) => {
        const wins = data.trades.filter(t => t.outcome === 'win').length;
        const losses = data.trades.filter(t => t.outcome === 'loss').length;
        const winRate = data.trades.length > 0 ? (wins / data.trades.length) * 100 : 0;

        return {
          month: new Date(monthKey + '-01').toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          }),
          pnl: data.pnl,
          trades: data.trades.length,
          winRate,
          wins,
          losses
        };
      });
  }

  /**
   * Generate win/loss distribution data
   */
  generateWinLossDistribution(trades: Trade[]): WinLossDistribution[] {
    const closedTrades = trades.filter(t => t.status === 'closed');

    const ranges = [
      { min: -Infinity, max: -1000, label: '< -$1000' },
      { min: -1000, max: -500, label: '-$1000 to -$500' },
      { min: -500, max: -100, label: '-$500 to -$100' },
      { min: -100, max: 0, label: '-$100 to $0' },
      { min: 0, max: 100, label: '$0 to $100' },
      { min: 100, max: 500, label: '$100 to $500' },
      { min: 500, max: 1000, label: '$500 to $1000' },
      { min: 1000, max: Infinity, label: '> $1000' }
    ];

    return ranges.map(range => {
      const tradesInRange = closedTrades.filter(t =>
        t.profitLoss >= range.min && t.profitLoss < range.max
      );

      const wins = tradesInRange.filter(t => t.outcome === 'win').length;
      const losses = tradesInRange.filter(t => t.outcome === 'loss').length;

      return {
        range: range.label,
        wins,
        losses
      };
    }).filter(d => d.wins > 0 || d.losses > 0); // Only include ranges with data
  }

  /**
   * Generate time-based performance (by hour of day)
   */
  generateTimeBasedPerformance(trades: Trade[]): TimeBasedPerformance[] {
    const closedTrades = trades.filter(t => t.status === 'closed');
    const hourlyData = new Map<number, Trade[]>();

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.set(hour, []);
    }

    closedTrades.forEach(trade => {
      const hour = new Date(trade.entryDate).getHours();
      hourlyData.get(hour)!.push(trade);
    });

    return Array.from(hourlyData.entries())
      .map(([hour, hourTrades]) => {
        const pnl = hourTrades.reduce((sum, t) => sum + t.profitLoss, 0);
        const wins = hourTrades.filter(t => t.outcome === 'win').length;
        const winRate = hourTrades.length > 0 ? (wins / hourTrades.length) * 100 : 0;

        return {
          hour,
          pnl,
          trades: hourTrades.length,
          winRate
        };
      })
      .filter(d => d.trades > 0); // Only include hours with trades
  }

  /**
   * Filter trades by date range
   */
  filterTradesByDateRange(trades: Trade[], startDate: string, endDate: string): Trade[] {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return trades.filter(trade => {
      const tradeDate = new Date(trade.exitDate || trade.entryDate);
      return tradeDate >= start && tradeDate <= end;
    });
  }
}

export const analyticsService = new AnalyticsService();
