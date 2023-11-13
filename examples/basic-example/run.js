import "./index.js";

import markup from "./@data/markup.js";
console.log(markup);
const { createAccount } = markup;
const { createAccountFragment } = markup.fragments;

console.log(createAccount);

(async () => {
	await createAccount(
		{ record: { email: "yo@yo.com" } },
		{ fragment: createAccountFragment() }
	);
})().catch((err) => {
	throw err;
});
