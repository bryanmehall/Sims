var webpack = require("webpack");
var path = require("path");

var DEV = path.resolve(__dirname, "dev");
var DIST = path.resolve(__dirname, "dist");

const HtmlWebpackPlugin = require('html-webpack-plugin');

const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
	template: './client/index.html',
	filename: 'index.html',
	inject: 'body'
})

var config = {
	entry: ['babel-polyfill', DEV + "/index.jsx"],
	output: {
		filename: "bundle.js",
		path: DIST,//__dist
		publicPath: '/'
	},
	devServer: {
		historyApiFallback: true
	},
	devtool: 'source-map',
	module: {
		loaders: [
			{
                include: DEV,
                exclude: "/node_modules/",
                loader: "babel-loader",
            },
            {
                test: /\.peg$/,
                loader: 'pegjs-loader?cache=true'
            }
		]
	},
	resolve: {
		extensions: ['.js', '.jsx']
	},
	plugins: [
		HtmlWebpackPluginConfig
	]

};

module.exports = config;
