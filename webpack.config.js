const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { EsbuildPlugin } = require("esbuild-loader");

module.exports = async (env, argv) => {
	const isProduction = argv && argv.mode === "production";
	const isNative = env && (env.native === true || env.native === "true");
	const config = {
		entry: {
			[isNative ? "CoCreate-device.native" : "CoCreate-device"]: isNative ? "./src/native/index.js" : "./src/index.js"
		},
		output: {
			path: path.resolve(__dirname, "dist", isNative ? "native" : ""),
			filename: isProduction ? "[name].min.js" : "[name].js",
			libraryExport: "default",
			library: ["CoCreate", "device"],
			clean: isNative ? true : { keep: /^native(?:[\\/]|$)/ }
		},
		plugins: [
			new MiniCssExtractPlugin({
				filename: isProduction ? "[name].min.css" : "[name].css"
			})
		],
		mode: isProduction ? "production" : "development",
		devtool: isProduction ? "source-map" : "eval-source-map",
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude: /node_modules/,
					use: {
						loader: "esbuild-loader",
						options: {
							loader: "js",
							target: "es2017"
						}
					}
				},
				{
					test: /\.css$/i,
					use: [MiniCssExtractPlugin.loader, "css-loader"]
				}
			]
		},
		optimization: {
			minimize: isProduction,
			minimizer: [
				new EsbuildPlugin({
					target: "es2017",
					css: true
				})
			],
			splitChunks: {
				cacheGroups: {
					defaultVendors: false
				}
			}
		},
		performance: {
			hints: isProduction ? "warning" : false
		}
	};
	if (env && (env.upload === true || env.upload === "true")) {
		const { FileUploader } = require("@cocreate/webpack");
		config.plugins.push(new FileUploader(env, argv));
	}
	return config;
};
