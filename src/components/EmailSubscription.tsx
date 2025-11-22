import { useState } from 'react'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import './EmailSubscription.css'

const EmailSubscription = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setStatus('error')
      setMessage('Please enter your email address')
      return
    }

    if (!validateEmail(email)) {
      setStatus('error')
      setMessage('Please enter a valid email address')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      // Check if email already exists
      const emailsRef = collection(db, 'emailSubscriptions')
      const q = query(emailsRef, where('email', '==', email.toLowerCase()))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        setStatus('error')
        setMessage('This email is already subscribed!')
        return
      }

      // Add new subscription
      await addDoc(collection(db, 'emailSubscriptions'), {
        email: email.toLowerCase(),
        subscribedAt: serverTimestamp(),
        status: 'active',
        source: 'landing_page'
      })

      setStatus('success')
      setMessage('Thank you for subscribing! We\'ll keep you updated.')
      setEmail('')

      // Reset success message after 5 seconds
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 5000)

    } catch (error) {
      console.error('Error subscribing email:', error)
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="email-subscription">
      <div className="subscription-content">
        <div className="subscription-header">
          <Mail size={40} className="subscription-icon" />
          <h3 className="subscription-title">Stay Updated with Trading Insights</h3>
          <p className="subscription-description">
            Join our community of traders! Get exclusive tips, market analysis, and new features delivered to your inbox.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="subscription-form">
          <div className="input-wrapper">
            <Mail size={20} className="input-icon" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="subscription-input"
              disabled={status === 'loading'}
            />
          </div>
          <button
            type="submit"
            className="subscription-button"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <span className="loading-spinner"></span>
            ) : (
              'Subscribe'
            )}
          </button>
        </form>

        {message && (
          <div className={`subscription-message ${status}`}>
            {status === 'success' ? (
              <CheckCircle size={18} />
            ) : status === 'error' ? (
              <AlertCircle size={18} />
            ) : null}
            <span>{message}</span>
          </div>
        )}

        <p className="subscription-note">
          We respect your privacy. Unsubscribe at any time. No spam, ever.
        </p>
      </div>
    </div>
  )
}

export default EmailSubscription
