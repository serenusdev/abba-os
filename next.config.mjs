/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.NEXT_PUBLIC_CAPACITOR_BUILD === 'true';

const nextConfig = {
  ...(isCapacitorBuild ? { output: 'export' } : {}),
  reactStrictMode: true,
  images: {
    ...(isCapacitorBuild ? { unoptimized: true } : {}),
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
