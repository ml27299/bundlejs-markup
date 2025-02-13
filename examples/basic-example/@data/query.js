import gql from "graphql-tag";

export const categoriesV2Fragment = gql`
	fragment categoriesV2Fragment on Category {
		_id
		name
		# services(filter: $servicesFilter) {
		# 	_id
		# 	name
		# }
	}
`;
