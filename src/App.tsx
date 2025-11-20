import { useState } from 'react'
import './App.css'
import PositionCalculator from './components/PositionCalculator'
import MarketStructure from './components/MarketStructure'
import PriceActionAnalysis from './components/PriceActionAnalysis'

function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'market' | 'price'>('calculator')

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Crypto Trading Position Calculator</h1>
        <p className="subtitle">Risk Management & Market Analysis Tool</p>
      </header>

      <nav className="tab-nav">
        <button
          className={activeTab === 'calculator' ? 'active' : ''}
          onClick={() => setActiveTab('calculator')}
        >
          📊 Position Calculator
        </button>
        <button
          className={activeTab === 'market' ? 'active' : ''}
          onClick={() => setActiveTab('market')}
        >
          📈 Market Structure
        </button>
        <button
          className={activeTab === 'price' ? 'active' : ''}
          onClick={() => setActiveTab('price')}
        >
          🎯 Price Action
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'calculator' && <PositionCalculator />}
        {activeTab === 'market' && <MarketStructure />}
        {activeTab === 'price' && <PriceActionAnalysis />}
      </main>

      <footer className="app-footer">
        <p>⚠️ Always use proper risk management. Never risk more than you can afford to lose.</p>
      </footer>
    </div>
  )
}

export default App
