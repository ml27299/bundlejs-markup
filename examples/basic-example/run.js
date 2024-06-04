import "./index.js";

import markup from "./@data/markup.js";
console.log(markup);
const { categoriesV2 } = markup;

(async () => {
	// await categoriesV2({ servicesFilter: { active: true } });
	const response = await categoriesV2({ servicesFilter: { active: true } });
	console.log(response);
})().catch((err) => {
	throw err;
});
