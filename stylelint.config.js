export default {
  extends: ["stylelint-config-standard-scss"],
  ignoreFiles: ["dist/**", "node_modules/**"],
  rules: {
    // Allow camelCase (CSS Modules), kebab-case, and BEM naming conventions
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9-]*(__[a-z][a-zA-Z0-9-]*)?(--[a-z][a-zA-Z0-9-]*)?$",
      {
        message:
          "Expected class selector to be camelCase, kebab-case, or BEM format",
      },
    ],
    // Allow string imports without url() wrapper
    "import-notation": null,
    // Disable for SCSS files - custom functions like to-rem() are valid SCSS
    // but Stylelint doesn't understand them without complex configuration
    "declaration-property-value-no-unknown": null,
    // Allow :global() pseudo-class used by CSS Modules
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
    // Allow container query media features
    "media-feature-name-no-unknown": [
      true,
      {
        ignoreMediaFeatureNames: ["inline-size", "block-size"],
      },
    ],
    // Allow global SCSS functions (legacy syntax still works)
    "scss/no-global-function-names": null,
    // Allow deprecated clip property (needed for some animations)
    "property-no-deprecated": null,
    // Relax comment formatting
    "comment-empty-line-before": null,
    // Relax declaration formatting
    "declaration-empty-line-before": null,
    // Allow legacy color function notation
    "color-function-notation": null,
    "color-function-alias-notation": null,
    "alpha-value-notation": null,
  },
};
