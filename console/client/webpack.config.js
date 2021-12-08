const path = require("path")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const CopyPlugin = require('copy-webpack-plugin')

// eslint-disable-next-line func-names
var getPath = function (pathToFile) {
  return path.resolve(__dirname, pathToFile)
}

module.exports = () => {
  var config = {}
  config.context = getPath("src")
  config.devtool = "source-map"
  config.module = {
    rules: [
      {
        test: /\.(scss|css)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
          },
          "postcss-loader",
          {
            loader: "sass-loader",
          },
        ],
      },
      {
        test: /\.js$/,
        loader: "babel-loader",
        exclude: /(node_modules|bower_components)/,
        options: {
          plugins: [
            "@babel/plugin-proposal-class-properties",
            "@babel/plugin-transform-object-assign",
            "@babel/plugin-transform-runtime",
          ],
          presets: ["@babel/preset-env"],
        },
      },
      {
        test: /\.svg/,
        type: 'asset/resource'
      }
    ],
  }

  config.optimization = {
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
    minimize: true,
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
  }

  config.watch = true
  config.watchOptions = {
    aggregateTimeout: 200,
    poll: 1000,
    ignored: /node_modules/,
  }
  config.plugins = [
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[name].css",
    }),
  ]
  config.entry = {
    "js/mdc": "./js/mdc.js",
    "js/accounts": "./js/accounts.js",
    "css/accounts": "./scss/accounts.scss",
    "css/widget": "./scss/widget.scss",
    "js/dashboard": "./js/dashboard.js",
    "js/widget": "./js/widget.js",
    "js/embed/widget_content_script": "./js/embed/widget_content_script.js",
    "css/dashboard": "./scss/dashboard.scss"
  }
  config.output = {
    path: path.resolve(__dirname, 'dist'),
    filename: "[name].js",
  }

  return config
}
