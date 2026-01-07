import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import type { Trade } from '../services/firestoreService';
import { analyticsService } from '../services/analyticsService';
import './PerformanceCharts.css';

interface PerformanceChartsProps {
  trades: Trade[];
  initialBalance?: number;
}

type ChartType = 'equity' | 'monthly' | 'distribution' | 'time';

const PerformanceCharts = ({ trades, initialBalance = 10000 }: PerformanceChartsProps) => {
  const [activeChart, setActiveChart] = useState<ChartType>('equity');

  // Generate chart data
  const equityData = analyticsService.generateEquityCurve(trades, initialBalance);
  const monthlyData = analyticsService.generateMonthlyPerformance(trades);
  const distributionData = analyticsService.generateWinLossDistribution(trades);
  const timeData = analyticsService.generateTimeBasedPerformance(trades);

  // Custom tooltip for equity curve
  const EquityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="custom-tooltip__label">{payload[0].payload.date}</p>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Balance:</span>
            <span className="custom-tooltip__item-value custom-tooltip__item-value--neutral">
              ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Trades:</span>
            <span className="custom-tooltip__item-value">{payload[0].payload.trades}</span>
          </div>
          {payload[0].payload.pnl !== 0 && (
            <div className="custom-tooltip__item">
              <span className="custom-tooltip__item-label">P&L:</span>
              <span className={`custom-tooltip__item-value ${payload[0].payload.pnl >= 0 ? 'custom-tooltip__item-value--positive' : 'custom-tooltip__item-value--negative'}`}>
                {payload[0].payload.pnl >= 0 ? '+' : ''}${payload[0].payload.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for monthly performance
  const MonthlyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="custom-tooltip__label">{payload[0].payload.month}</p>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">P&L:</span>
            <span className={`custom-tooltip__item-value ${payload[0].value >= 0 ? 'custom-tooltip__item-value--positive' : 'custom-tooltip__item-value--negative'}`}>
              {payload[0].value >= 0 ? '+' : ''}${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Trades:</span>
            <span className="custom-tooltip__item-value">{payload[0].payload.trades}</span>
          </div>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Win Rate:</span>
            <span className="custom-tooltip__item-value">{payload[0].payload.winRate.toFixed(1)}%</span>
          </div>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Wins:</span>
            <span className="custom-tooltip__item-value custom-tooltip__item-value--positive">{payload[0].payload.wins}</span>
          </div>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Losses:</span>
            <span className="custom-tooltip__item-value custom-tooltip__item-value--negative">{payload[0].payload.losses}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for distribution
  const DistributionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = payload[0].value + payload[1].value;
      return (
        <div className="custom-tooltip">
          <p className="custom-tooltip__label">{payload[0].payload.range}</p>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Wins:</span>
            <span className="custom-tooltip__item-value custom-tooltip__item-value--positive">{payload[0].value}</span>
          </div>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Losses:</span>
            <span className="custom-tooltip__item-value custom-tooltip__item-value--negative">{payload[1].value}</span>
          </div>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Total:</span>
            <span className="custom-tooltip__item-value">{total} trades</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for time-based
  const TimeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const hour = payload[0].payload.hour;
      const timeStr = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
      return (
        <div className="custom-tooltip">
          <p className="custom-tooltip__label">{timeStr}</p>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">P&L:</span>
            <span className={`custom-tooltip__item-value ${payload[0].value >= 0 ? 'custom-tooltip__item-value--positive' : 'custom-tooltip__item-value--negative'}`}>
              {payload[0].value >= 0 ? '+' : ''}${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Trades:</span>
            <span className="custom-tooltip__item-value">{payload[0].payload.trades}</span>
          </div>
          <div className="custom-tooltip__item">
            <span className="custom-tooltip__item-label">Win Rate:</span>
            <span className="custom-tooltip__item-value">{payload[0].payload.winRate.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (trades.length === 0) {
    return (
      <div className="performance-charts">
        <div className="empty-state">
          <div className="empty-state__icon">📊</div>
          <h3 className="empty-state__title">No Trading Data Yet</h3>
          <p className="empty-state__message">Start adding trades to see beautiful performance analytics and charts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-charts">
      <div className="performance-charts__header">
        <h1 className="performance-charts__title">Performance Analytics</h1>
        <p className="performance-charts__subtitle">Visualize your trading performance with advanced analytics</p>
      </div>

      <div className="chart-selector">
        <button
          className={`chart-selector__button ${activeChart === 'equity' ? 'chart-selector__button--active' : ''}`}
          onClick={() => setActiveChart('equity')}
        >
          📈 Equity Curve
        </button>
        <button
          className={`chart-selector__button ${activeChart === 'monthly' ? 'chart-selector__button--active' : ''}`}
          onClick={() => setActiveChart('monthly')}
        >
          📊 Monthly P&L
        </button>
        <button
          className={`chart-selector__button ${activeChart === 'distribution' ? 'chart-selector__button--active' : ''}`}
          onClick={() => setActiveChart('distribution')}
        >
          📉 Win/Loss Distribution
        </button>
        <button
          className={`chart-selector__button ${activeChart === 'time' ? 'chart-selector__button--active' : ''}`}
          onClick={() => setActiveChart('time')}
        >
          🕐 Time Analysis
        </button>
      </div>

      <div className="chart-container">
        {activeChart === 'equity' && (
          <>
            <div className="chart-container__header">
              <h2 className="chart-container__title">Equity Curve</h2>
              <p className="chart-container__description">Track your account balance growth over time</p>
            </div>
            <div className="chart-container__content">
              <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-text-secondary)"
                  style={{ fontSize: '0.875rem' }}
                />
                <YAxis
                  stroke="var(--color-text-secondary)"
                  style={{ fontSize: '0.875rem' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip content={<EquityTooltip />} />
                <ReferenceLine y={initialBalance} stroke="var(--color-text-tertiary)" strokeDasharray="5 5" label="Start" />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                />
              </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeChart === 'monthly' && (
          <>
            <div className="chart-container__header">
              <h2 className="chart-container__title">Monthly Performance</h2>
              <p className="chart-container__description">Compare your monthly profit and loss</p>
            </div>
            <div className="chart-container__content">
              <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  stroke="var(--color-text-secondary)"
                  style={{ fontSize: '0.875rem' }}
                />
                <YAxis
                  stroke="var(--color-text-secondary)"
                  style={{ fontSize: '0.875rem' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip content={<MonthlyTooltip />} />
                <ReferenceLine y={0} stroke="var(--color-text-tertiary)" />
                <Bar
                  dataKey="pnl"
                  fill="var(--color-primary)"
                  radius={[8, 8, 0, 0]}
                >
                  {monthlyData.map((entry, index) => (
                    <Bar
                      key={`bar-${index}`}
                      fill={entry.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                    />
                  ))}
                </Bar>
              </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeChart === 'distribution' && (
          <>
            <div className="chart-container__header">
              <h2 className="chart-container__title">Win/Loss Distribution</h2>
              <p className="chart-container__description">Analyze the size distribution of your wins and losses</p>
            </div>
            <div className="chart-container__content">
              <ResponsiveContainer width="100%" height={400}>
              <BarChart data={distributionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  stroke="var(--color-text-secondary)"
                  style={{ fontSize: '0.875rem' }}
                />
                <YAxis
                  type="category"
                  dataKey="range"
                  stroke="var(--color-text-secondary)"
                  style={{ fontSize: '0.875rem' }}
                  width={150}
                />
                <Tooltip content={<DistributionTooltip />} />
                <Legend />
                <Bar dataKey="wins" fill="var(--color-success)" name="Wins" radius={[0, 4, 4, 0]} />
                <Bar dataKey="losses" fill="var(--color-danger)" name="Losses" radius={[0, 4, 4, 0]} />
              </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeChart === 'time' && (
          <>
            <div className="chart-container__header">
              <h2 className="chart-container__title">Performance by Time of Day</h2>
              <p className="chart-container__description">Identify your best trading hours</p>
            </div>
            <div className="chart-container__content">
              <ResponsiveContainer width="100%" height={400}>
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="hour"
                  stroke="var(--color-text-secondary)"
                  style={{ fontSize: '0.875rem' }}
                  tickFormatter={(hour) => `${hour.toString().padStart(2, '0')}:00`}
                />
                <YAxis
                  stroke="var(--color-text-secondary)"
                  style={{ fontSize: '0.875rem' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip content={<TimeTooltip />} />
                <ReferenceLine y={0} stroke="var(--color-text-tertiary)" />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-primary)', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PerformanceCharts;
