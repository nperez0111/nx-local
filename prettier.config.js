/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions & import('@trivago/prettier-plugin-sort-imports').PrettierConfig} */
const config = {
  plugins: ['prettier-plugin-tailwindcss', '@trivago/prettier-plugin-sort-imports'],
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'all',
  importOrder: ['^@/(.*)$', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};

module.exports = config;
