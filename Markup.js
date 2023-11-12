import omitDeep from "omit-deep";
import gql from "graphql-tag";

import { getSettings } from "./index.js";
import { ucFirst, isBool } from "./utils/index.js";
import required from "./libs/required.js";

class Markup {
	constructor(options = {}) {
		const { queries, mutations, validations } = options;

		this.rawFuncs = {};
		this.queryFragments = queries || {};
		this.mutationFragments = mutations || {};
		this.validations = validations || {};

		this.queryOperations = {};
		this.mutationOperations = {};
	}

	__init() {
		const queryFragmentNames = Object.keys(this.queryFragments);
		const mutationFragmentNames = Object.keys(this.mutationFragments);
		const operationNames = [];
		queryFragmentNames.forEach((name) =>
			operationNames.push({
				name: name.replace("QueryFragment", ""),
				type: "query",
			})
		);
		mutationFragmentNames.forEach((name) =>
			operationNames.push({
				name: name.replace("MutationFragment", ""),
				type: "mutation",
			})
		);

		operationNames.forEach(
			({ name, type }) =>
				(this[`${type}Operations`][name] = this.baseFn(name, type))
		);

		const response = {};
		const operations = Object.assign(
			{},
			this.queryOperations,
			this.mutationOperations
		);

		for (const operationName in operations) {
			const isQuery = !!this.query[operationName];
			const fn = (variables, options = {}) => {
				try {
					const isQuery = !!this.query[operationName];
					const fragment = isQuery
						? this.queryFragments[`${operationName}QueryFragment`]
						: this.mutationFragments[`${operationName}MutationFragment`];
					if (!options.fragment) options.fragment = fragment;
					return this[isQuery ? "query" : "mutation"](
						variables,
						options,
						operationName
					);
				} catch (err) {
					throw err;
				}
			};
			response[operationName] = fn;
			if (isQuery) response[`get${ucFirst(operationName)}`] = fn;
		}

		return response;
	}

	__baseFn(name, type) {
		const { markup } = getSettings();
		return async () => {
			try {
				var markupJson = await markup[name];
			} catch (err) {
				throw err;
			}
			return (fragment) => {
				if (isBool(fragment)) fragment = null;
				return gql`
					${this.__generateOperationMarkupString(type, markupJson, fragment)}
				`;
			};
		};
	}

	__generateOperationMarkupString(type, json, fragment) {
		const { name, args } = json;
		if (fragment) {
			return `
            ${fragment}
            ${type} ${ucFirst(name)}(${args.map(
				(arg) => `$${arg.name}: ${arg.type}}`
			)}) {
                ${name}(${args.map((arg) => `${arg.name}: $${arg.name}`)}) {
                    ...${name}${ucFirst(type)}Fragment
                }
            }
        `;
		}
		return `
        ${type} ${ucFirst(name)}(${args.map(
			(arg) => `$${arg.name}: ${arg.type}}`
		)}) {
            ${name}(${args.map((arg) => `${arg.name}: $${arg.name}`)}) 
        }
    `;
	}

	async query(
		variables = {},
		{
			fetchPolicy,
			errorPolicy,
			returnQuery,
			validations,
			onLoading = () => {},
			batch = false,
			context,
			fragment,
			keepTypeName,
			client: customClient,
		} = {},
		name = required`name`
	) {
		try {
			const {
				apolloClient,
				apolloBatchClient,
				apolloClientOptions,
				apolloBatchClientOptions,
			} = getSettings();

			if (this.queryOperations[name]) {
				var query = await this.queryOperations[name](fragment);
			} else {
				const operation = this.baseFn(name, "query");
				var query = await operation(fragment);
			}

			const validation =
				(validations || this.validations)[`${name}Validation`] ||
				(validations || this.validations)[`${name}QueryValidation`];

			if (!query) {
				throw new Error(`Must have ${name} Query`);
			}

			if (returnQuery) return { query, validation };
			if (validation)
				try {
					this.validate(query, variables, validation);
				} catch (err) {
					console.error(err);
					throw err;
				}

			onLoading(true);

			const apollo = customClient || (batch ? apolloBatchClient : apolloClient);

			fetchPolicy =
				fetchPolicy ||
				(batch
					? apolloBatchClientOptions.fetchPolicy
					: apolloClientOptions.fetchPolicy);

			errorPolicy =
				errorPolicy ||
				(batch
					? apolloBatchClientOptions.errorPolicy
					: apolloClientOptions.errorPolicy);

			const { data, errors } = await apollo.query({
				query,
				variables,
				fetchPolicy,
				errorPolicy,
				context,
			});

			if (errors && errors.length > 0) {
				throw errors[0].exception;
			}

			if (!keepTypeName) omitDeep(data, "__typename");
			onLoading(false);

			if (fetchPolicy === "network-only") {
				await apollo.cache.reset();
			}

			return data[name];
		} catch (e) {
			onLoading(false);
			throw e;
		}
	}

	async mutation(
		variables = {},
		{
			fetchPolicy,
			errorPolicy,
			returnMutation,
			onLoading = () => {},
			validations,
			batch = false,
			context,
			fragment,
			keepTypeName,
			client: customClient,
		},
		name = required`name`
	) {
		try {
			const {
				apolloClient,
				apolloBatchClient,
				apolloClientOptions,
				apolloBatchClientOptions,
			} = getSettings();

			if (this.mutationOperations[name]) {
				var mutation = await this.mutationOperations[name](fragment);
			} else {
				const operation = this.baseFn(name, "mutation");
				var mutation = await operation(fragment);
			}

			const validation =
				(validations || this.validations)[`${name}Validation`] ||
				(validations || this.validations)[`${name}MutationValidation`];

			if (!mutation) {
				throw new Error(`Must have ${name} Mutation`);
			}

			if (returnMutation) return { mutation, validation };
			if (validation)
				try {
					this.validate(mutation, variables, validation);
				} catch (err) {
					console.error(err);
					throw err;
				}

			const apollo = customClient || (batch ? apolloBatchClient : apolloClient);

			fetchPolicy =
				fetchPolicy ||
				(batch
					? apolloBatchClientOptions.fetchPolicy
					: apolloClientOptions.fetchPolicy);

			errorPolicy =
				errorPolicy ||
				(batch
					? apolloBatchClientOptions.errorPolicy
					: apolloClientOptions.errorPolicy);

			const { data, errors } = apollo.mutate({
				mutation,
				variables,
				fetchPolicy,
				errorPolicy: "all",
				context,
			});

			if (errors && errors.length > 0) {
				throw errors[0].exception;
			}

			if (!keepTypeName) omitDeep(data, "__typename");
			onLoading(false);

			if (fetchPolicy === "network-only") {
				await apollo.cache.reset();
			}

			return data[name];
		} catch (err) {
			onLoading(false);
			throw err;
		}
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

export default Markup;
