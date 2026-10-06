# iotix-shared-tests

Shared fixtures and Cypress Component Testing scenarios used by **both**
`iotix-react` and `iotixng` to prove the two editor implementations
behave the same. Not an npm package — each repo vendors this one in as a
git submodule (at `iotix-shared-tests/`) and imports these files by
relative path (see `cypress/component/*.cy.ts` in each repo).

Pinning it as a submodule is deliberate: bumping the pinned commit in a
consuming repo is an explicit, reviewable change (a normal PR diff on the
submodule pointer), rather than silently picking up whatever the shared
scenarios currently say. A change here doesn't affect either editor's
suite until someone deliberately updates its pointer and re-runs the
tests.

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
- `scenarios/sharedScenarios.js` — pure `cy.*` assertion functions for
  Cypress Component Testing, with zero React/Angular-specific code. Each
  repo's spec file does its own framework-specific `cy.mount(...)` and then
  calls into these functions.
- `scenarios/sharedE2EScenarios.js` — the E2E equivalent: pure `cy.*`
  scenarios run against each repo's real running demo app (`cy.visit`, not
  `cy.mount`), driving the visual and text editor panes directly. Each
  repo's spec file does its own `cy.visit("/")` and supplies the one thing
  that still differs between the two demos — the add-statement dialog's
  confirm-button label ("Add" on iotix-react, "Ok" on iotixng) — then calls
  into these functions. Deliberately never clicks the "Evaluate" trigger
  button, since that hits an external backend outside either repo's scope;
  the visual/text editor panes' round-trip JSON is the ground truth instead.

## Running the tests

```
cd iotix-react && npm run test:component   # builds the lib, then runs Cypress CT
cd iotixng     && npm run test:component   # builds the lib, then runs Cypress CT

cd iotix-react && npm run test:e2e         # builds the lib, starts the demo, runs Cypress E2E
cd iotixng     && npm run test:e2e         # builds the lib, starts the demo, runs Cypress E2E
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
2. Write the scenario as a function in `sharedScenarios.js` (Component
   Testing) or `sharedE2EScenarios.js` (E2E) taking a `selectors` object
   (and any other plain data) — no `import React`/`import { Component }`,
   just `cy.get(...)`. Accept a small options object for anything that
   still genuinely differs between the two demos (e.g. a confirm-button
   label, or a per-repo "commit" callback) rather than hardcoding either
   repo's specifics.
3. Call it from both `iotix-react/demo/cypress/component|e2e/*.cy.tsx` and
   `iotixng/cypress/component|e2e/*.cy.ts`.

## Current coverage (scaffold, not exhaustive)

Component Testing (`sharedScenarios.js`):
- Renders the right statement titles in order.
- Root "+" (add statement) button renders without crashing.
- Move up/down buttons reorder siblings.
- Remove button deletes a statement.
- Accordion header click toggles open/closed.
- Duplicate-valued params still render as separate rows.
- Renders bound values for structure-type command params.
- Expression dialog flags a malformed expression / accepts a well-formed one.
- Editing a structure-type param propagates out through onProgramChange.
- Mobile-responsive default: visual editor pane shown, text editor pane
  hidden.

E2E (`sharedE2EScenarios.js`), against each demo's real dev server:
- Adding a statement via the visual editor produces the expected JSON in
  the text editor.
- Typing a program into the text editor updates the visual editor.
- Removing a statement via the visual editor updates the text editor's
  JSON.
- Undoing via the menu reverts the last visual edit.

Not yet covered (left for follow-up, see main bug report for the underlying
bugs each of these would pin down): program hot-swap after mount,
manual-sync save flow, expression dialog editing in true E2E (covered at
the component-test level only), redo (undo's counterpart), text-editor JSON
round-trip through a full save/reload cycle. Each demo's default program
and language are hardcoded and there is no client-side way to override them
without a backend, which also limits E2E scenarios to whatever the default
language's single addable "cmd" statement (`PowerStrip.toggle`) can
exercise.
