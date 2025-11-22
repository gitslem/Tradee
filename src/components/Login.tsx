import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle, Database, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import TradingBackground from './TradingBackground'
import './Login.css'

const Login = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError('')
      await signInWithGoogle()
      navigate('/journal')
    } catch (error: any) {
      console.error('Sign-in error:', error)
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.')
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up blocked. Please allow pop-ups for this site.')
      } else {
        setError('Failed to sign in with Google. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <TradingBackground variant="home" />

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">
              <Shield size={48} />
            </div>
            <h1>Welcome to Traddii</h1>
            <p>Sign in to access your trading journal</p>
          </div>

          <div className="login-form">
            <button
              onClick={handleGoogleSignIn}
              className="google-sign-in-button"
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20456C17.64 8.56637 17.5827 7.95274 17.4764 7.36365H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8196H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20456Z" fill="#4285F4"/>
                <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
              </svg>
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>

            {error && <div className="error-message">{error}</div>}

            <div className="login-benefits">
              <h3>Why sign in with Google?</h3>
              <ul>
                <li>
                  <CheckCircle size={16} />
                  <span>Secure authentication with your Google account</span>
                </li>
                <li>
                  <Database size={16} />
                  <span>Cloud-based storage - access from anywhere</span>
                </li>
                <li>
                  <Download size={16} />
                  <span>Export and download your trading data anytime</span>
                </li>
              </ul>
            </div>

            <div className="privacy-note">
              <p>We only access your basic profile information (name, email, photo). Your trading data is private and secure.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
