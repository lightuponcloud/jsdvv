/**
 * @description The following comparator is used for compatability with Erlang implementation of DVV sets 
 * Allows to compare lists with strings, as in Erlang. ( list > string )
 */
module.exports = cmp_fun = (a, b) => {
	if (typeof a === 'string' && typeof b === 'string') {
		return a > b;
	}
	if (typeof a === 'number' && typeof b === 'number') {
		return a > b;
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length > 0 && b.length > 0) {
			if (Array.isArray(a[0]) && Array.isArray(b[0])) {
				return a[0].length > b[0].length;
			}
			if (Array.isArray(a[0])) return true;
		}
	}
	if (Array.isArray(a) && !Array.isArray(b)) return true;
	if (Array.isArray(b)) return true;

	return a.length > b.length;
};