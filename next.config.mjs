/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pack generation can take a while (plugin downloads + zipping) now that
  // it runs synchronously inside an API route — give it room before the
  // platform/reverse-proxy would otherwise time it out.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
