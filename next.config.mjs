/** @type {import('next').NextConfig} */

// Content-Security-Policy. All rendered content is user-submitted recipe data,
// so this is the second line of defense behind React's escaping. Next injects
// inline bootstrap scripts/styles, so 'unsafe-inline' is required in script-src
// without a nonce middleware; 'unsafe-eval' is dropped because it is only needed
// by dev tooling, not the production runtime. connect-src covers Supabase (data)
// and Upstash (rate limit).
//
// FOLLOW-UP: a nonce-based CSP (which would let us drop 'unsafe-inline' from
// script-src entirely) is the recommended hardening step. It requires a
// middleware.ts that generates a per-request nonce and threads it through Next's
// inline bootstrap scripts. It is deliberately deferred here because it must be
// verified against a real `next build`/runtime — removing 'unsafe-inline' without
// a working nonce can white-screen the app — and that verification isn't possible
// in this sandbox (node_modules is incomplete).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.upstash.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
