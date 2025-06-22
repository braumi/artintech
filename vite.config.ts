import { defineConfig } from 'vite';
import { writeFileSync, existsSync, mkdirSync, cpSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    host: true,
    open: true,
  },
  plugins: [
    {
      name: 'copy-assets-and-redirects',
      writeBundle() {
        const distDir = join(process.cwd(), 'dist');
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }
        
        // Copy image folders to dist
        const imageFolders = ['house views', 'suggestions', 'components'];
        imageFolders.forEach(folder => {
          const srcPath = join(process.cwd(), folder);
          const destPath = join(distDir, folder);
          if (existsSync(srcPath)) {
            cpSync(srcPath, destPath, { recursive: true });
            console.log(`Copied ${folder} to dist/`);
          }
        });
        
        // Create _redirects file for Netlify
        const redirectsContent = '/*    /index.html   200';
        const redirectsPath = join(distDir, '_redirects');
        
        writeFileSync(redirectsPath, redirectsContent);
        console.log('Created _redirects file for Netlify');
      }
    }
  ]
}); 