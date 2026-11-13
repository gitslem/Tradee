export interface PageGuideContent {
  title: string
  intro: string
  sections: { heading: string; items: string[] }[]
  tip?: string
}

export type GuideKey = 'calculator' | 'market' | 'price' | 'practice' | 'journal'

export const PAGE_GUIDES: Record<GuideKey, PageGuideContent> = {
  calculator: {
    title: 'Position Calculator',
    intro: 'Work out how big a position to open so that, if your stop loss is hit, you lose only the amount you chose to risk - fees included.',
    sections: [
      {
        heading: 'How to use it',
        items: [
          'Pick your exchange and account type (Spot, Futures or Margin). Fees and maximum leverage follow your choice.',
          'Enter your account balance and the % you are willing to risk on this trade. 1% or less is a common guideline.',
          'Enter the entry, stop loss and take profit prices, or press "Use as Entry Price" on the live price card.',
          'Optional: turn on leverage, and add a second and third take profit under "Multiple Take Profits".'
        ]
      },
      {
        heading: 'Reading the results',
        items: [
          'Position Size is the total value of the trade; the coin amount is shown underneath.',
          'Risk Amount is what you lose at the stop, including entry and exit fees.',
          'Leverage only lowers the margin you put up - it does not change the position size or your risk.',
          'The liquidation price must be beyond your stop. The page warns you if it is not.'
        ]
      }
    ],
    tip: '"Practice this trade" opens the setup on the Practice page. Your balance, risk and exchange settings are remembered on this device.'
  },

  market: {
    title: 'Market Structure',
    intro: 'See the trend and the key price levels for a coin, worked out from real swing highs and lows in recent candles.',
    sections: [
      {
        heading: 'What you see',
        items: [
          'Trend: an uptrend means a higher high and a higher low between the last two swings; a downtrend is the opposite.',
          'Multi-Timeframe Structure shows the trend on 15m, 1H, 4H and 1D side by side.',
          'Support and resistance are prices where the market turned before. "Touches" counts how many swings formed there - more touches, stronger level.',
          'Fibonacci retracement levels are drawn between the last swing high and swing low. 38.2%-61.8% is the zone traders watch most.'
        ]
      },
      {
        heading: 'AI Market Brief',
        items: [
          'Funding, open interest, the share of accounts that are long, and the Fear & Greed Index show how traders are positioned. Amber means crowded or extreme.',
          'Press "Generate brief" for a bull case, bear case and levels to watch, written only from the data on this page. It is cached for 10 minutes.',
          'It uses Traddii\'s free Gemini by default. The gear icon lets you connect your own model instead - on your computer (Ollama, LM Studio) or a free online one (OpenRouter, Groq, your own Gemini key).'
        ]
      },
      {
        heading: 'How to use it',
        items: [
          'Choose the pair, then the candle interval in the Live Data card. Everything updates every 30 seconds.',
          'Edit any level or open "Manual Price Levels" to try your own numbers. Live updates pause while you edit; press "Apply Data" to resume.'
        ]
      }
    ],
    tip: 'Trades in the direction of the higher-timeframe trend, near a well-tested level, tend to have better odds.'
  },

  price: {
    title: 'Price Action Analysis',
    intro: 'Read the last closed candle: its pattern, how its volume compares with normal, and where it formed.',
    sections: [
      {
        heading: 'How it works',
        items: [
          'Pick a pair and timeframe. The analysis uses the last closed candle, because the live one is still changing.',
          'Pattern Recognition compares the candle with the one before it and the prior trend (e.g. a Hammer only counts after a decline).',
          'Volume is compared with the average of the previous 20 candles.',
          'Signal Strength combines the pattern, the volume and whether it is a reversal at the end of a move. Indecision patterns show "No clear bias".',
          'Market Context shows the nearest support and resistance and whether the next timeframe up agrees.'
        ]
      },
      {
        heading: 'Also available',
        items: [
          'Manual OHLCV Input lets you test any candle, including the previous candle and prior trend.',
          'Tick the Pre-Trade Checklist before you place a trade.'
        ]
      }
    ],
    tip: 'A single candle is never a reason to trade on its own - look for it at a key level, with volume, in the direction of the bigger trend.'
  },

  practice: {
    title: 'Practice (Paper Trading)',
    intro: 'Trade with $10,000 of virtual money using live Bybit prices and real Bybit fees - no risk, no sign-up needed.',
    sections: [
      {
        heading: 'Placing a trade',
        items: [
          'Pick a pair and chart timeframe at the top.',
          'Choose Long or Short, Market or Limit, then the quantity and leverage.',
          'Optionally add a take profit and stop loss. They must be on the correct side of your entry.',
          'Limit orders wait in the Orders tab until the price reaches them. You can cancel them at any time.'
        ]
      },
      {
        heading: 'Tracking',
        items: [
          'Positions shows live profit/loss, return on margin and the liquidation price. Stops, take profits and liquidations trigger automatically.',
          'Account Balance shows your equity, the money in margin, and realised profit after fees.',
          'History lists closed trades. Use the reset button to start again with $10,000.'
        ]
      },
      {
        heading: 'Bybit Demo Trading (optional)',
        items: [
          'Use the gear icon to connect a Bybit practice account, then switch between Paper and Demo at the top.',
          'Demo Trading is recommended: it uses real Bybit prices with demo funds. Create its API key on bybit.com after switching to Demo Trading.',
          'The older Bybit testnet still works too, with its own separate prices.',
          'Keys are stored only in this browser. Use demo or testnet keys only - never keys for a real-money account.'
        ]
      }
    ],
    tip: 'Fees are 0.055% for market orders and 0.02% for limit orders. A liquidation loses the whole margin of that position.'
  },

  journal: {
    title: 'Trading Journal',
    intro: 'Log your trades and notes, then see what is working. Your journal is saved to your account so you can open it on any device.',
    sections: [
      {
        heading: 'How to use it',
        items: [
          'Trades: press "Manage Trades" to add a trade with its pair, direction, entry, quantity, leverage, stop loss and take profit. Leave the exit price empty while the trade is open.',
          'Notes: press "Manage Notes" to write strategies, plans, ideas or reflections, link them to trades, and pin the important ones.',
          'Use the grid/list buttons on each section to switch between recent items and the full manager.'
        ]
      },
      {
        heading: 'Reviewing',
        items: [
          'Performance Overview shows win rate, total profit/loss, profit factor and your current streak.',
          'Recent Activity lists your latest trades and notes.',
          'Export Data downloads your trades and notes as JSON, CSV, text or PDF.'
        ]
      }
    ],
    tip: 'Write down why you took each trade. Reviewing your reasons, not just the results, is what improves your trading.'
  }
}
