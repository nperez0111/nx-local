const { composePlugins, withNx } = require('@nx/next');
// require("./src/env");

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  reactStrictMode: true,

  nx: {
    // Set this to true if you would like to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },

  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

// export default composePlugins(...plugins)(nextConfig);
module.exports = composePlugins(...plugins)(nextConfig);
