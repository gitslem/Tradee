/**
 * Exchange API key storage (Bybit testnet only)
 *
 * Credentials are kept in the browser's localStorage, obfuscated with an XOR
 * cipher and a per-user salt that is stored alongside them. This is NOT
 * encryption: anything that can read localStorage (e.g. an XSS bug or a
 * browser extension) can recover the keys. Only use testnet keys, never
 * mainnet keys with real funds.
 *
 * - Keys are never logged or included in error messages
 * - Key format is validated before storage
 * - Keys are cleared on logout
 */

interface EncryptedCredentials {
  apiKey: string
  apiSecret: string
  timestamp: number
  checksum: string
}

interface ApiCredentials {
  apiKey: string
  apiSecret: string
}

class ApiKeyService {
  private readonly STORAGE_KEY = 'traddii_exc_creds'
  private readonly SALT_KEY = 'traddii_usr_salt'

  // Generate a user-specific salt for obfuscation
  private getSalt(userId: string): string {
    const storedSalt = localStorage.getItem(`${this.SALT_KEY}_${userId}`)
    if (storedSalt) return storedSalt

    // Generate new salt
    const salt = this.generateRandomString(32)
    localStorage.setItem(`${this.SALT_KEY}_${userId}`, salt)
    return salt
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const randomValues = new Uint8Array(length)
    crypto.getRandomValues(randomValues)
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length]
    }
    return result
  }

  // Simple XOR-based encryption (for client-side obfuscation)
  private encrypt(text: string, key: string): string {
    let result = ''
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      result += String.fromCharCode(charCode)
    }
    return btoa(result) // Base64 encode
  }

  private decrypt(encryptedText: string, key: string): string {
    try {
      const decoded = atob(encryptedText) // Base64 decode
      let result = ''
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        result += String.fromCharCode(charCode)
      }
      return result
    } catch {
      return ''
    }
  }

  // Generate checksum for integrity verification
  private generateChecksum(data: string): string {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  // Validate Bybit API key format
  validateApiKey(apiKey: string): boolean {
    // Bybit API keys are alphanumeric
    const keyPattern = /^[A-Za-z0-9]{18,50}$/
    return keyPattern.test(apiKey.trim())
  }

  // Validate Bybit API secret format
  validateApiSecret(apiSecret: string): boolean {
    // Bybit API secrets are alphanumeric
    const secretPattern = /^[A-Za-z0-9]{30,100}$/
    return secretPattern.test(apiSecret.trim())
  }

  // Store encrypted credentials
  saveCredentials(userId: string, exchange: string, credentials: ApiCredentials): boolean {
    try {
      if (!this.validateApiKey(credentials.apiKey)) {
        console.error('Invalid API key format')
        return false
      }

      if (!this.validateApiSecret(credentials.apiSecret)) {
        console.error('Invalid API secret format')
        return false
      }

      const salt = this.getSalt(userId)
      const encryptionKey = `${salt}_${userId}_${exchange}`

      const encryptedData: EncryptedCredentials = {
        apiKey: this.encrypt(credentials.apiKey.trim(), encryptionKey),
        apiSecret: this.encrypt(credentials.apiSecret.trim(), encryptionKey),
        timestamp: Date.now(),
        checksum: this.generateChecksum(credentials.apiKey + credentials.apiSecret)
      }

      const storageKey = `${this.STORAGE_KEY}_${userId}_${exchange}`
      localStorage.setItem(storageKey, JSON.stringify(encryptedData))

      return true
    } catch {
      console.error('Failed to save credentials')
      return false
    }
  }

  // Retrieve and decrypt credentials
  getCredentials(userId: string, exchange: string): ApiCredentials | null {
    try {
      const storageKey = `${this.STORAGE_KEY}_${userId}_${exchange}`
      const stored = localStorage.getItem(storageKey)

      if (!stored) return null

      const encryptedData: EncryptedCredentials = JSON.parse(stored)
      const salt = this.getSalt(userId)
      const encryptionKey = `${salt}_${userId}_${exchange}`

      const apiKey = this.decrypt(encryptedData.apiKey, encryptionKey)
      const apiSecret = this.decrypt(encryptedData.apiSecret, encryptionKey)

      // Verify checksum
      const checksum = this.generateChecksum(apiKey + apiSecret)
      if (checksum !== encryptedData.checksum) {
        console.error('Credentials integrity check failed')
        return null
      }

      return { apiKey, apiSecret }
    } catch {
      console.error('Failed to retrieve credentials')
      return null
    }
  }

  // Check if credentials exist
  hasCredentials(userId: string, exchange: string): boolean {
    const storageKey = `${this.STORAGE_KEY}_${userId}_${exchange}`
    return localStorage.getItem(storageKey) !== null
  }

  // Delete credentials
  deleteCredentials(userId: string, exchange: string): boolean {
    try {
      const storageKey = `${this.STORAGE_KEY}_${userId}_${exchange}`
      localStorage.removeItem(storageKey)
      return true
    } catch {
      return false
    }
  }

  // Clear all credentials for a user (on logout)
  clearAllCredentials(userId: string): void {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`${this.STORAGE_KEY}_${userId}`)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))

    // Also remove salt
    localStorage.removeItem(`${this.SALT_KEY}_${userId}`)
  }

  // Get credentials age in hours
  getCredentialsAge(userId: string, exchange: string): number | null {
    try {
      const storageKey = `${this.STORAGE_KEY}_${userId}_${exchange}`
      const stored = localStorage.getItem(storageKey)

      if (!stored) return null

      const encryptedData: EncryptedCredentials = JSON.parse(stored)
      const ageMs = Date.now() - encryptedData.timestamp
      return ageMs / (1000 * 60 * 60) // Convert to hours
    } catch {
      return null
    }
  }
}

export const apiKeyService = new ApiKeyService()
