import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Optimize i18n: don't bundle all locales together
  webpack: (config, { isServer }) => {
    // Optimize locale JSON loading
    if (!isServer) {
      // Split locale files into separate chunks
      config.module.rules.push({
        test: /\.json$/,
        include: /locales/,
        type: 'javascript/auto',
        use: [
          {
            loader: 'json-loader',
            options: {
              namedExports: false,
            },
          },
        ],
      });
    }
    return config;
  },
};

export default nextConfig;
