const ios = process.env.BUILD_TARGET === 'ios';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The iPhone app is the same game exported as static files and wrapped by Capacitor (`npm run build:ios`).
  // The web build on Vercel is left alone.
  ...(ios ? { output: 'export', trailingSlash: true, images: { unoptimized: true } } : {}),
  // Web build: long-lived caching for the files that never change, so a returning visitor costs the host almost nothing.
  ...(ios
    ? {}
    : {
        async headers() {
          return [
            { source: '/flags/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
            { source: '/(logo.png|icon.png|apple-icon.png)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
            { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
          ];
        },
      }),
};

export default nextConfig;
