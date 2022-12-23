const path = require('path')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const TerserJSPlugin = require('terser-webpack-plugin')

var getPath = function (pathToFile) {
  return path.resolve(__dirname, pathToFile)
}

module.exports = (env) => {
  var config = {}
  var isProduction = env ? env.mode === 'production' : false
  config.optimization = {
    minimize: true,
    minimizer: [new TerserJSPlugin({}), new CssMinimizerPlugin()],
    splitChunks: {
      chunks: "async",
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      automaticNameDelimiter: "~",
      name: false,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
  }
  config.context = getPath('./src/')
  config.resolve = {
    extensions: ['.ts', '.js', '.scss'],
    modules: [path.join(__dirname, 'ts/'), 'node_modules'],
  }
  config.module = {
    rules: [
      {
        test: /\.(scss|css)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              url: false,
            }            
          },
          "postcss-loader",
          {
            loader: "sass-loader",
          },
        ],
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: [/node_modules/],
      },
    ],
  }

  config.watchOptions = {
    aggregateTimeout: 200,
    poll: 1000,
    ignored: /node_modules/,
  }

  config.plugins = [
    new webpack.DefinePlugin({
      PRODUCTION: JSON.stringify('production'),
			version: JSON.stringify(require('./package.json').version),
      environment: JSON.stringify(env.mode),
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
      ignoreOrder: false,
    }),
  ]
  config.entry = {
    quickhellou: ['./ts/web_app.ts'],
    home: ['./ts/home.ts'],
  }
  config.output = {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].js',
  }

  return config
}
