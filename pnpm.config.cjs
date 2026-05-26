/** @type {import('pnpm').ProjectManifest} */
module.exports = {
  onlyBuiltDependencies: [
    '@prisma/client',
    '@prisma/engines',
    '@sentry/cli',
    'esbuild',
    'msw',
    'prisma',
    'sharp',
    'unrs-resolver',
  ],
  overrides: {
    rollup: '>=3.30.0',
  },
}
