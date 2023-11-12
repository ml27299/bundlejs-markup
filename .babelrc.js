module.exports = {
	presets: ["react-app"],
	plugins: [
		["source-map-support"],
		["@babel/plugin-transform-runtime"],
		["@babel/plugin-proposal-optional-chaining"],
		["@babel/plugin-proposal-nullish-coalescing-operator"],
		["@babel/plugin-syntax-dynamic-import"],
		["@babel/plugin-proposal-decorators", { legacy: true }],
		["@babel/plugin-proposal-class-properties", { loose: true }],
		["@babel/plugin-proposal-private-methods", { loose: true }],
		["@babel/plugin-proposal-throw-expressions"],
	].filter(Boolean),
	sourceType: "unambiguous",
};
