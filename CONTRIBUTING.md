# Contributing to Traddii

Thanks for helping improve Traddii! Bug reports, ideas, docs fixes and code are all welcome.

By taking part you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug.** Open a [bug report](https://github.com/gitslem/traddii/issues/new?template=bug_report.yml) with steps to reproduce it.
- **Suggest a feature.** Open a [feature request](https://github.com/gitslem/traddii/issues/new?template=feature_request.yml) and describe the problem it solves.
- **Fix something.** Issues labelled `good first issue` or `help wanted` are a good place to start. Comment on an issue before starting larger work so we can agree on the approach.
- **Report a security problem.** Do **not** open a public issue. Follow [SECURITY.md](./SECURITY.md).

## Development setup

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/<your-username>/traddii.git
cd traddii
npm install
cp .env.example .env    # fill in your own Firebase web app config
npm run dev             # http://localhost:5173
```

Calculator, Market, Price and Practice (paper trading) work without signing in. The Trading Journal and Google sign-in need your own Firebase project; see [Firebase setup](./README.md#firebase-setup) in the README.

Never commit `.env`, API keys, service-account files or other credentials.

## Making a change

1. Fork the repo and create a branch from `main`: `git checkout -b fix/short-description`.
2. Keep the change focused - one fix or feature per pull request.
3. Follow the existing style:
   - TypeScript with strict types; avoid `any`.
   - Use the design tokens in `src/styles/design-tokens.css` (no hard-coded colours), and check both day and night themes.
   - Scope CSS class names to the component so styles don't leak between pages.
   - Keep layouts usable at phone width (about 375px).
   - Trading maths (fees, sizing, P&L, liquidation) must stay correct. Explain any formula change in the pull request.
4. Check your work before pushing:

   ```bash
   npm run lint
   npm run build      # runs the TypeScript check and the production build
   ```

5. Open a pull request against `main` and fill in the template. Add screenshots for UI changes.

## Commit messages

Use a short imperative summary line (for example `Fix liquidation price for short positions`), with more detail in the body if needed.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
