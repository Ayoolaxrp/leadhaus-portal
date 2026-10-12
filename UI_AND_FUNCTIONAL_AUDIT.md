# UI Design and Functional Coverage Audit

**Scope:** Source review of the Leadhaus portal and its existing Playwright test suite, using the locally installed Apple Design guidance and the user-provided Cloudflare `security-audit-skill` repository. This is not a visual/browser pass or a Cloudflare security-audit execution.

## Summary

- The app has a consistent dark/light token system, shared navigation and page patterns, visible keyboard focus, and meaningful client/team workflows represented in E2E tests.
- The Apple-oriented review found a few small craft/accessibility opportunities (reduced-transparency handling and dynamic text resilience), but this is not an Apple design mandate; the current restrained transitions and no-motion-for-gesture-driven-components approach are appropriate for the UI found in source.
- The existing Playwright suite defines **37 scenarios** across desktop/client, team, lifecycle, controls, and phone layouts. This documents test coverage, not successful execution: browser tests were not run in this review.
- The Cloudflare skill is for a multi-phase **security audit**, not a general UI functionality audit. Its sandbox rules prohibit executing app/browser/test code without no-network isolation, a clean allowlisted environment, read-only source/toolchain, scratch-only writes, and enforced resource limits. Docker is installed but its daemon is unavailable; no equivalent OS sandbox is exposed here. Therefore the Cloudflare security workflow and local UI execution remain blocked.

## Design review (source-based)

### Strengths

- Shared shell establishes consistent location/wayfinding across portal and staff workspace, indicates the active page with `aria-current`, uses labeled navigation, and adapts from a desktop side rail to a horizontally scrollable phone nav (`src/components/shell.tsx`).
- Theme tokens follow system light/dark preference, with a focused accent palette and tabular numerals (`src/app/globals.css`).
- Focus-visible treatment is present; entrance and transition motion now respects reduced-motion preferences (`src/app/globals.css`).
- Buttons have active-state feedback and clear disabled styling (`src/components/ui.tsx`); controls are mostly built from semantic links, buttons, forms, and native `<details>` disclosures.
- Screen-level hierarchy is consistent through `PageHeader`, cards, section titles, status badges, and progress semantics (`src/components/ui.tsx`).
- Client portal queries use explicit allow-listed projections rather than exposing raw internal records (`src/lib/portal.ts`); user-facing demos also explain that sample data is not production data.

### Opportunities

1. **Reduced transparency preference:** the navigation shell originally used `backdrop-blur` with a translucent background but had no `prefers-reduced-transparency: reduce` fallback. The follow-up fix adds an opaque shell surface for that preference (`src/components/shell.tsx`, `src/app/globals.css`).
2. **Text scaling:** shared page headings and controls rely on fixed Tailwind text sizes. Verify at browser zoom / enlarged default font and ensure dense data tables, action rows, and mobile nav reflow without truncating essential content. Prefer relative sizing where layout permits.
3. **Direct feedback:** active button transforms exist, but most use `transition` without a duration contract. Check that press feedback is immediate in the browser; the follow-up fix reduces transitions and animations when reduced motion is requested. The app has no apparent drag/sheet gestures, so velocity handoff, rubber-banding, and gesture springs are not applicable.
4. **Translucent-shell legibility:** visually verify the sticky mobile nav and sidebar across both themes and over scrolling content. Source sets a theme-aware translucent background and blur but this review cannot establish actual contrast in rendered states.
5. **Touch/keyboard verification:** visible focus and 36px mobile sign-out button are present; verify nav link hit targets, overflow discoverability, keyboard traversal, zoom, and screen-reader labels in rendered pages.

This was a source-only assessment, not a rendered-interface verdict. The reduced-transparency recommendation was subsequently implemented; remaining items need browser/user-context verification.

## Functional test coverage

The suite contains 37 `test()` declarations:

- `e2e/1-client.spec.ts` — 11 client paths/actions: login, dashboard, every portal nav item, creative approvals/comments, onboarding/validation/upload, document view/print, messages, billing, reports/strategy, role denial and sign-out.
- `e2e/2-team.spec.ts` — 10 team paths/actions: overview, team nav, leads, client replies/internal notes, delivery, finance, team page/sign-out, client-visible follow-through, tenant separation and demo reset.
- `e2e/3-controls.spec.ts` — 7 agency settings and per-client controls, cross-role updates, inbox replies and tenant boundaries.
- `e2e/4-lifecycle.spec.ts` — 7 new-client onboarding-to-delivery flows across client creation, stage changes, projects/campaigns, creative revisions, metrics/reports, strategy and documents.
- `e2e/mobile.spec.ts` — 2 phone viewport checks for client/team navigation and horizontal overflow on sampled routes.

**Coverage gaps visible in the test inventory:** phone checks sample only selected portal routes and one team page; not every route is exercised at phone width. No explicit reduced-motion, reduced-transparency, increased-contrast, zoom/text-resize, keyboard-only, or automated axe/accessibility checks were found in the tests reviewed. Existing tests demonstrate intended workflows but were not run here.

## Cloudflare security-audit skill fit and execution status

The repository at `https://github.com/cloudflare/security-audit-skill` describes source reconnaissance, coverage-led vulnerability hunting, independent verification, structured findings, and security reporting. It explicitly requires an OS-enforced sandbox for target-controlled commands/browser tests. This is a different scope from exploratory product QA.

- Security code was not executed or tested against a live service.
- The local app endpoints were inspected only to identify the running project/port; this does not count as a functional test.
- `npm run e2e` / Playwright was not run because the required sandbox cannot be established in this environment (Windows host; Docker daemon unavailable; no no-network, empty-env, read-only-source/scratch-only sandbox tool available).
- As the feature QA counterpart, this repo's Playwright suite would be the relevant test interface once it can run in a properly isolated local environment.
- No Cloudflare audit output artifacts were generated: no security hunters/verifiers are available in this agent platform, and a complete report cannot be honestly claimed from source review alone.

## Follow-up fixes (source review)

The follow-up review made these targeted changes:

- Production session signing now fails closed without `SESSION_SECRET` on every host, not only Vercel.
- The temporary demo account picker/reset now requires a configured `DEMO_PASSCODE` in production; development behavior remains unchanged. The login UI requests the code in production, and `.env.example` documents it as required.
- Supabase creative comments now have explicit client visibility, default-deny client reads, client-scoped parent integrity, and an insert check requiring a creative already shared for review. Deliverables and creative versions now use composite foreign keys to ensure their parent belongs to the same client. These edits affect the not-yet-applied schema file only; they do not change a live database.
- Shared navigation now honors reduced-transparency and increased-contrast preferences; reduced-motion preference removes animation and transitions.
- Added focused session/demo-access regression tests. They were not executed due to the sandbox restriction below.

## Verification limits

The source review covered app shell/theme, shared components, session and server-action boundaries, portal projections, Supabase schema/RLS, representative client screens, Playwright configuration, and the E2E spec files. The 37 E2E scenarios are inventory, not pass results. `git diff --check` passed after the edits. No target-controlled test/build/browser command was run: the Cloudflare skill requires a no-network, empty-environment, read-only-source/toolchain sandbox with scratch-only writes and resource limits, and this environment has no available compliant sandbox. No rendered-page verdict, successful test run, or complete security audit is claimed.

Source-only fixes do not replace an independent full Cloudflare security-audit workflow or real-browser verification. The Supabase policy changes need validation against the actual Supabase/Postgres instance before deployment; this repository labels the migration as not yet applied.
