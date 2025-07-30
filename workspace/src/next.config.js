
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
    // Ignore warning from handlebars library and opentelemetry
    config.externals.push('handlebars');
    config.externals.push('@opentelemetry/instrumentation');
    return config;
  },
}

module.exports = nextConfig
