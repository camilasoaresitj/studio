
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
    // Ignore warning from handlebars library and opentelemetry which are dependencies of genkit
    if (!isServer) {
        config.externals = [...config.externals, 'handlebars', '@opentelemetry/instrumentation'];
    }
    return config;
  },
}

module.exports = nextConfig
