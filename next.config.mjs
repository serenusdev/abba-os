import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: blob: https://lh3.googleusercontent.com https://images.unsplash.com; connect-src 'self' https://*.supabase.co https://fcm.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
        ],
      },
    ];
  },
  webpack: (config) => {
    // Webpack resolves @capacitor packages to a non-existent root index.js.
    // Explicitly alias them to their real CJS entry points.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@capacitor/core': path.resolve(
        __dirname,
        'node_modules/@capacitor/core/dist/index.cjs.js'
      ),
      '@capacitor/push-notifications': path.resolve(
        __dirname,
        'node_modules/@capacitor/push-notifications/dist/plugin.cjs.js'
      ),
    };
    return config;
  },
};

export default nextConfig;
