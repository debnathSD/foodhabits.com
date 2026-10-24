import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json, plus the base path for published web builds: GitHub Pages serves
 * the web app from /foodhabits.com/app, set with APP_BASE_URL at export time.
 * Local development stays at the root.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: {
    ...config.experiments,
    ...(process.env.APP_BASE_URL ? { baseUrl: process.env.APP_BASE_URL } : {}),
  },
});
