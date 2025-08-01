
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
  webpack: (config) => {
    config.ignoreWarnings = [
        /require\.extensions/, 
        /Critical dependency/,
        /Module not found: Can't resolve '@opentelemetry\/winston-transport'/,
        /Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/
    ];
    return config;
  }
}

module.exports = nextConfig
