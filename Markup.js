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
		this.fragments = {
			...this.queryFragments,
			...this.mutationFragments,
		};

		this.queryOperations = {};
		this.mutationOperations = {};

		this.__init();
	}

	__init() {
		const queryFragmentNames = Object.keys(this.queryFragments);
		const mutationFragmentNames = Object.keys(this.mutationFragments);
		const operationNames = [];
		queryFragmentNames.forEach((name) =>
			operationNames.push({
				name: name.replace("QueryFragment", "").replace("Fragment", ""),
				type: "query",
			})
		);
		mutationFragmentNames.forEach((name) =>
			operationNames.push({
				name: name.replace("MutationFragment", "").replace("Fragment", ""),
				type: "mutation",
			})
		);

		operationNames.forEach(
			({ name, type }) =>
				(this[`${type}Operations`][name] = this.__baseFn(name, type))
		);

		const operations = Object.assign(
			{},
			this.queryOperations,
			this.mutationOperations
		);

		for (const operationName in operations) {
			const isQuery = !!this.queryOperations[operationName];
			const fn = (variables, options = {}) => {
				try {
					const isQuery = !!this.queryOperations[operationName];
					const fragment = isQuery
						? this.queryFragments[`${operationName}QueryFragment`] ||
						  this.queryFragments[operationName] ||
						  this.queryFragments[`${operationName}Fragment`]
						: this.mutationFragments[`${operationName}MutationFragment`] ||
						  this.mutationFragments[operationName] ||
						  this.mutationFragments[`${operationName}Fragment`];
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
			this[operationName] = fn;
			if (isQuery) this[`get${ucFirst(operationName)}`] = fn;
		}
	}

	__baseFn(name, type) {
		return async (fragment) => {
			const { markup, fragmentArgumentDirectiveName } = getSettings();
			try {
				var { default: markupJson } = await markup[name]();
			} catch (err) {
				throw err;
			}
			if (isBool(fragment))
				return gql`
					${this.__generateOperationMarkupString(type, markupJson)}
				`;

			const argsDirectiveIndex = fragment.definitions[0].directives.findIndex(
				(directive) => directive.name.value === fragmentArgumentDirectiveName
			);
			if (argsDirectiveIndex > -1) {
				const argsDirective =
					fragment.definitions[0].directives[argsDirectiveIndex];
				markupJson.args = markupJson.args.concat(
					argsDirective.arguments.map((arg) => ({
						name: arg.name.value,
						type: arg.value.value,
						skipInline: true,
					}))
				);
				fragment.definitions[0].directives =
					fragment.definitions[0].directives.filter(
						(_, i) => i !== argsDirectiveIndex
					);
				fragment.loc.source.body = fragment.loc.source.body.replace(
					new RegExp(
						`@${fragmentArgumentDirectiveName}\(\[\^\\)\]\+\)\\)`,
						"mg"
					),
					""
				);
			}

			return gql`
				${fragment}
				${this.__generateOperationMarkupString(type, markupJson, fragment)}
			`;
		};
	}

	__generateOperationMarkupString(type, json, fragment) {
		let { name, args } = json;
		const skipInlineFilter = (arg) => !arg.skipInline;
		if (fragment) {
			const fragmentName = fragment.definitions[0].name.value;

			if (args.length === 0)
				return `
				${type} ${ucFirst(name)} {
					${name} {
						...${fragmentName}
					}
				}
			`;
			return `
            ${type} ${ucFirst(name)}(${args.map(
				(arg) => `$${arg.name}: ${arg.type}`
			)}) {
                ${name}(${args
				.filter(skipInlineFilter)
				.map((arg) => `${arg.name}: $${arg.name}`)}) {
                    ...${fragmentName}
                }
            }
        `;
		}
		if (args.length === 0)
			return `
			${type} ${ucFirst(name)} {
				${name}
			}
		`;
		return `
        ${type} ${ucFirst(name)}(${args.map(
			(arg) => `$${arg.name}: ${arg.type}`
		)}) {
            ${name}(${args
			.filter(skipInlineFilter)
			.map((arg) => `${arg.name}: $${arg.name}`)}) 
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
				context: settingsContext = {},
			} = getSettings();

			if (this.queryOperations[name]) {
				var query = await this.queryOperations[name](fragment);
			} else {
				const operation = this.__baseFn(name, "query");
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

			const { data, errors } = await apollo.query(
				Object.assign(
					{
						query,
						variables,
						context: Object.assign({}, settingsContext, context || {}),
					},
					fetchPolicy ? { fetchPolicy } : {},
					errorPolicy ? { errorPolicy } : {}
				)
			);

			if (errors && errors.length > 0) {
				throw new Error(errors[0].message);
			}

			if (!keepTypeName) omitDeep(data, "__typename");
			onLoading(false);

			if (
				fetchPolicy === "network-only" ||
				(!fetchPolicy &&
					apollo.defaultOptions.query.fetchPolicy === "network-only")
			) {
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
				context: settingsContext = {},
			} = getSettings();

			if (this.mutationOperations[name]) {
				var mutation = await this.mutationOperations[name](fragment);
			} else {
				const operation = this.__baseFn(name, "mutation");
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

			const { data, errors } = await apollo.mutate(
				Object.assign(
					{
						mutation,
						variables,
						context: Object.assign({}, settingsContext, context || {}),
					},
					fetchPolicy ? { fetchPolicy } : {},
					errorPolicy ? { errorPolicy } : {}
				)
			);

			if (errors && errors.length > 0) {
				throw new Error(errors[0].message);
			}

			if (!keepTypeName) omitDeep(data, "__typename");
			onLoading(false);

			if (
				fetchPolicy === "network-only" ||
				(!fetchPolicy &&
					apollo.defaultOptions.mutate.fetchPolicy === "network-only")
			) {
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
