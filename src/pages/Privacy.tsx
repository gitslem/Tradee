import './Legal.css'

const Privacy = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last Updated: November 22, 2025</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Introduction</h2>
            <p>
              Traddii ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our trading tools and services.
            </p>
            <p>
              Please read this Privacy Policy carefully. By using Traddii, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>

            <h3>2.1 Information You Provide</h3>
            <p>When you create an account or use our services, we may collect:</p>
            <ul>
              <li><strong>Google Account Information:</strong> Name, email address, and profile picture through Google Authentication</li>
              <li><strong>Trading Journal Data:</strong> Trade details you manually enter including pairs, entry/exit prices, position sizes, notes, and tags</li>
              <li><strong>Communication Data:</strong> Information you provide when contacting our support team</li>
            </ul>

            <h3>2.2 Information Automatically Collected</h3>
            <p>When you access Traddii, we automatically collect:</p>
            <ul>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent, and interaction patterns</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device type, and screen resolution</li>
              <li><strong>IP Address:</strong> For security and analytics purposes</li>
              <li><strong>Cookies and Similar Technologies:</strong> Session data and preferences</li>
            </ul>

            <h3>2.3 Information We Do NOT Collect</h3>
            <p>We do not collect:</p>
            <ul>
              <li>Exchange API keys or trading passwords</li>
              <li>Credit card or payment information (our service is free)</li>
              <li>Social security numbers or government IDs</li>
              <li>Actual trading execution data from exchanges</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. How We Use Your Information</h2>
            <p>We use collected information for the following purposes:</p>
            <ul>
              <li><strong>Service Provision:</strong> To provide, maintain, and improve our trading tools</li>
              <li><strong>Account Management:</strong> To create and manage your account</li>
              <li><strong>Data Storage:</strong> To securely store your trading journal entries</li>
              <li><strong>Communication:</strong> To respond to your inquiries and provide support</li>
              <li><strong>Analytics:</strong> To understand how users interact with our tools and identify areas for improvement</li>
              <li><strong>Security:</strong> To detect, prevent, and address technical issues or fraudulent activity</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Data Storage and Security</h2>

            <h3>4.1 Where We Store Data</h3>
            <p>
              Your data is stored using Google Firebase services, including:
            </p>
            <ul>
              <li><strong>Firebase Authentication:</strong> Secure Google sign-in credentials</li>
              <li><strong>Firebase Firestore:</strong> Encrypted cloud database for trading journal data</li>
            </ul>

            <h3>4.2 Security Measures</h3>
            <p>
              We implement industry-standard security measures to protect your information:
            </p>
            <ul>
              <li>Encryption in transit using HTTPS/SSL</li>
              <li>Encryption at rest in Firebase Firestore</li>
              <li>Secure authentication via Google OAuth 2.0</li>
              <li>Regular security audits and updates</li>
              <li>Access controls limiting who can view your data</li>
            </ul>

            <h3>4.3 Data Retention</h3>
            <p>
              We retain your information for as long as your account is active or as needed to provide services. You can request deletion of your data at any time by contacting us or deleting your account.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Information Sharing and Disclosure</h2>

            <div className="legal-warning">
              <p><strong>We do NOT sell your personal information to third parties.</strong></p>
            </div>

            <p>We may share information in the following circumstances:</p>
            <ul>
              <li><strong>Service Providers:</strong> With Google Firebase for authentication and data storage</li>
              <li><strong>Legal Requirements:</strong> If required by law, court order, or government request</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
            </ul>

            <p>We do NOT share your trading data with:</p>
            <ul>
              <li>Advertising networks or data brokers</li>
              <li>Third-party marketers</li>
              <li>Other users (your journal is private)</li>
              <li>Cryptocurrency exchanges</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Third-Party Services</h2>

            <h3>6.1 Google Firebase</h3>
            <p>
              We use Google Firebase for authentication and data storage. Firebase has its own privacy policy available at: <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">https://firebase.google.com/support/privacy</a>
            </p>

            <h3>6.2 Exchange APIs</h3>
            <p>
              We fetch public market data from exchange APIs (Binance, Bybit, OKX, etc.) to provide real-time prices. These are public endpoints that do not require authentication or transmit personal information.
            </p>

            <h3>6.3 Analytics</h3>
            <p>
              We may use analytics services to understand usage patterns. These services may collect anonymized data about your interactions with our tools.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies to:
            </p>
            <ul>
              <li>Maintain your session when signed in</li>
              <li>Remember your preferences (exchange selection, theme, etc.)</li>
              <li>Analyze usage patterns and improve our services</li>
            </ul>
            <p>
              You can control cookies through your browser settings. Note that disabling cookies may affect certain features of Traddii.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Your Privacy Rights</h2>
            <p>
              Depending on your location, you may have the following rights:
            </p>

            <h3>8.1 Access and Portability</h3>
            <ul>
              <li>Request a copy of your personal data</li>
              <li>Export your trading journal data (CSV/JSON)</li>
            </ul>

            <h3>8.2 Correction and Deletion</h3>
            <ul>
              <li>Update or correct your account information</li>
              <li>Delete individual trades or your entire journal</li>
              <li>Request complete account deletion</li>
            </ul>

            <h3>8.3 Withdraw Consent</h3>
            <ul>
              <li>Opt out of certain data collection practices</li>
              <li>Disable cookies through browser settings</li>
              <li>Stop using our services at any time</li>
            </ul>

            <h3>8.4 Object to Processing</h3>
            <ul>
              <li>Object to how we process your data</li>
              <li>Request restrictions on data processing</li>
            </ul>

            <p>To exercise any of these rights, contact us at traddii.web.app@gmail.com</p>
          </section>

          <section className="legal-section">
            <h2>9. Children's Privacy</h2>
            <p>
              Traddii is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and maintained on servers located outside your country of residence. By using Traddii, you consent to the transfer of information to countries outside your home country, which may have different data protection rules.
            </p>
            <p>
              We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. California Privacy Rights (CCPA)</h2>
            <p>
              If you are a California resident, you have specific rights regarding your personal information:
            </p>
            <ul>
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to say no to the sale of personal information</li>
              <li>Right to access your personal information</li>
              <li>Right to equal service and price</li>
              <li>Right to request deletion of personal information</li>
            </ul>
            <p><strong>Note:</strong> We do not sell personal information.</p>
          </section>

          <section className="legal-section">
            <h2>12. European Privacy Rights (GDPR)</h2>
            <p>
              If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR):
            </p>
            <ul>
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Rights related to automated decision-making</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>13. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by:
            </p>
            <ul>
              <li>Updating the "Last Updated" date at the top of this policy</li>
              <li>Posting a notice on our website</li>
              <li>Sending an email notification (for significant changes)</li>
            </ul>
            <p>
              Continued use of Traddii after changes constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. Data Breach Notification</h2>
            <p>
              In the event of a data breach that affects your personal information, we will:
            </p>
            <ul>
              <li>Notify affected users within 72 hours of discovery</li>
              <li>Describe the nature of the breach</li>
              <li>Outline steps we're taking to address the breach</li>
              <li>Provide recommendations to protect your information</li>
              <li>Comply with applicable data breach notification laws</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>15. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:
            </p>
            <div className="legal-contact">
              <p><strong>Email:</strong> traddii.web.app@gmail.com</p>
              <p><strong>Subject:</strong> Privacy Inquiry - Traddii</p>
            </div>
            <p>
              We will respond to your inquiry within 30 days.
            </p>
          </section>

          <div className="legal-acknowledgment">
            <p>
              <strong>By using Traddii, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Privacy
