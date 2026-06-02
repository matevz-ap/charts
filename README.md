# Charts Dashboard

Static Svelte dashboard editor with shadcn-svelte UI, LayerChart charts, and Dexie/IndexedDB persistence.

## Local Development

```bash
npm install
npm run dev
```

## Verify

```bash
npm run check
npm test
npm run build
```

## Deploy To Cloudflare Workers

This project uses Cloudflare Workers Static Assets. The Worker config lives in `wrangler.jsonc` and serves the generated `build` directory.

Before the first deploy, authenticate Wrangler:

```bash
npx wrangler login
```

Deploy:

```bash
npm run deploy:worker
```

For Cloudflare's connected Git deploy settings, use:

- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Output directory: `build`

Do not allow Wrangler to auto-configure the project as a SvelteKit Worker. This app intentionally uses `@sveltejs/adapter-static` plus Workers Static Assets, so `wrangler.jsonc` should point at `./build`, not `.svelte-kit/cloudflare`.

The Worker is configured for the custom domain `charts.mapsoft.net`. The domain must be active in the target Cloudflare account/zone for the route to attach successfully.
