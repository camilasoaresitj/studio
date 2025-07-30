
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: [
    'genkit',
    '@genkit-ai/googleai',
  ],
  webpack: (config, { isServer }) => {
    // Ignore warning from handlebars library
    config.externals.push('handlebars');
    return config;
  },
}

module.exports = nextConfig
