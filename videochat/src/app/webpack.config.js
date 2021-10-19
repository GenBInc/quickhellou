const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
var WebpackAutoInject = require('webpack-auto-inject-version');
const TerserJSPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

var getPath = function (pathToFile) {
	return path.resolve(__dirname, pathToFile);
}

module.exports = env => {
	var config = {};
	var isProduction = env ? env.NODE_ENV === "production" : false;
	config.optimization = {
		minimize: true,
		minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})],
		splitChunks: {
			chunks: 'async',
			minSize: 30000,
			maxSize: 0,
			minChunks: 1,
			maxAsyncRequests: 5,
			maxInitialRequests: 3,
			automaticNameDelimiter: '~',
			name: true,
			cacheGroups: {
				vendors: {
					test: /[\\/]node_modules[\\/]/,
					priority: -10
				},
				default: {
					minChunks: 2,
					priority: -20,
					reuseExistingChunk: true
				}
			}
		}
  }
	config.context = getPath("./src/");
	config.resolve = {
		extensions: [".tsx", ".ts", ".js", ".scss"],
		modules: [
			path.join(__dirname, "ts/"),
			"node_modules"
		]
	};
	config.module = {
		rules: [{
				test: /\.(scss|css)$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader,
						options: {
							publicPath: "../css/"
						}
					},
					"css-loader",
					"postcss-loader",
					"sass-loader"
				]
			},
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
				exclude: [/node_modules/],
			}
		]
	};
	config.plugins = [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('production'),
			version: JSON.stringify(require("./package.json").version),
			environment:JSON.stringify(env.NODE_ENV)
		}),
		new MiniCssExtractPlugin({
			filename: 'css/[name].css',
      ignoreOrder: false,
		}),
		new CopyWebpackPlugin([
			{
				from: "**/*",
				to:"../build/html",
				context:"./html"
			},
			{
				from: "**/*",
				to:"../build/images",
				context:"./images"
			},
			{
				from: "**/*",
				to:"../../../src/py/qhv2/videochat/static/videochat/js",
				context:"./js"
			}
		])
	];
	config.entry = {
		'quickhellou': ['./ts/web_app.ts'],
		'home': ['./ts/home.ts']
	};
	config.output = {
		path: path.resolve(__dirname, 'dist'),
		filename: 'js/[name].js'
	};

	return config;
};