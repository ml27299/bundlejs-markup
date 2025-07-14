import gql from "graphql-tag";

export const categoriesV2Fragment = gql`
	fragment categoriesFragment on Category @args(blah: [String]) {
		_id
		name
	}
`;
