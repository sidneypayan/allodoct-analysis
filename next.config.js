/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ne pas essayer de bundler ces modules Node.js côté client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }

    // Exclure pyodide du bundle, on le chargera via CDN
    config.externals = config.externals || []
    config.externals.push({
      pyodide: 'pyodide',
    })

    return config
  },
}

module.exports = nextConfig
