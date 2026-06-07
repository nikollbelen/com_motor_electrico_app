/** @type { import('@storybook/html-webpack5').StorybookConfig } */
const config = {
  stories: [
    "../app/js/components/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-links"
  ],
  framework: {
    name: "@storybook/html-webpack5",
    options: {}
  },
  staticDirs: ["../app"]
};

export default config;