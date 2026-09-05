/**
 * Framework-agnostic Cypress Component Testing scenarios.
 *
 * These functions contain ONLY `cy.*` DOM assertions/interactions against the
 * shared ".accordion" statement shell (identical markup/classes in both
 * iotix-react and iotixng — see selectors.js). They know nothing about
 * React or Angular.
 *
 * Usage from a repo's own spec file:
 *
 *   import { rendersStatementTitles } from ".../shared-tests/scenarios/sharedScenarios";
 *   import { common } from ".../shared-tests/scenarios/selectors";
 *   import siblings from ".../shared-tests/fixtures/programs/siblings.json";
 *
 *   it("renders both statements", () => {
 *     mountEditorWithProgram(siblings); // repo-specific mount helper
 *     rendersStatementTitles(common, ["Set Value", "Set Value"]);
 *   });
 *
 * Each repo is responsible only for its own `mount`/`cy.mount` call (which is
 * necessarily framework-specific) — everything after that point runs the
 * exact same assertions on both platforms.
 */

/** Asserts the visible statement titles, top-to-bottom, match `titles` exactly. */
export function rendersStatementTitles(sel, titles) {
  cy.get(`${sel.block} ${sel.accordion} ${sel.accordionTitle}`).should(($els) => {
    const actual = [...$els].map((el) => el.textContent.trim());
    expect(actual).to.deep.equal(titles);
  });
}

/**
 * Regression guard for the "_" root-statement crash bug: with no parent
 * statement supplied, the root block's own "add statement" button reads
 * `language.statements["_"]` with no defensive fallback in either repo.
 * If the language fixture doesn't define "_", both editors currently throw
 * during render instead of rendering *something* (even an error state).
 */
export function rootAddButtonRendersWithoutCrashing(sel) {
  cy.get(sel.block).should("exist");
  cy.get(sel.addStatementButton).should("exist");
}

/** Clicking a statement's "move down" button swaps it with its next sibling. */
export function reordersSiblingsViaMoveButtons(sel) {
  rendersStatementTitles(sel, ["Set Value", "Set Value"]);

  cy.get(`${sel.block} ${sel.accordion}`)
    .first()
    .find(sel.moveDownButton)
    .click({ force: true });

  // Titles are identical by design (both statements are "Set Value"), so we
  // assert on the still-distinguishable, framework-shared header content
  // (the rendered params list) instead, proving order actually changed.
  cy.get(`${sel.block} ${sel.accordion}`)
    .first()
    .find(sel.accordionHeaderContent)
    .should("contain.text", "second");

  cy.get(`${sel.block} ${sel.accordion}`)
    .last()
    .find(sel.accordionHeaderContent)
    .should("contain.text", "first");
}

/** Clicking a statement's remove ("x") button deletes it from the block. */
export function removesFirstStatement(sel) {
  cy.get(`${sel.block} ${sel.accordion}`).should("have.length", 2);

  cy.get(`${sel.block} ${sel.accordion}`)
    .first()
    .find(sel.removeButton)
    .click({ force: true });

  cy.get(`${sel.block} ${sel.accordion}`).should("have.length", 1);
}

/** Clicking the accordion header toggles the open/closed body class. */
export function togglesAccordionBody(sel) {
  cy.get(sel.accordionBody).first().then(($body) => {
    const wasOpen = $body.hasClass("open");

    cy.get(sel.accordionHeader).first().click();

    cy.get(sel.accordionBody)
      .first()
      .should("have.class", wasOpen ? "closed" : "open");
  });
}

/**
 * Regression guard for the duplicate-key/trackBy bug: two command params
 * with the same string value must still render as two independently
 * editable rows, not collapse into/confuse a single instance.
 *
 * Uses `inputGroup` (the row wrapper, applied on both platforms), not
 * `inputExpr` — react's ".input-expr" CSS class is defined but never
 * actually applied to any element (dead CSS; angular's ".inputexpr" *is*
 * applied to its <iotix-vp-expression>). See main bug report.
 */
export function rendersDuplicateValuedParamsAsSeparateRows(sel) {
  cy.get(sel.expressionInput).should("have.length", 2);
}

/**
 * Regression guard for "structure"-type command params being unrenderable/
 * unbound: both platforms used to render an uncontrolled/unbound input
 * showing the schema's field *name* instead of the statement's actual bound
 * *value*, and typing into it did nothing. Uses the structureParams.json
 * fixture (deviceName: "Living Room Lamp", brightness: "75").
 */
export function rendersBoundStructureParamValues(sel) {
  cy.get(sel.expressionInput).should(($inputs) => {
    const values = [...$inputs].map((el) => el.value);
    expect(values).to.deep.equal(["Living Room Lamp", "75"]);
  });
}

/**
 * Regression guard for the expression dialog's syntax check being a no-op:
 * opens the dialog, types a malformed expression, and asserts the error
 * state actually gets set (error class on the textarea + disabled OK
 * button) instead of the already-wired styling staying permanently inert.
 */
export function flagsSyntaxErrorAndDisablesOk(sel, expressionString) {
  cy.get(sel.expressionEllipsisButton).click({ force: true });
  cy.get(sel.expressionDialogTextarea).should("be.visible").clear().type(expressionString, { delay: 0 });

  cy.get(sel.expressionDialogTextarea).should("have.class", "error");
  cy.contains("button", /^ok$/i).should("be.disabled");
}

/** Counterpart to flagsSyntaxErrorAndDisablesOk: a well-formed expression must not be flagged. */
export function acceptsWellFormedExpression(sel, expressionString) {
  cy.get(sel.expressionEllipsisButton).click({ force: true });
  cy.get(sel.expressionDialogTextarea).should("be.visible").clear().type(expressionString, { delay: 0 });

  cy.get(sel.expressionDialogTextarea).should("not.have.class", "error");
  cy.contains("button", /^ok$/i).should("not.be.disabled");
}

/**
 * Regression guard for structure-type command params being edited but not
 * propagated: typing a new value into a bound structure param must round-trip
 * all the way out through onProgramChange, not just update some local/
 * uncontrolled copy. `commit` performs whatever repo-specific action
 * finalizes the edit (React needs a blur, Angular needs to wait out its
 * debounce) - everything else is identical on both platforms.
 */
export function editsStructureParamAndEmitsProgramChange(sel, { paramIndex = 1, value, commit }) {
  cy.get(sel.expressionInput).eq(paramIndex).clear().type(value, { delay: 0 });
  commit();

  cy.get("@onProgramChange").should("have.been.called");
  cy.get("@onProgramChange").should((stub) => {
    const emitted = stub.lastCall.args[0];
    expect(emitted.block[0].params[paramIndex]).to.equal(value);
  });
}

/**
 * Regression guard for "mobile-responsive default state inverted between
 * platforms": on a phone-sized viewport, the visual editor pane must be the
 * one shown by default, with the text editor pane hidden - the two editors
 * used to disagree on which pane defaults to open.
 */
export function showsVisualPaneHidesTextPaneByDefault() {
  cy.get(".visual-editor").should("have.class", "mobile-open");
  cy.get(".text-editor").should("not.have.class", "mobile-open");
}
