export { default as tailwindPreset } from './tailwind/preset';
export { createAngiAppConfig } from './vite/app';
export { angisoftLint } from './eslint';

export const TS_CONFIG_APP = {
  compilerOptions: {
    target: 'ES2022',
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    moduleResolution: 'bundler',
    jsx: 'react-jsx',
    strict: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    isolatedModules: true,
    allowJs: false,
  },
};

export default TS_CONFIG_APP;