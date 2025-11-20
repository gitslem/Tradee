import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Navigation from './components/Navigation'
import LandingPage from './components/LandingPage'
import PositionCalculator from './components/PositionCalculator'
import MarketStructure from './components/MarketStructure'
import PriceActionAnalysis from './components/PriceActionAnalysis'

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/calculator" element={
            <main className="main-content">
              <PositionCalculator />
            </main>
          } />
          <Route path="/market-structure" element={
            <main className="main-content">
              <MarketStructure />
            </main>
          } />
          <Route path="/price-action" element={
            <main className="main-content">
              <PriceActionAnalysis />
            </main>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App
