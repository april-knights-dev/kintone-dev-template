const path = require('path');
// eslint-disable-next-line node/no-unpublished-require
const glob = require('glob');
// eslint-disable-next-line node/no-extraneous-require
const TerserPlugin = require('terser-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const basePath = path.resolve('src', 'apps');

// basePath配下の各ディレクトリを複数のentryとする
const entries = glob.sync('**/index.js', { cwd: basePath }).reduce(
  (prev, file) => ({
    ...prev,
    [path.dirname(file)]: path.resolve(basePath, file),
  }),
  {}
);

module.exports = {
  entry: entries,
  resolve: {
    modules: ['node_modules'],
    fallback: {
      fs: false,
      // eslint-disable-next-line node/no-unpublished-require
      os: require.resolve('os-browserify/browser'),
    },
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  useBuiltIns: 'usage',
                  corejs: 3,
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.(sa|sc|c)ss$/,
        exclude: /node_modules/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: { url: false },
          },
          {
            loader: 'sass-loader',
            options: {
              // eslint-disable-next-line node/no-unpublished-require
              implementation: require('sass'),
              // sassOptions: {
              //   fiber: require('fibers'),
              // },
            },
          },
        ],
      },
    ],
  },
  watchOptions: {
    ignored: /node_modules/,
    poll: 5000, // 5秒ごとにチェック
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  plugins: [new NodePolyfillPlugin()],
  performance: {
    maxEntrypointSize: 2000000,
    maxAssetSize: 2000000,
  }
};
