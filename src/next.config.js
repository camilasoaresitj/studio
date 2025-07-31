
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: [
    'genkit',
    '@genkit-ai/ai',
    '@genkit-ai/core',
    '@genkit-ai/googleai',
    '@genkit-ai/firebase',
    '@genkit-ai/google-cloud',
  ],
}

module.exports = nextConfig

