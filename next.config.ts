import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Configuration Sentry
const sentryWebpackPluginOptions = {
  // Supprime les logs de build Sentry
  silent: true,

  // Organisation et projet Sentry (configurés via env)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload des source maps pour un meilleur debugging
  widenClientFileUpload: true,

  // Cache les source maps en production
  hideSourceMaps: true,

  // Transpile le SDK pour compatibilité
  transpileClientSDK: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
