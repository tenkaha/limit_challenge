import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The vehicles search is the home screen. A routing-level redirect (307, not
  // cached) keeps "/" free to become its own page later and forwards query strings.
  async redirects() {
    return [{ source: '/', destination: '/vehicles', permanent: false }];
  },
};

export default nextConfig;
