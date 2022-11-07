/**
 * @class
 * @alias Clock
 * @classdesc Entries are sorted by id
 * Each counter also includes the number of values in that id
 * The values in each triple of entries are causally ordered
 * and each new value goes to the head of the list
 */
 module.exports = class Clock {
	list;

	constructor(entries, values) {
		this.list = [entries, values];
	}
	get getEntries() {
		return this.list?.[0] ?? [];
	}

	get getValues() {
		return this.list?.[1] ?? [];
	}

	get getList() {
		return this.list;
	}

	set setList(list) {
		this.list = list;
	}
}