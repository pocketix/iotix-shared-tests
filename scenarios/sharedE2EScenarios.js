/**
 * Framework-agnostic Cypress E2E scenarios, run against each repo's real
 * running demo app (cy.visit, not cy.mount) - see sharedScenarios.js for the
 * Component Testing equivalents. These deliberately never click the
 * "Evaluate" trigger button, since that hits an external backend outside
 * this repo's scope; instead they use the visual/text editor panes'
 * round-trip JSON as the ground truth.
 *
 * Usage from a repo's own E2E spec file:
 *
 *   import * as e2e from ".../shared-tests/scenarios/sharedE2EScenarios";
 *   import { common } from ".../shared-tests/scenarios/selectors";
 *
 *   beforeEach(() => {
 *     cy.visit("/");
 *     e2e.revealsTextEditorPane(common);
 *   });
 *
 *   it("...", () => {
 *     e2e.addsStatementViaVisualEditorProducesExpectedJson(common, {
 *       statementLabel: "PowerStrip.toggle",
 *       confirmButtonLabel: "Add", // "Ok" on iotixng
 *       expectedName: "PowerStrip.1",
 *     });
 *   });
 *
 * Both demos' default program/language are used as-is (there is no
 * client-side way to override them without a backend) - PowerStrip.toggle is
 * currently the only addable "cmd" statement either default language
 * defines.
 */

/** Reveals the text editor pane alongside the visual editor (both default to visual-only). */
export function revealsTextEditorPane(sel) {
  cy.get(sel.menuToggleTextButton).click();
  cy.get(sel.programTextArea).should("be.visible");
}

/**
 * The root Block's own "+" button is always the LAST match for
 * `sel.addStatementButton` in document order: a ".block" div exists at
 * every nesting level (each compound statement's inner block renders its
 * own), but each one's own trailing "+" button is necessarily its very last
 * child, so any nested "+" button always closes before the root's -
 * regardless of how many statements or how much nesting exists. Both demos'
 * default programs are deeply nested, so this must be `.last()`, never
 * `.first()`.
 */
function clickRootAddStatementButton(sel) {
  cy.get(sel.addStatementButton).last().click();
}

function addStatementViaDialog(sel, statementLabel, confirmButtonLabel) {
  clickRootAddStatementButton(sel);
  cy.get(sel.addStatementDropdownTrigger).click();
  cy.contains(sel.addStatementSuggestionItem, statementLabel).click();
  cy.contains("button", confirmButtonLabel).click();
}

/** Adding a statement via the visual editor must produce the expected shape in the text editor's JSON. */
export function addsStatementViaVisualEditorProducesExpectedJson(sel, { statementLabel, confirmButtonLabel, expectedName }) {
  addStatementViaDialog(sel, statementLabel, confirmButtonLabel);

  // The text editor's JSON view is the bare `block` array (both demos'
  // TextEditor serializes program.block directly, not a {block: [...]}
  // wrapper), so the newly-added statement is its last element.
  cy.get(sel.programTextArea).invoke("val").should((value) => {
    const block = JSON.parse(value);
    const added = block[block.length - 1];
    expect(added.name).to.equal(expectedName);
  });
}

/** Typing a program into the text editor must update the visual editor's rendered statements. */
export function typesProgramIntoTextEditorUpdatesVisualEditor(sel, { typedBlock, expectedTitle }) {
  cy.get(sel.programTextArea).clear().type(JSON.stringify(typedBlock), { parseSpecialCharSequences: false, delay: 0 });

  cy.get(sel.accordionTitle).should("contain.text", expectedTitle);
}

/**
 * Removing a statement via the visual editor must be reflected in the text
 * editor's JSON. Adds a statement first (via the same helper as above) so
 * there is a statement to remove without depending on the pre-existing
 * default program's shape - the newly-added statement is a leaf (no nested
 * block of its own) appended as the root Block's last child, so its own
 * remove button is likewise the last match for `sel.removeButton` in
 * document order.
 */
export function removesLastAddedStatementViaVisualEditorUpdatesJson(sel, { statementLabel, confirmButtonLabel }) {
  cy.get(sel.programTextArea).invoke("val").then((before) => {
    const originalLength = JSON.parse(before).length;

    addStatementViaDialog(sel, statementLabel, confirmButtonLabel);

    cy.get(sel.programTextArea).invoke("val").should((value) => {
      expect(JSON.parse(value).length).to.equal(originalLength + 1);
    });

    cy.get(sel.removeButton).last().click({ force: true });

    cy.get(sel.programTextArea).invoke("val").should((value) => {
      expect(JSON.parse(value).length).to.equal(originalLength);
    });
  });
}

/**
 * Undoing via the menu's undo button must revert the last visual edit,
 * verified through the text editor's JSON length rather than the visual
 * tree directly, so this stays agnostic to exactly where the added
 * statement rendered.
 */
export function undoesLastVisualEditRevertingJsonLength(sel, { statementLabel, confirmButtonLabel }) {
  cy.get(sel.programTextArea).invoke("val").then((before) => {
    const originalLength = JSON.parse(before).length;

    addStatementViaDialog(sel, statementLabel, confirmButtonLabel);

    cy.get(sel.programTextArea).invoke("val").should((value) => {
      expect(JSON.parse(value).length).to.equal(originalLength + 1);
    });

    cy.get(sel.menuUndoButton).click();

    cy.get(sel.programTextArea).invoke("val").should((value) => {
      expect(JSON.parse(value).length).to.equal(originalLength);
    });
  });
}
