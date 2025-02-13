// import { objectIdRegex } from "@src/libs/regex";
// import { phoneRegex, zipcodeRegex } from "@src/libs/regex";

import {
	mixed,
	string,
	number,
	bool,
	boolean,
	date,
	object,
	array,
	ref,
	lazy,
	reach,
	isSchema,
	addMethod,
	setLocale,
	ValidationError,
} from "yup";

addMethod(number, "parseInt", function () {
	return this.transform(function (value) {
		if (this.isType(value)) return value;
		if (typeof value === "string") return parseInt(value);
		return value;
	});
});

addMethod(number, "parseFloat", function () {
	return this.transform(function (value) {
		if (this.isType(value)) return value;
		if (typeof value === "string") return parseFloat(value);
		return value;
	});
});

addMethod(array, "nested", function (schema) {
	return this.test({
		name: "nested",
		message: "",
		test: function (value) {
			try {
				schema.validateSync(value, { context: this.parent });
				return true;
			} catch (err) {
				throw err;
			}
		},
	});
});

addMethod(object, "nested", function (schema) {
	return this.test({
		name: "nested",
		message: "",
		test: function (value) {
			try {
				schema.validateSync(value, { context: this.parent });
				return true;
			} catch (err) {
				throw err;
			}
		},
	});
});

// addMethod(string, "objectid", function (message, options) {
// 	return this.matches(
// 		objectIdRegex,
// 		Object.assign(
// 			{ excludeEmptyString: true, message, name: "objectid" },
// 			options
// 		)
// 	);
// });

// addMethod(string, "phone", function (message, options) {
// 	return this.matches(
// 		phoneRegex,
// 		Object.assign({ excludeEmptyString: false, message }, options)
// 	);
// });

// addMethod(string, "zipcode", function (message, options) {
// 	return this.matches(
// 		zipcodeRegex,
// 		Object.assign({ excludeEmptyString: true, message }, options)
// 	);
// });

addMethod(string, "notEqualTo", function (ref, msg) {
	return this.test({
		name: "notEqualTo",
		exclusive: false,
		message: msg || "${path} can NOT be the same as ${reference}",
		params: {
			reference: ref.path,
		},
		test: function (value) {
			return value !== this.resolve(ref);
		},
	});
});

addMethod(array, "default", function (defaultValue) {
	return this.transform(function (value) {
		if (value === null) return defaultValue;
		if (value === undefined) return defaultValue;
		return value;
	});
});

addMethod(string, "default", function (defaultValue) {
	return this.transform(function (value) {
		if (value === null) return defaultValue;
		if (value === undefined) return defaultValue;
		return value;
	});
});

addMethod(string, "equalTo", function (ref, msg) {
	return this.test({
		name: "equalTo",
		exclusive: false,
		message: msg || "${path} must be the same as ${reference}",
		params: {
			reference: ref.path,
		},
		test: function (value) {
			return value === this.resolve(ref);
		},
	});
});

export {
	mixed,
	string,
	number,
	bool,
	boolean,
	date,
	object,
	array,
	ref,
	lazy,
	reach,
	isSchema,
	addMethod,
	setLocale,
	ValidationError,
};
