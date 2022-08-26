const path = require('path');
const svelte = require('rollup-plugin-svelte');
const sveltePreprocess = require('svelte-preprocess');
const css = require('rollup-plugin-css-only');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const alias = require('@rollup/plugin-alias');
const html = require('rollup-plugin-bundle-html-thomzz');
const { terser } = require('rollup-plugin-terser');

const isProduction = !process.env.ROLLUP_WATCH;

const config = {
  input: 'src/app/index.ts',
  output: {
    format: 'iife',
    name: 'app',
    file: 'dist/app/bundle.js'
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        sourceMap: !isProduction,
        postcss: {
          configFilePath: __dirname
        },
        scss: {
          includePaths: [
            'node_modules',
            '../../node_modules'
          ]
        }
      }),
      compilerOptions: {
        // enable run-time checks when not in isProduction
        dev: !isProduction
      },
    }),
    css({ output: 'bundle.css' }),
    resolve({
      browser: true,
      dedupe: ['svelte']
    }),
    commonjs(),
    html({
      template: path.join(__dirname, 'src/app/template.html'),
      dest: path.join(__dirname, 'dist/app'),
      filename: 'index.html',
      inline: isProduction,
      minifyCss: isProduction,
      clean: isProduction,
    }),
    alias({
      entries: [
        { find: '~', replacement: __dirname }
      ]
    }),
  ]
};

if (isProduction) {
  config.plugins.push(
    terser({
      output: { comments: false },
      compress: {
        passes: 10
      },
      ecma: 5,
    }),
  );
}

module.exports = config;
