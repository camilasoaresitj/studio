/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@googlemaps/js-api-loader']
  },
  trailingSlash: true,
  skipTrailingSlashRedirect: true
}

module.exports = nextConfig