export const required = (param) => {
	throw new Error(`Missing parameter: ${param}`);
};

export default required;
