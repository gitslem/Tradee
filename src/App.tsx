import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import FloatingScrollButton from './components/FloatingScrollButton'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import JournalHome from './components/JournalHome'
import PositionCalculator from './components/PositionCalculator'
import MarketStructure from './components/MarketStructure'
import PriceActionAnalysis from './components/PriceActionAnalysis'
import PaperTrading from './components/PaperTrading'
import Support from './components/Support'
import FAQ from './components/FAQ'
import Terms from './components/Terms'
import Privacy from './components/Privacy'
import About from './components/About'

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
            <Route path="/paper-trading" element={
              <main className="main-content">
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
