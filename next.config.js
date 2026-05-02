/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração necessária para compatibilidade com Cloudflare Pages em 2026
  images: {
    unoptimized: true,
  },
  // Garante que o roteamento funcione corretamente no ambiente de funções
  experimental: {
    serverComponentsExternalPackages: ["@opennextjs/cloudflare"],
  },
};

module.exports = nextConfig;
