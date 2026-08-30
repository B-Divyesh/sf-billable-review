import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

const buildCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(buildCommit)
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
