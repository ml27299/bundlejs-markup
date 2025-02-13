import { object, boolean, string } from "../yup";

export const categoriesV2Validation = object().shape({
	filter: object().shape({
		metatags: object().shape({
			title: string().nullable(),
			description: string().nullable(),
		}),
	}),
});
