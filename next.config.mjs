import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
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
