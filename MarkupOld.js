import client from "@src/libs/apolloClient";
import batchClient from "@src/libs/apolloClientBatch";
import { getCookieByName, isFunction } from "@utils/Browser";
import required from "@libs/required";
import omitDeep from "omit-deep";

const { NODE_ENV } = process.env;

class EmailPasswordError extends Error {
	constructor(message) {
		super(message);
		this.name = EmailPasswordError;
	}
}

class PasswordResetError extends Error {
	constructor(message) {
		super(message);
		this.name = PasswordResetError;
	}
}

class Main {
	options = {
		fetchPolicy: "network-only",
		errorPolicy: "all",
	};

	constructor(options = {}) {
		const { queries, mutations, validations } = options;

		this.rawFuncs = {};
		this.queries = queries || {};
		this.mutations = mutations || {};
		this.validations = validations || {};

		const proto = Object.getPrototypeOf(this);
		const properties = Object.getOwnPropertyNames(proto).filter(
			(method) => method !== "constructor"
		);
		for (let i = 0; i < properties.length; i++)
			this[properties[i]] = this[properties[i]].bind(this);
	}

	async axios() {
		try {
			return await import("axios");
		} catch (err) {
			throw err;
		}
	}

	patch(operations = {}) {
		if (!this.operations) this.operations = operations;

		const objectReduceMapper = (result, operationName) =>
			Object.assign(result, {
				[operationName]: this.operations[operationName],
			});

		const queryOperations = Object.keys(this.operations)
			.filter((operationName) => ~operationName.indexOf("Query"))
			.reduce(objectReduceMapper, {});

		const mutationOperations = Object.keys(this.operations)
			.filter((operationName) => ~operationName.indexOf("Mutation"))
			.reduce(objectReduceMapper, {});

		const getFragmentByOperationName = (
			operationName = required`operationName`,
			operationType = required`operationType`
		) => {
			const fragmentName = Object.keys(this[operationType])
				.filter((key) => ~key.indexOf("Fragment"))
				.find(
					(fragmentName) =>
						fragmentName.replace("Fragment", "") === operationName
				);
			if (!fragmentName) return;
			return this[operationType][fragmentName];
		};

		for (const operationName in queryOperations) {
			//if (this.queries[operationName]) continue;
			const fragment = getFragmentByOperationName(operationName, "queries");
			if (!fragment) continue;
			if (isFunction(fragment)) {
				this.rawFuncs[operationName] = queryOperations[operationName];
				continue;
			}

			this.queries[operationName] = queryOperations[operationName](fragment);

			const operationFuncNameArr = operationName.split("Query");
			operationFuncNameArr.pop();
			const operationFuncName = operationFuncNameArr.join("Query");
			if (!this[operationFuncName]) {
				this[operationFuncName] = function (variables = {}, options = {}) {
					return this.query(variables, options, operationFuncName);
				}.bind(this);
				const getOperationFuncName = `get${operationFuncName[0].toUpperCase()}${operationFuncName.slice(
					1
				)}`;
				if (!this[getOperationFuncName])
					this[getOperationFuncName] = this[operationFuncName];
			}

			this.queries[operationName] = this.queries[operationName];
			this.rawFuncs[operationName] = queryOperations[operationName];
		}

		for (const operationName in mutationOperations) {
			//if (this.mutations[operationName]) continue;
			const fragment = getFragmentByOperationName(operationName, "mutations");
			if (!fragment) continue;
			if (isFunction(fragment)) {
				this.rawFuncs[operationName] = mutationOperations[operationName];
				continue;
			}

			const operationFuncNameArr = operationName.split("Mutation");
			operationFuncNameArr.pop();
			const operationFuncName = operationFuncNameArr.join("Mutation");
			if (!this[operationFuncName]) {
				this[operationFuncName] = function (variables = {}, options = {}) {
					return this.mutation(variables, options, operationFuncName);
				}.bind(this);
			}

			this.mutations[operationName] =
				mutationOperations[operationName](fragment);
			this.rawFuncs[operationName] = mutationOperations[operationName];
		}
	}

	query(variables = {}, options = {}, name = required`name`) {
		//omitDeep(variables, "__typename");

		const {
			fetchPolicy,
			returnQuery,
			validations,
			onLoading,
			batch,
			context,
			fragment,
			keepTypeName,
			client: customClient,
		} = options;

		let query = this.queries[`${name}Query`];
		if (fragment) {
			query = this.rawFuncs[`${name}Query`](fragment);
		}

		const validation = (validations || this.validations)[`${name}Validation`];

		if (!query) {
			throw new Error(`Must have ${name}Query`);
		}
		if (returnQuery) return { query, validation };
		if (validation)
			try {
				this.validate(query, variables, validation);
			} catch (err) {
				if (NODE_ENV !== "production") console.error(err);
				return Promise.reject(err);
			}

		if (onLoading) onLoading(true);
		const apollo = customClient || (batch ? batchClient : client);
		return apollo
			.query({
				query,
				variables,
				fetchPolicy: fetchPolicy || this.options.fetchPolicy,
				errorPolicy: "all",
				context,
			})
			.then(({ data, errors, ...other }) => {
				if (errors && errors.length > 0) {
					throw errors[0].exception;
				}
				if (!keepTypeName) omitDeep(data, "__typename");
				if (onLoading) onLoading(false);

				return apollo.cache.reset().then(() => data[name] || data[`${name}V2`]);
			})
			.catch((e) => {
				if (onLoading) onLoading(false);
				throw e;
			});
	}

