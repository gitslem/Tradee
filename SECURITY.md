# Security Policy

## Supported versions

Only the latest version on the `main` branch (deployed at https://traddii.web.app) receives security fixes.

## Reporting a vulnerability

Please **do not** report security problems in public issues, discussions or pull requests.

Report them privately instead:

1. **Preferred:** use GitHub's [private vulnerability reporting](https://github.com/gitslem/Tradee/security/advisories/new).
2. **Or** email **traddii.web.app@gmail.com** with the subject "Security".

Please include:

- what the problem is and where it is (page, file or endpoint)
- steps to reproduce it, or a proof of concept
- the impact you think it has

You can expect an acknowledgement within 7 days. Once the problem is confirmed and fixed, you will be credited in the release notes if you wish.

## Scope

In scope:

- this repository's code
- the Firestore security rules (`firestore.rules`)
- the deployed site at traddii.web.app

Out of scope:

- third-party services Traddii connects to, such as Binance, Bybit, Google, OpenRouter or Groq; report those to the provider
- denial-of-service or rate-limit testing against the live site
- issues that need a compromised device or browser

## Notes for users

- Traddii is an educational tool. Paper trading uses virtual money.
- If you connect Bybit **testnet** keys or your own AI provider key, the key is stored only in your browser. Use testnet or free-tier keys only - never keys for a funded account.
