# Traddii

**Free, open-source tools for crypto traders: size positions, read market structure and price action, practise with virtual money, and keep a trading journal.**

[![Deploy](https://github.com/gitslem/traddii/actions/workflows/firebase-deploy.yml/badge.svg)](https://github.com/gitslem/traddii/actions/workflows/firebase-deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Live app:** https://traddii.web.app

> ⚠️ Traddii is an educational tool, not financial advice. Trading crypto is risky; never risk money you can't afford to lose.

## Features

| Page | What it does |
|---|---|
| **Calculator** | Sizes a position so a stop-loss hit loses exactly the amount you chose to risk, including entry and exit fees. Covers 10 exchanges (Binance, Bybit, OKX, Kraken, ...) with spot, futures and margin fees and leverage limits. Shows the liquidation price, multiple take-profits, and a "Practice this trade" hand-off. |
| **Market Structure** | Finds the trend from real swing highs and lows (higher highs and higher lows, and the reverse), and clusters support and resistance from swing points and round numbers. Shows the trend on 15m, 1H, 4H and 1D side by side, plus direction-aware Fibonacci levels. |
| **AI Market Brief** | On the Market page. Shows positioning data (funding rate, open-interest change, long/short account ratio, Fear & Greed), then writes a short bull/bear brief using only that data. Runs on Traddii's free Gemini, or on the user's own model. |
| **Price Action** | Reads the last closed candle: engulfing, harami, inside bar, doji types, hammer and shooting star (depending on the prior trend), marubozu and spinning top. Compares its volume with the 20-candle average, adds nearby levels and higher-timeframe context, and includes a pre-trade checklist. |
| **Practice** | Paper trading with $10,000 of virtual money, using live Bybit prices and real Bybit fees. Supports market and limit orders, take-profit and stop-loss, leverage, and liquidation. Bybit **testnet** accounts can be connected too. |
| **Journal** | Log trades and notes, synced to your account with Google sign-in. Shows win rate, profit factor and streaks, and exports to CSV, JSON, text or PDF. |

Every tool page has a **Guide** button explaining how to use it. Day and night themes are included.

### Bring your own AI model

The AI Market Brief uses Traddii's free Gemini (Firebase AI Logic) by default. Users can switch to their own model from the gear icon:

- **On their computer:** [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai)
- **Online, free tiers:** [OpenRouter](https://openrouter.ai) free models, [Groq](https://console.groq.com), or their own [Google AI Studio](https://aistudio.google.com/apikey) Gemini key
- **Anything else** with an OpenAI-compatible API

Requests go straight from the browser to the chosen provider. Keys are stored only in that browser. If the user's model fails, Traddii falls back to Gemini.

## Tech stack

React 19, TypeScript, Vite 7, Firebase (Hosting, Authentication, Firestore, AI Logic, App Check), and GitHub Actions for CI/CD. Market data comes from the public Binance and Bybit APIs and alternative.me (Fear & Greed). None of them need an API key.

## Getting started

Requirements: **Node.js 20+** and npm.

```bash
git clone https://github.com/gitslem/traddii.git
cd traddii
npm install
cp .env.example .env   # add your Firebase web config (see below)
npm run dev            # http://localhost:5173
```

The Calculator, Market, Price and Practice pages work without signing in. The Journal, sign-in and Traddii Gemini need a Firebase project.

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Run ESLint |
| `npm run preview` | Serve the production build locally |

### Firebase setup

1. Create a project at the [Firebase console](https://console.firebase.google.com/) and add a **web app**. Copy its config values into `.env`.
2. **Authentication:** enable the **Google** sign-in provider.
3. **Firestore:** create a database, then deploy the security rules:
   ```bash
   npx firebase-tools deploy --only firestore:rules --project <your-project-id>
   ```
4. **AI Logic (optional, for the AI Market Brief):** go to AI Logic, then Get started, then choose **Gemini Developer API**. This works on the free Spark plan.
5. **App Check (optional, recommended):** this stops others using your Gemini quota.
   - In Google Cloud **Fraud Defense** (reCAPTCHA), create a score-based **Website** key.
   - Register it under App Check for your web app.
   - Set it as `VITE_RECAPTCHA_SITE_KEY`.
   - For local development, register the debug token that the browser console prints.

### Environment variables

See [`.env.example`](./.env.example). Firebase web config values are public by design; access is controlled by `firestore.rules` and App Check. Never commit `.env`.

| Variable | Required | Purpose |
|---|---|---|
| `VITE_FIREBASE_*` | For sign-in, Journal and AI | Firebase web app config |
| `VITE_GEMINI_MODEL` | No | Gemini model for the AI brief (default `gemini-3.5-flash-lite`) |
| `VITE_RECAPTCHA_SITE_KEY` | No | reCAPTCHA Enterprise key that turns on App Check |

## Deployment

Pushes to `main` build the app and deploy it to Firebase Hosting through GitHub Actions ([`.github/workflows`](./.github/workflows)). Pull requests from branches in this repository get a temporary preview URL.

The workflows need these repository secrets:
- `FIREBASE_SERVICE_ACCOUNT`
- the `VITE_*` values listed above

Firestore rules are deployed by hand with the command above.

## Project structure

```
src/
├── pages/        Route-level pages (Calculator, Market, Price, Practice, Journal, ...)
├── components/   UI components (cards, charts, page guides, AI brief, ...)
├── services/     Market data, pattern and structure detection, paper trading, Firestore
│   └── ai/       AI provider chain, market brief, positioning data
├── context/      Auth and theme providers
├── config/       Firebase and exchange fee/leverage settings
└── styles/       Design tokens for the day and night themes
firestore.rules   Firestore security rules
```

## Key formulas

```
Position size (qty)  = risk amount ÷ (|entry − stop| + (entry + stop) × fee rate)
Margin               = position value ÷ leverage
Risk/reward          = |take profit − entry| ÷ |entry − stop|
Fibonacci level      = swing low + (swing high − swing low) × ratio   (direction-aware)
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md).

To report a security problem, see [SECURITY.md](./SECURITY.md). Please don't open a public issue for it.

## License

[MIT](./LICENSE) © 2025-2026 gitslem

## Disclaimer

This software is provided "as is", without warranty of any kind. Nothing in Traddii, including the AI briefs, is financial advice. The authors are not responsible for trading losses. Always do your own research.
