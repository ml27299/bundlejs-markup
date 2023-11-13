import { HttpLink } from "apollo-link-http";
import { BatchHttpLink } from "apollo-link-batch-http";

export const httpLink = (fetch, GQL_HOST) => {
	let uri = GQL_HOST;
	console.log({ uri });
	return new HttpLink({
		uri,
		fetch,
	});
};

export const batchHttpLink = (fetch, GQL_HOST) => {
	let uri = GQL_HOST;
	return new BatchHttpLink({
		uri,
		fetch,
	});
};
