import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import Navigation from './components/Navigation'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import TradingJournal from './components/TradingJournal'
import PositionCalculator from './components/PositionCalculator'
import MarketStructure from './components/MarketStructure'
import PriceActionAnalysis from './components/PriceActionAnalysis'
import Support from './components/Support'
import FAQ from './components/FAQ'
import Terms from './components/Terms'
import Privacy from './components/Privacy'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navigation />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/journal" element={<TradingJournal />} />
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
            <Route path="/support" element={<Support />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
