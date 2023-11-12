import Markup from "./Markup";

let settings = { markup: {} };

export const registerMarkup = (markup = {}) => {
	settings = Object.assign({}, settings["markup"], markup);
};

export const registerApolloClient = (apolloClient, options = {}) => {
	settings = Object.assign({}, settings, {
		apolloClient,
		apolloClientOptions: options,
	});
};

export const registerApolloBatchClient = (apolloBatchClient, options = {}) => {
	settings = Object.assign({}, settings, {
		apolloBatchClient,
		apolloBatchClientOptions: options,
	});
};

export const getSettings = () => settings;

export default Markup;
