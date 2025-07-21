/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@googlemaps/js-api-loader']
  }
}

module.exports = nextConfig
