

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.google.com',
        port: '',
        pathname: '/mapfiles/ms/icons/**',
      },
       {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      }
    ],
  },
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
    ];
    // These are optional dependencies of genkit, we can ignore them
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@opentelemetry/exporter-jaeger': false,
      '@opentelemetry/winston-transport': false,
    };
    return config;
  }
}

module.exports = nextConfig
