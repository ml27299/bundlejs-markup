export const ucFirst = (str) => {
	return str[0].toUpperCase() + str.slice(1);
};

export const isBool = (str) =>
	Object.prototype.toString.call(str) === "[object Boolean]";
