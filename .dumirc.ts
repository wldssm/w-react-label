import { defineConfig } from 'dumi';

export default defineConfig({
  outputPath: 'docs-dist',
  base: '/w-react-label/', // 必须是仓库名路径
  publicPath: '/w-react-label/',
  themeConfig: {
    name: 'w-react-label',
  },
  favicons: ['/w-react-label/favicon.png'],
  logo: '/w-react-label/logo.png',
  styles: [
    `.dumi-default-header-left {
       width: 220px !important;
    }`,
  ],
});
