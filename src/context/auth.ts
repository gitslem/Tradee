import { createContext, useContext } from 'react'

export interface User {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
