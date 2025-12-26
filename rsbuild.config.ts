import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  html: {
    template: './src/index.html',
  },
  source: {
    entry: {
      index: './src/main.ts',
    },
  },
  output: {
    assetPrefix: '/image-slicer/',
  },
});
