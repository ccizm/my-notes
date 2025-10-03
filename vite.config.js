import { defineConfig } from 'vite';
import { resolve } from 'path';
import * as fs from 'fs';
const { copyFileSync, existsSync } = fs;

export default {
  build: {
    rollupOptions: {
      input: {
        'background': 'src/background.js',
        'content-script': 'src/content-script.js',
        'main': 'src/main.js',
        'note-app-css': 'src/note-app.css'
      },
      output: {
        dir: 'dist',
        entryFileNames: 'src/[name].js',
        chunkFileNames: 'src/[name].js',
        assetFileNames: 'src/[name].[ext]',
      },
    },
    outDir: 'dist',
  },
  plugins: [
    {
      name: 'copy-extension-files',
      closeBundle() {
          // 复制必要的文件到dist目录
          // 现在所有JS文件都打包在main.js中，所以只需要复制非JS文件
          const filesToCopy = [
            'manifest.json',
            'src/note-app.html'
          ];
          
          
          // 复制图标目录
          try {
            const iconsDir = 'src/icons';
            const destIconsDir = 'dist/src/icons';
            if (existsSync(iconsDir)) {
              // 创建目标目录
              if (!existsSync(destIconsDir)) {
                fs.mkdirSync(destIconsDir, { recursive: true });
              }
              
              // 复制所有图标文件
              const iconFiles = fs.readdirSync(iconsDir);
              iconFiles.forEach(iconFile => {
                const srcPath = `${iconsDir}/${iconFile}`;
                const destPath = `${destIconsDir}/${iconFile}`;
                if (fs.statSync(srcPath).isFile()) {
                  copyFileSync(srcPath, destPath);
                  console.log(`Copied icon: ${srcPath} -> ${destPath}`);
                }
              });
            }
          } catch (err) {
            console.warn('Could not copy icons directory:', err.message);
          }
        
        filesToCopy.forEach(file => {
          try {
            if (existsSync(file)) {
              copyFileSync(file, `dist/${file}`);
            } else {
              console.warn(`Skipping non-existent file: ${file}`);
            }
          } catch (err) {
            console.warn(`Could not copy ${file}:`, err.message);
          }
        });
      }
    }
  ]
};