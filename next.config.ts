import type { NextConfig } from 'next';

/**
 * Configuration Next.js — sécurité + images.
 *
 * - **Headers de sécurité** (HSTS, CSP, X-Frame-Options, Permissions-Policy…) :
 *   appliqués sur toutes les routes pour limiter la surface d'attaque.
 * - **CSP** un peu plus permissive en dev (HMR Next.js a besoin d'`unsafe-eval`).
 * - **next/image** : `picsum.photos` autorisé pour les placeholders du catalogue
 *   (à élargir quand on aura de vraies images produit).
 */

const isDev = process.env.NODE_ENV !== 'production';

const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "img-src 'self' https://loremflickr.com https://*.staticflickr.com data: blob:",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // RGESN-0049/0050 : formats modernes pour réduire les octets transférés.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'loremflickr.com' },
      // loremflickr redirige les requêtes d'image vers le CDN Flickr.
      { protocol: 'https', hostname: '**.staticflickr.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
