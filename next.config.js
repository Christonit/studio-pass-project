import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the project root (there is an unrelated package-lock.json in the home folder).
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
};

export default nextConfig;
