var webpack    = require("webpack"),
var baseConfig = require("./webpack.base.config.js");

const nodeEnv = new webpack.DefinePlugin({
	'process.env': {
		'NODE_ENV': JSON.stringify('production')
	}
})
baseConfig.plugins.push(nodeEnv)

baseConfig.devtool = "cheap-module-source-map";
baseConfig.watch = false

module.exports = baseConfig;
