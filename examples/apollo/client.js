import { httpLink } from "./link";

import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { from } from "apollo-link";

export default ({ fetch, ssr = false, window, GQL_HOST } = {}) => {
	const defaultOptions = {
		watchQuery: {
			fetchPolicy: "no-cache",
			errorPolicy: "ignore",
		},
		query: {
			fetchPolicy: "no-cache",
			errorPolicy: "none",
		},
	};
	return new ApolloClient({
		link: from([httpLink(fetch, GQL_HOST)]),
		cache: new InMemoryCache({
			addTypename: true,
		}).restore(window ? window.__APOLLO_STATE__ : undefined),
		ssrMode: ssr,
		defaultOptions,
	});
};
