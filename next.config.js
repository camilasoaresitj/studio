
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: [
    '@genkit-ai/core',
    '@genkit-ai/googleai',
  ],
}

module.exports = nextConfig
