import gql from "graphql-tag";

export const createAccountFragment = () => gql`
	fragment createAccountFragment on CreateOneAccountPayload {
		record {
			_id
		}
	}
`;
