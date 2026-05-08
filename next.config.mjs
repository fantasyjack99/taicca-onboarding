/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Allow serving uploaded photos from the uploads directory
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve-upload/:path*',
      },
    ]
  },
}

export default nextConfig
