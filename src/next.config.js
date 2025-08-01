

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
        /Module not found: Can't resolve '@opentelemetry\/winston-transport'/,
        /Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/
    ];
    return config;
  }
}

module.exports = nextConfig





