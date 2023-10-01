import { defineConfig } from 'dumi';

export default defineConfig({
  outputPath: 'docs-dist',
  themeConfig: {
    name: 'w-react-label',
  },
  favicons: ['/favicon.png'],
  logo: '/logo.png',
  styles: [
    `.dumi-default-header-left {
       width: 220px !important;
    }`,
  ],
});
