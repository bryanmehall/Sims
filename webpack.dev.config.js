var webpack    = require("webpack"),
    baseConfig = require("./webpack.base.config.js");

//baseConfig.entry = ["webpack-hot-middleware/client", "./main"];

baseConfig.output.publicPath = "/";
/*
baseConfig.plugins = [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
];*/
baseConfig.watch = true

const nodeEnv = new webpack.DefinePlugin({
	'process.env':{
		'NODE_ENV': JSON.stringify('dev')
	}
})
baseConfig.plugins.push(nodeEnv)
module.exports = baseConfig;
