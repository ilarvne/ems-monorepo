/** @type {import("prettier").Config} */
export default {
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  trailingComma: 'none',
  semi: false,
  singleQuote: true,
  jsxSingleQuote: true,
  singleAttributePerLine: false,
  arrowParens: 'always',

  importOrder: [
    '<THIRD_PARTY_MODULES>',
    '^@/components/(.*)$',
    '^@/layout/(.*)$',
    '^@/ui/(.*)$',
    '^@/providers/(.*)$',
    '^@/lib/(.*)$',
    '^@/constants/(.*)$',
    '^@/types/(.*)$',
    '^@/assets/(.*)$',
    '^@/config/(.*)$',
    '^@/store/(.*)$',
    '^@/hooks/(.*)$',
    '^@/utils/(.*)$',
    '^@/services/(.*)$',
    '^@/api/(.*)$',
    '^../(.*)',
    '^./(.*)',
    '^[./]',
    '(.scss)$'
  ],

  importOrderSeparation: true,
  importOrderSortSpecifiers: false,

  plugins: ['@trivago/prettier-plugin-sort-imports']
}
