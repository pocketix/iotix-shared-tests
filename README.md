# iotix-shared-tests

Shared fixtures and Cypress Component Testing scenarios used by **both**
`iotix-react` and `iotixng` to prove the two editor implementations
behave the same. Not an npm package — each repo imports these files by
relative path (see `cypress/component/*.cy.ts` in each repo).

## Why this exists

The two repos are independent implementations of the same VPL editor. Manual
review found real behavioral divergences between them (see the root-level
bug report). Writing two independently-authored test suites risks only
proving "this repo does what its own author expects" — it can't catch a case
where both repos *agree* on the wrong behavior, or drift apart over time.
Sharing the fixtures and the assertion logic means both suites exercise
*exactly* the same input and check *exactly* the same output.

## Layout

- `fixtures/language.json` — a minimal meta-language: a `"_"` root entry, a
  `compound` statement (`if`, with a condition), and a `cmd` statement
  (`setValue`, with `array`-type params). Small and hand-auditable, unlike
  the full demo language.
- `fixtures/language-missing-root.json` — same, minus the `"_"` entry. Used
  to regression-test the root-statement crash bug (see main report, both
  `Block.tsx`'s and `iotix-vp-block.component.html`'s "+" button skip the
  `?.` guard every other `language.statements[...]` lookup uses).
- `fixtures/programs/*.json` — small program snippets: `empty`, `simple`
  (one command), `nested` (an `if` containing a command), `siblings` (two
  sibling commands, for reorder/remove tests), `duplicateParams` (one
  command with two identical-valued params, reproducing the state you get
  from clicking "add param" twice without editing — the duplicate-key/
  trackBy bug precondition).
- `scenarios/selectors.js` — CSS selectors for the shared `.accordion`
  statement shell. The base shell (`Statement.tsx` / `iotix-vp-statement`)
  uses **identical class names** on both platforms — verified by reading
  both `.css` files. A few nested classes differ cosmetically
  (`.input-group` vs `.inputgroup`); those live under `perRepo`.
- `scenarios/sharedScenarios.js` — pure `cy.*` assertion functions, with zero
  React/Angular-specific code. Each repo's spec file does its own
  framework-specific `cy.mount(...)` and then calls into these functions.

## Running the tests

```
cd iotix-react && npm run test:component   # builds the lib, then runs Cypress CT
cd iotixng     && npm run test:component   # builds the lib, then runs Cypress CT
```

Both repos consume their library as a **built package**, not raw TS source,
matching how a real consumer would use it — and sidestepping real toolchain
friction found along the way:

- **React**: Cypress Component Testing uses Vite (Cypress dropped its old
  Create-React-App preset), which needs the library already built to
  `packages/iotix-editor/dist` (`npm run build:lib`) since CRA's own
  "no imports outside `src/`" restriction doesn't apply to Vite, but the
  package's `main`/`module` fields still point at `dist/`.
- **Angular**: Cypress's Angular devServer only runs the *demo* project's own
  TypeScript program through the real Angular/Ivy compiler. A relative
  import reaching into the library's source in `packages/iotixng/src`
  falls outside that program and gets a generic fallback loader that can't
  parse decorators (`@NgModule`, `@Component`) at all. Building the library
  (`ng build iotixng`) and symlinking `node_modules/iotixng` →
  `dist/iotixng` (done automatically by `npm run build:lib`) sidesteps
  this entirely — the built output is plain compiled JS, so any loader can
  consume it.
- Both suites pin an explicit `viewportWidth`/`viewportHeight` — each editor
  has its own mobile-responsive show/hide behavior for the visual/text
  panes, and the two default to *opposite* initial states (see main bug
  report), which would otherwise make one platform's tests fail against the
  small default CT viewport for reasons unrelated to what's being tested.
- React's `IotixEditor` always mounts with a hardcoded, non-optional GDPR
  consent modal on top of everything (see main bug report) — the mount
  helper in `IotixEditor.cy.tsx` dismisses it before every test. Angular
  has no equivalent.

## Adding a new shared scenario

1. If it needs new program/language shape, add a fixture under `fixtures/`.
2. Write the scenario as a function in `sharedScenarios.js` taking a
   `selectors` object (and any other plain data) — no `import React`/
   `import { Component }`, just `cy.get(...)`.
3. Call it from both `iotix-react/demo/cypress/component/*.cy.tsx` and
   `iotixng/cypress/component/*.cy.ts`.

## Current coverage (scaffold, not exhaustive)

- Renders the right statement titles in order.
- Root "+" (add statement) button renders without crashing.
- Move up/down buttons reorder siblings.
- Remove button deletes a statement.
- Accordion header click toggles open/closed.
- Duplicate-valued params still render as separate rows.

Not yet covered (left for follow-up, see main bug report for the underlying
bugs each of these would pin down): program hot-swap after mount, undo/redo,
manual-sync save flow, expression dialog editing, "structure"-type params,
text-editor JSON round-trip. These need either a richer per-repo mount
helper (undo/redo, manual sync) or accept that the current implementations
are broken and should be written as failing/skipped tests until fixed.
