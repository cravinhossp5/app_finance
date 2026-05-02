/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // No Next 15, essa chave saiu de 'experimental' para o nível principal
  serverExternalPackages: ["@opennextjs/cloudflare"],
};

module.exports = nextConfig;
