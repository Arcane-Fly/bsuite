import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  // Covers BOTH shared packages. page-builder's stories are read from source
  // rather than through a dependency, so the card-surface defect classes are
  // visible here without @bsuite/ui taking a dependency on the grid.
  stories: ['../src/**/*.stories.tsx', '../../page-builder/src/**/*.stories.tsx'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {},
  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [tailwindcss()],
    }),
}

export default config