	mutation(variables = {}, options = {}, name = required`name`) {
		//omitDeep(variables, "__typename");

		const {
			fetchPolicy,
			returnMutation,
			validations,
			batch,
			context,
			fragment,
			client: customClient,
		} = options;

		let mutation = this.mutations[`${name}Mutation`];
		if (fragment) {
			mutation = this.rawFuncs[`${name}Mutation`](fragment);
		}

		const validation = (validations || this.validations)[`${name}Validation`];

		if (!mutation) {
			throw new Error(`Must have ${name}Mutation`);
		}
		if (returnMutation) return { mutation, validation };
		if (validation)
			try {
				this.validate(mutation, variables, validation);
			} catch (err) {
				if (NODE_ENV !== "production") console.error(err);
				return Promise.reject(err);
			}
		const apollo = customClient || (batch ? batchClient : client);
		return apollo
			.mutate({
				mutation,
				variables,
				fetchPolicy,
				errorPolicy: "all",
				context,
			})
			.then(({ data, errors, ...other }) => {
				if (errors && errors.length > 0) {
					throw errors[0].exception;
				}
				omitDeep(data, "__typename");
				return apollo.cache.reset().then(() => data[name] || data[`${name}V2`]);
			})
			.catch((e) => {
				throw e;
			});
	}

	rest(
		{ method = required`method`, url = required`url` } = {},
		variables = {},
		options = {},
		name = required`name`
	) {
		const { validations, withCredentials } = options;
		const validation = (validations || this.validations)[`${name}Validation`];

		if (validation)
			try {
				validation.validateSync(variables);
			} catch (err) {
				if (NODE_ENV !== "production") console.error(err);
				return Promise.reject(err);
			}

		if (withCredentials || withCredentials === undefined)
			Object.assign(variables, { _csrf: getCookieByName("_csrfToken") });
		return this.axios()
			.then(({ default: axios }) =>
				axios(
					Object.assign(
						options,
						{
							method,
							url,
							withCredentials:
								withCredentials !== undefined ? withCredentials : true,
						},
						method === "get" ? { params: variables } : { data: variables }
					)
				)
					.then((response) => response.data)
					.catch((e) => {
						if (
							e?.response?.data &&
							~e.response.data.indexOf(
								"GraphQL error: Error: Email/Password combination is invalid"
							)
						) {
							throw new EmailPasswordError("Email or Password is incorrect");
						}
						if (/.*SocialLoginResetPasswordError.*/i.test(e.response.data)) {
							throw new PasswordResetError(
								"Password needs to be setup for accounts from Social Login. Reset password link sent to your email"
							);
						}
						throw e;
					})
			)
			.catch((err) => {
				if (
					err instanceof EmailPasswordError ||
					err instanceof PasswordResetError
				) {
					throw { message: err.message };
				}
				throw new Error(err.response.data);
			});
	}

	validate(gql = required`gql`, input, schema = required`schema`) {
		const { definitions } = gql;
		if (definitions.length === 0)
			throw new Error("No definitions in gql object");

		const args = definitions.reduce((result, definition) => {
			const { kind, selectionSet } = definition;
			if (kind !== "OperationDefinition") return result;

			const recursive = (selections, selectionSet, depth = 0) => {
				selections = selections.concat(selectionSet.selections);
				for (let i = 0; i < selectionSet.selections.length; i++) {
					const { selectionSet: childSelectionSet } =
						selectionSet.selections[i];
					if (childSelectionSet && i < depth)
						selections = recursive(selections, childSelectionSet);
				}
				return selections;
			};

			const selections = recursive([], selectionSet).filter(
				(selection) => selection.kind === "Field"
			);
			return selections.reduce((result, selection) => {
				if (selection.arguments.length === 0) return result;
				result[selection.name.value] = selection.arguments.reduce(
					(result, argument) => {
						const { name, value } = argument;
						return Object.assign(result, {
							[`${name.value}`]: value.name ? value.name.value : value.value,
						});
					},
					{}
				);
				return result;
			}, {});
		}, {});

		for (const key in args) {
			if (args.hasOwnProperty(key) === false) continue;
			try {
				Object.assign(
					input,
					schema.validateSync(
						Object.keys(args[key]).reduce((result, name) => {
							result[name] = input[args[key][name]];
							return result;
						}, {})
					)
				);
			} catch (err) {
				throw err;
			}
		}

		return true;
	}
}

export default Main;
