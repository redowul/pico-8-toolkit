const path = require('path');

/** @type {import('webpack').Configuration[]} */
module.exports = [
  // Extension (main entry point)
  {
    target: 'node',
    mode: 'production',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
    },
    devtool: 'source-map',
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.js'],
       alias: {
        commands: path.resolve(__dirname, 'src/commands'),
        p8Combiner: path.resolve(__dirname, 'src/p8Combiner.ts'),
        utils: path.resolve(__dirname, 'src/utils.ts'),
        tokenStatus: path.resolve(__dirname, 'src/tokenStatus.ts'),
        pico8ProcessManager: path.resolve(__dirname, 'src/pico8ProcessManager.ts'),
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        }
      ]
    },
    ignoreWarnings: [
      {
        message: /Critical dependency: require function is used in a way/,
      },
    ],
  },

  // Language server
  {
    target: 'node',
    mode: 'production',
    entry: './src/server.ts',
    output: {
      filename: 'server.js',
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs2'
    },
    devtool: 'source-map',
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        }
      ]
    }
  }
];
