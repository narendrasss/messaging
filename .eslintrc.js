module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true
  },
  extends: ["plugin:prettier/recommended"],
  plugins: ["prettier"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly"
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    "prettier/prettier": "error"
  }
};
