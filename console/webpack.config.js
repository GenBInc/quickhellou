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
  config.context = getPath("quickhellou/static")
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

  config.plugins = [
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[name].css",
    }),
	new CopyPlugin({
      patterns: [
        { from: './js/embed/widget_content_script.js', to: '../quickhellou/static/js/embed' },
        { from: './js/widget.js', to: '../quickhellou/static/js' },
        { from: './js/dashboard.js', to: '../quickhellou/static/js' },
      ]
    })
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
    path: getPath("quickhellou/quickhellou/static"),
    filename: "[name].js",
    chunkFilename: "[id].js",
  }

  return config
}
