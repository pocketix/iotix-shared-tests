/**
 * DOM selectors for the shared accordion "Statement" shell.
 * Verified identical class names in both iotix-react's Statement.tsx/.css
 * and iotixng's iotix-vp-statement.component.html/.css.
 *
 * A handful of nested classes differ cosmetically between the two
 * implementations (documented under `perRepo` below) — scenario code should
 * prefer `common` selectors, and only fall back to `perRepo[repo]` when a
 * behavior truly has no shared markup yet (that gap is itself worth fixing
 * for parity, see iotix-shared-tests/README.md).
 */
export const common = {
  block: ".block",
  accordion: ".accordion",
  accordionHeader: ".accordion-header",
  accordionTitle: ".accordion-title",
  accordionHeaderContent: ".accordion-header-content",
  accordionBody: ".accordion-body",
  accordionButtons: ".accordion-button",
  moveUpButton: ".pi-sort-up",
  moveDownButton: ".pi-sort-down",
  removeButton: ".accordion-header-right .pi-times",
  addStatementButton: ".block > .p-button, .block > button",
  recommendationItem: ".recommendation-item",
  expressionInput: "input.input-field",
};

// Cosmetic class-name divergences between the two implementations
// (functionally equivalent, but not literally the same string).
export const perRepo = {
  react: {
    inputGroup: ".input-group",
    inputExpr: ".input-expr",
  },
  angular: {
    inputGroup: ".inputgroup",
    inputExpr: ".inputexpr",
  },
};
