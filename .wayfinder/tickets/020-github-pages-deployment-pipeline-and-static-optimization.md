# Ticket 020: GitHub Pages Deployment Pipeline & Static Optimization

**Labels**: `wayfinder:task`
**Status**: Closed
**Blocked by**: [016-interactive-documentation-viewer-and-architecture-guide](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/016-interactive-documentation-viewer-and-architecture-guide.md), [017-interactive-studio-ide-station-and-preset-demos](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/017-interactive-studio-ide-station-and-preset-demos.md), [018-component-and-node-sandbox-gallery](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/018-component-and-node-sandbox-gallery.md), [019-in-browser-vitest-test-runner-and-devtools-dock](file:///c:/Users/alyka/projects/collidor/axon/.wayfinder/tickets/019-in-browser-vitest-test-runner-and-devtools-dock.md)
**Blocks**: None (Destination Hand-off)

---

## Question

How do we optimize the static build output with Vite Plus and configure an automated GitHub Actions deployment pipeline to serve the documentation and demo application on GitHub Pages?

---

## Requirements

1. **Static Build & Asset Optimization**:
   - Configure dynamic `base` path in `vite.config.ts` (e.g. `process.env.GITHUB_PAGES ? '/axon/' : '/'`).
   - Setup SPA fallback routing via `404.html` (redirecting hash or path routes to index).
   - Code-splitting and tree-shaking for minimal initial bundle size.

2. **GitHub Actions Workflow (`.github/workflows/deploy-docs.yml`)**:
   - Automated workflow triggering on push to `main` (with path filter on `axon/**` and docs):
     - Checkout repository.
     - Setup pnpm and Node.js.
     - Install dependencies.
     - Build documentation app with `pnpm --filter @collidor/axon-docs run build`.
     - Deploy `dist/` output directory to GitHub Pages via `actions/deploy-pages`.

3. **Verification**:
   - Local production preview (`pnpm run preview` / `vp preview`) serves static site cleanly.
   - GitHub Actions workflow syntax validates correctly.
