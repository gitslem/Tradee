# Traddii - Crypto Trading Platform

A comprehensive web-based trading tool for cryptocurrency traders to calculate position sizes, manage risk, analyze market structure and price action, and track trading performance with a cloud-based trading journal.

## Features

### 1. Trading Journal (New!)
- **Google Sign-In Authentication**: Secure login with your Google account
- **Cloud-Based Storage**: All trades saved to Firebase Firestore
- **Real-time Sync**: Trades automatically sync across devices
- **Trade Management**:
  - Add, edit, and delete trades
  - Track entry/exit prices, quantity, and leverage
  - Support for both base and quote currency quantities
  - Open and closed trade tracking
- **Performance Analytics**:
  - Total P&L (Profit & Loss)
  - Win rate percentage
  - Profit factor calculation
  - Best performing trading pairs
  - Open trades monitoring
- **Data Export**:
  - Export to CSV format
  - Export to JSON format
  - Download trading history anytime
- **Multi-Exchange Support**: Binance, Bybit, OKX, and more

### 2. Position Calculator
- **Risk Management Calculations**:
  - Stop-Loss % Distance = |Entry Price – Stop Price| ÷ Entry Price
  - Risk Amount = Account Balance × Risk % per Trade
  - Position Size = (Account Balance × Risk % per Trade) ÷ Stop Loss % Distance
- **Support for Multiple Crypto Pairs**: BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT, and more
- **Long & Short Positions**: Calculate for both buy and sell positions
- **Risk/Reward Ratio**: Automatic R:R calculation with recommendations
- **Position Validation**: Smart warnings for improper stop loss and take profit levels
- **Real-time Calculations**: Instant updates as you adjust parameters

### 3. Market Structure Analysis
- **Trend Detection**:
  - Higher Highs & Higher Lows (Uptrend)
  - Lower Highs & Lower Lows (Downtrend)
  - Range-bound market identification
- **Fibonacci Retracement Levels**: Automatic calculation of key Fib levels (23.6%, 38.2%, 50%, 61.8%, 78.6%)
- **Support & Resistance Levels**:
  - Add multiple S/R levels
  - Mark strength (weak, moderate, strong)
  - Track number of touches
- **Range Position Indicator**: Visual representation of current price within range
- **Trading Suggestions**: Context-aware recommendations based on market structure

### 4. Price Action Analysis
- **Candlestick Pattern Recognition**:
  - Doji (indecision)
  - Marubozu (strong momentum)
  - Hammer/Hanging Man (reversal patterns)
  - Shooting Star/Inverted Hammer
  - Spinning Top (volatility/indecision)
  - Engulfing patterns
- **Volume Analysis**:
  - Volume change percentage
  - Volume confirmation for price moves
  - Conviction analysis
- **Visual Candle Representation**: See body and wick percentages
- **Entry Signal Generation**: Combined price action and volume signals
- **Pre-Trade Checklist**: Essential checks before entering a trade
- **Multiple Timeframe Support**: 1M, 5M, 15M, 30M, 1H, 4H, 1D, 1W

## Installation

### Prerequisites

- Node.js 20+ installed
- Firebase account (for authentication and database)
- Google account (for user sign-in)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/gitslem/Tradee.git
cd Tradee

# Install dependencies
npm install

# Configure Firebase
cp .env.example .env
# Edit .env with your Firebase credentials

# Run development server
npm run dev

# Build for production
npm run build
```

### Firebase Setup

Steps:
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Google Authentication
3. Create a Firestore database
4. Copy Firebase config to `.env` file
5. Deploy the security rules and site with `npm run firebase:deploy`

## Usage

1. **Trading Journal**:
   - Click "Login" and sign in with your Google account
   - Add trades with detailed information (pair, entry/exit, quantity, leverage)
   - Track your performance with real-time statistics
   - Export your trading history to CSV or JSON
   - Access your trades from any device

2. **Position Calculator Tab**:
   - Enter your account balance
   - Set your risk percentage (recommended: 1-2%)
   - Input entry price, stop loss, and take profit
   - View calculated position size and risk details

3. **Market Structure Tab**:
   - Input current price and recent highs/lows
   - Add support and resistance levels
   - Analyze trend direction and Fibonacci levels
   - Get trading suggestions based on market structure

4. **Price Action Tab**:
   - Enter candlestick OHLC data
   - Input volume information
   - Get pattern recognition and signals
   - Review pre-trade checklist

## Risk Warning

⚠️ **Trading cryptocurrencies carries significant risk. This tool is for educational purposes only.**

- Always use proper risk management
- Never risk more than you can afford to lose
- Do your own research before making any trades
- Past performance does not guarantee future results
- Consider consulting with a financial advisor

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Custom CSS with gradient themes
- **State Management**: React Context API + Hooks
- **Authentication**: Firebase Authentication (Google OAuth)
- **Database**: Cloud Firestore (NoSQL)
- **Hosting**: Firebase Hosting
- **CI/CD**: GitHub Actions

## Project Structure

```
├── public/                 Static assets (logos, favicon, web manifest)
├── src/
│   ├── pages/              Route-level pages (calculator, market, price action, journal, ...)
│   ├── components/         Reusable UI (navigation, footer, cards, backgrounds, ...)
│   ├── context/            React context providers (auth, day/night theme)
│   ├── services/           Exchange APIs, Firestore and paper-trading logic
│   ├── config/             Firebase and exchange configuration
│   └── styles/             Design tokens (colors, spacing, day/night themes)
├── firestore.rules         Firestore security rules
├── firebase.json           Firebase Hosting configuration
└── .github/workflows/      Deploy to Firebase on push to main, previews on PRs
```

## Key Calculations

### Position Sizing
```
Stop-Loss % Distance = |Entry Price – Stop Price| ÷ Entry Price
Risk Amount = Account Balance × Risk % per Trade
Position Size = Risk Amount ÷ Stop Loss % Distance
```

### Risk/Reward Ratio
```
R:R = |Take Profit - Entry Price| ÷ |Entry Price - Stop Loss|
```

### Fibonacci Levels
```
Fib Level = Low + (High - Low) × Fibonacci %
```

## Deployment

### Firebase Hosting

```bash
# Build and deploy to Firebase
npm run firebase:deploy

# Preview deployment locally
npm run firebase:preview
```

### GitHub Actions

Automatic deployment is configured via GitHub Actions:
- **Production**: Pushes to `main` branch automatically deploy to Firebase
- **Preview**: Pull requests create temporary preview deployments

See [.github/workflows/](./.github/workflows/) for workflow configurations.

## Best Practices

1. **Trading Journal**:
   - Log every trade immediately after execution
   - Include detailed notes about strategy and market conditions
   - Review performance weekly to identify patterns
   - Use tags to categorize trades by strategy

2. **Risk Management**:
   - Keep risk per trade at 1-2% of account balance
   - Always use stop losses
   - Aim for minimum 1:2 risk/reward ratio

3. **Market Structure**:
   - Trade in the direction of the trend
   - Wait for confirmations at key levels
   - Use higher timeframe structure for context

4. **Price Action**:
   - Confirm patterns with volume
   - Multiple timeframe analysis
   - Wait for clear signals before entering

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License. See [LICENSE](./LICENSE).

## Disclaimer

This software is provided "as is" without warranty of any kind. The authors are not responsible for any trading losses incurred while using this tool. Always do your own research and trade responsibly.
