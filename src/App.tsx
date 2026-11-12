import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import FloatingScrollButton from './components/FloatingScrollButton'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import JournalHome from './pages/JournalHome'
import PositionCalculator from './pages/PositionCalculator'
import MarketStructure from './pages/MarketStructure'
import PriceActionAnalysis from './pages/PriceActionAnalysis'
import PaperTrading from './pages/PaperTrading'
import Support from './pages/Support'
import FAQ from './pages/FAQ'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import About from './pages/About'

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <div className="app">
          <Navigation />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/journal" element={<JournalHome />} />
            <Route path="/calculator" element={
              <main className="tool-main">
                <PositionCalculator />
              </main>
            } />
            <Route path="/market-structure" element={
              <main className="tool-main">
                <MarketStructure />
              </main>
            } />
            <Route path="/price-action" element={
              <main className="tool-main">
                <PriceActionAnalysis />
              </main>
            } />
            <Route path="/paper-trading" element={
              <main className="tool-main">
                <PaperTrading />
              </main>
            } />
            <Route path="/about" element={<About />} />
            <Route path="/support" element={<Support />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
          <Footer />
          <FloatingScrollButton />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
