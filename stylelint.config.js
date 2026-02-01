export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: ["dist/**", "node_modules/**"],
  rules: {
    // Allow BEM naming conventions (e.g., .block__element--modifier)
    "selector-class-pattern":
      "^[a-z]([a-z0-9-]+)?(__([a-z0-9]+-?)+)?(--([a-z0-9]+-?)+){0,2}$",
    // Allow string imports without url() wrapper
    "import-notation": null,
  },
};
