# Browser smoke tests

These Playwright checks are intentionally read-only and target the public production site by default.

Run locally:

```powershell
npm install --no-save --package-lock=false @playwright/test@1.56.1
npx playwright install chromium
$env:PLAYWRIGHT_BASE_URL="https://radioeterna.vercel.app"
npx playwright test
```

The suite checks public page responses, page identity, SEO endpoints, and that the admin area redirects unauthenticated visitors to login. It does not submit forms, log in, alter database records, or perform load testing.
