/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Opcional, dependendo da configuração do Cloudflare Pages
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
