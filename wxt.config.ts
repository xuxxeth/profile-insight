import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'output',
  outDirTemplate: '',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Profile Insight',
    short_name: 'Insight',
    description: '免费分析海外客户主页，生成客户画像、活跃时间和个性化沟通建议；使用您自己的大模型 API。',
    minimum_chrome_version: '114',
    action: { default_title: 'Profile Insight' },
    options_ui: { page: 'options.html', open_in_tab: true },
    permissions: ['storage', 'sidePanel'],
    optional_host_permissions: ['https://*/*'],
    host_permissions: [
      'https://x.com/*',
      'https://twitter.com/*',
      'https://www.linkedin.com/*',
    ],
  },
});
