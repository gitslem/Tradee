import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import './FAQ.css'

interface FAQItem {
  question: string
  answer: string
}

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqData: FAQItem[] = [
    {
      question: "What is Traddii and how can it help me?",
      answer: "Traddii is a comprehensive suite of professional trading tools designed to help crypto traders manage risk, analyze markets, and track performance. Our Position Calculator helps you determine optimal position sizes based on your risk tolerance, the Market Structure tool identifies trends and key levels, Price Action Analysis recognizes candlestick patterns, and the Trading Journal tracks your trading history for continuous improvement."
    },
    {
      question: "Is Traddii really free to use?",
      answer: "Yes! Traddii is completely free to use. All our core features including the Position Calculator, Market Structure Analysis, Price Action Analysis, and Trading Journal are available at no cost. We believe professional trading tools should be accessible to everyone, regardless of account size."
    },
    {
      question: "Do I need to create an account?",
      answer: "Most tools (Position Calculator, Market Structure, Price Action) can be used without an account. However, to use the Trading Journal and save your trade history, you'll need to sign in with Google. This ensures your data is securely stored and accessible from any device."
    },
    {
      question: "Which exchanges does Traddii support?",
      answer: "Traddii supports all major cryptocurrency exchanges including Binance, Bybit, OKX, KuCoin, Coinbase, Kraken, Gate.io, HTX (Huobi), Bitget, and MEXC. The Position Calculator automatically adjusts fees, leverage limits, and maintenance margin rates based on your selected exchange for accurate calculations."
    },
    {
      question: "How accurate are the liquidation price calculations?",
      answer: "Our liquidation calculations use the exact formulas employed by major exchanges like Bybit and Binance for isolated margin positions. The calculator accounts for initial margin, maintenance margin, and closing fees to match real exchange liquidation prices. However, actual liquidation may vary slightly due to real-time funding rates and market conditions."
    },
    {
      question: "What is the Position Calculator and why should I use it?",
      answer: "The Position Calculator is a risk management tool that helps you determine exactly how much to invest in each trade based on your account balance, risk percentage, and stop-loss distance. It prevents overleveraging and helps preserve capital by calculating position sizes that align with your risk tolerance. Use it before every trade to ensure you're never risking more than you can afford to lose."
    },
    {
      question: "How do I calculate my position size correctly?",
      answer: "Enter your account balance, choose your risk percentage (we recommend 1-2% per trade), set your entry price, and define your stop-loss level. The calculator will automatically determine the optimal position size that risks only your specified percentage if the stop-loss is hit. For leveraged trades, it also calculates margin required and liquidation price."
    },
    {
      question: "What leverage should I use?",
      answer: "Lower leverage (1x-3x) is recommended for beginners and conservative traders. Higher leverage (5x-10x) significantly increases both profit potential and liquidation risk. Leverage above 10x is extremely risky and not recommended for most traders. Our calculator shows you the distance to liquidation so you can understand the risk before entering a trade."
    },
    {
      question: "What does the Market Structure tool do?",
      answer: "The Market Structure tool analyzes price action to identify trends (bullish, bearish, or ranging), key support and resistance levels, and Fibonacci retracement zones. It helps you understand the broader market context so you can trade with the trend rather than against it, significantly improving your win rate."
    },
    {
      question: "How does the Price Action Analysis work?",
      answer: "The Price Action Analysis tool recognizes over 20 candlestick patterns including Doji, Hammer, Engulfing, Shooting Star, and more. It analyzes the relationship between open, high, low, and close prices to identify potential reversal or continuation signals. Combined with volume analysis, it helps you time entries and exits more precisely."
    },
    {
      question: "Can I use Traddii on mobile devices?",
      answer: "Yes! Traddii is fully responsive and works seamlessly on smartphones, tablets, and desktop computers. The interface adapts to your screen size, ensuring all tools are accessible and easy to use on any device. You can analyze markets and calculate positions on the go."
    },
    {
      question: "Is my trading data secure?",
      answer: "Yes. We use Firebase Authentication and Firestore for secure data storage. Your trading journal data is encrypted and only accessible to you. We never share, sell, or access your personal trading information. For users who don't create accounts, no data is stored on our servers at all."
    },
    {
      question: "Does Traddii provide financial advice?",
      answer: "No. Traddii is an educational tool that provides calculators and analysis features. We do not provide financial advice, trading signals, or recommendations. All trading decisions are your own, and you should trade at your own risk. Consider consulting with a licensed financial advisor before making investment decisions."
    },
    {
      question: "What's the difference between isolated and cross margin?",
      answer: "Isolated margin limits risk to only the margin allocated to a specific position. If liquidated, you only lose that position's margin. Cross margin uses your entire account balance as collateral for all positions. While cross margin can prevent liquidation, it also means you could lose your entire account if positions move against you. Our calculator currently uses isolated margin calculations."
    },
    {
      question: "How do I use the Trading Journal effectively?",
      answer: "Log every trade immediately after execution, including entry price, exit price, position size, stop-loss, take-profit, and notes about why you took the trade. Review your journal weekly to identify patterns in your winning and losing trades. Use the analytics dashboard to track your win rate, profit factor, and best-performing pairs."
    },
    {
      question: "Why are my profits different from what the calculator shows?",
      answer: "The calculator shows potential profit if price reaches your take-profit target. Actual profit may differ due to slippage (difference between expected and executed price), funding rates for perpetual contracts, and whether you exit at exactly your planned take-profit level. Always account for a margin of error in real trading."
    },
    {
      question: "What is Risk/Reward ratio and why does it matter?",
      answer: "Risk/Reward (R:R) ratio compares your potential profit to your potential loss. A 2:1 R:R means you stand to gain $2 for every $1 you risk. Higher R:R ratios allow you to be profitable even with a lower win rate. For example, with a 2:1 R:R, you can be profitable winning only 40% of trades."
    },
    {
      question: "Can I export my trading journal data?",
      answer: "Yes! You can export your entire trading history as CSV or JSON files. This allows you to analyze your data in Excel, Google Sheets, or other analytics tools. Exports include all trade details, timestamps, P&L, and custom notes."
    },
    {
      question: "Do you support futures, spot, and margin trading?",
      answer: "Yes! The Position Calculator supports all three account types. Select your account type (Spot, Futures, or Margin) and exchange, and the calculator automatically adjusts fees, available leverage, and maintenance margin rates to match your selected platform's specifications."
    },
    {
      question: "How often are exchange fees and leverage limits updated?",
      answer: "Exchange configurations are updated regularly to reflect current fee structures and leverage limits. However, exchanges can change these parameters at any time. Always verify current fees and limits on your exchange's official website before trading."
    },
    {
      question: "What should I do if I encounter a bug?",
      answer: "Please report bugs or issues through our Support page or email us at traddii.web.app@gmail.com. Include a description of the issue, the tool you were using, your browser/device information, and steps to reproduce the problem. We actively monitor feedback and release updates regularly."
    },
    {
      question: "Will you add more features in the future?",
      answer: "Yes! We're continuously improving Traddii based on user feedback. Planned features include DCA (Dollar Cost Averaging) calculator, grid trading calculator, pivot points analysis, advanced chart patterns, economic calendar, and price alerts. Follow our updates for new feature announcements."
    },
    {
      question: "Can I use Traddii for stocks or forex trading?",
      answer: "Currently, Traddii is optimized for cryptocurrency trading with exchange-specific configurations for major crypto platforms. While the core position sizing principles apply to all markets, exchange fees, leverage limits, and liquidation formulas are specific to crypto exchanges."
    },
    {
      question: "What's the recommended risk percentage per trade?",
      answer: "Professional traders typically risk 1-2% of their account balance per trade. This allows you to sustain a losing streak without depleting your capital. Risking more than 5% per trade is considered very aggressive and can lead to rapid account depletion. Our calculator warns you when risk exceeds recommended levels."
    }
  ]

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="faq-page">
      <div className="faq-container">
        <div className="faq-header">
          <h1>Frequently Asked Questions</h1>
          <p>Everything you need to know about Traddii trading tools</p>
        </div>

        <div className="faq-list">
          {faqData.map((item, index) => (
            <div
              key={index}
              className={`faq-item ${openIndex === index ? 'active' : ''}`}
            >
              <button
                className="faq-question"
                onClick={() => toggleQuestion(index)}
                aria-expanded={openIndex === index}
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`faq-icon ${openIndex === index ? 'rotated' : ''}`}
                  size={20}
                />
              </button>
              <div className={`faq-answer ${openIndex === index ? 'open' : ''}`}>
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="faq-footer">
          <h3>Still have questions?</h3>
          <p>Can't find the answer you're looking for? Feel free to reach out to us.</p>
          <a href="mailto:traddii.web.app@gmail.com" className="btn-contact">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}

export default FAQ
