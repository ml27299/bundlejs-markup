import Markup from "./Markup";

let settings = { markup: {} };

export const registerMarkup = (
	markup = {},
	{ fragmentArgumentDirectiveName = "args" } = {}
) => {
	settings["markup"] = Object.assign({}, settings["markup"], markup);
	settings["fragmentArgumentDirectiveName"] = fragmentArgumentDirectiveName;
};

export const registerApolloClient = (apolloClient) => {
	settings = Object.assign({}, settings, {
		apolloClient,
	});
};

export const registerApolloBatchClient = (apolloBatchClient) => {
	settings = Object.assign({}, settings, {
		apolloBatchClient,
	});
};

export const registerContext = (context) => {
	settings = Object.assign({}, settings, {
		context,
	});
};

export const getSettings = () => settings;

export default Markup;
