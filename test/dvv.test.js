const Clock = require('../src/lib/Clock');
const Dvv = require('../src/lib/Dvv');

const dvv = new Dvv();

test('creating instance of Dvv', () => {
	expect(new Dvv()).toBeInstanceOf(Dvv);
});

describe('test_join', () => {
	const A = dvv.new_dvv('v1');
	const A1 = dvv.create(A, 'a');
	const B = dvv.new_with_history(dvv.join(A1), 'v2');
	const B1 = dvv.update(B, A1, 'b');

	test('A', () => {
		const result = dvv.join(A);
		expect(result).toEqual([]);
	});

	test('A1', () => {
		const result = dvv.join(A1);
		expect(result).toEqual([["a", 1]]);
	});

	test('B1', () => {
		const result = dvv.join(B1);
		expect(result).toEqual([["a", 1], ["b", 1]]);
	});
});

describe('test_update', () => {
	const A0 = dvv.create(dvv.new_dvv('v1'), 'a');
	const A1 = dvv.update(dvv.new_list_with_history(dvv.join(A0), ['v2']), A0, 'a');
	const A2 = dvv.update(dvv.new_list_with_history(dvv.join(A1), ['v3']), A1, 'b');
	const A3 = dvv.update(dvv.new_list_with_history(dvv.join(A0), ['v4']), A1, 'b');
	const A4 = dvv.update(dvv.new_list_with_history(dvv.join(A0), ['v5']), A1, 'a');

	test('A0', () => expect(A0.getList).toEqual([[['a', 1, ['v1']]], []]));
	test('A1', () => expect(A1.getList).toEqual([[['a', 2, ['v2']]], []]));
	test('A2', () => expect(A2.getList).toEqual([[['a', 2, []], ['b', 1, ['v3']]], []]));
	test('A3', () => expect(A3.getList).toEqual([[['a', 2, ['v2']], ['b', 1, ['v4']]], []]));
	test('A4', () => expect(A4.getList).toEqual([[['a', 3, ['v5', 'v2']]], []]));
});

describe('test_sync', () => {
	const X = new Clock([['x', 1, []]], []);
	const A = dvv.create(dvv.new_dvv('v1'), 'a');
	const Y = dvv.create(dvv.new_list(['v2']), 'b');
	const A1 = dvv.create(dvv.new_list_with_history(dvv.join(A), ['v2']), 'a');
	const A3 = dvv.create(dvv.new_list_with_history(dvv.join(A1), ['v3']), 'b');
	const A4 = dvv.create(dvv.new_list_with_history(dvv.join(A1), ['v3']), 'c');
	const W = new Clock([['a', 1, []]], []);
	const Z = new Clock([['a', 2, ['v2', 'v1']]], []);

	test('W Z', () => {
		const result = dvv.sync([W, Z]).getList;
		expect(result).toEqual([[['a', 2, ['v2']]], []]);
	});

	test('Z W', () => {
		const result = dvv.sync([Z, W]).getList;
		expect(result).toEqual([[['a', 2, ['v2']]], []]);
	});

	test('W Z && Z W', () => {
		const result = dvv.sync([W, Z]).getList;
		const result2 = dvv.sync([Z, W]).getList;
		expect(result).toEqual(result2);
	});

	test('A A1', () => {
		const result = dvv.sync([A, A1]).getList;
		expect(result).toEqual([[['a', 2, ['v2']]], []]);
	});

	test('A1 A', () => {
		const result = dvv.sync([A1, A]).getList;
		expect(result).toEqual([[['a', 2, ['v2']]], []]);
	});

	test('A A1 && A1 A', () => {
		const result = dvv.sync([A, A1]).getList;
		const result2 = dvv.sync([A1, A]).getList;
		expect(result).toEqual(result2);
	});

	test('A3 A4', () => {
		const result = dvv.sync([A3, A4]).getList;
		expect(result).toEqual([[['a', 2, []], ['b', 1, ['v3']], ['c', 1, ['v3']]], []]);
	});

	test('A4 A3', () => {
		const result = dvv.sync([A4, A3]).getList;
		expect(result).toEqual([[['a', 2, []], ['b', 1, ['v3']], ['c', 1, ['v3']]], []]);
	});

	test('A3 A4 && A4 A3', () => {
		const result = dvv.sync([A3, A4]).getList;
		const result2 = dvv.sync([A4, A3]).getList;
		expect(result).toEqual(result2);
	});

	test('A X', () => {
		const result = dvv.sync([A, X]).getList;
		expect(result).toEqual([[['a', 1, ['v1']], ['x', 1, []]], []]);
	});

	test('X A', () => {
		const result = dvv.sync([X, A]).getList;
		expect(result).toEqual([[['a', 1, ['v1']], ['x', 1, []]], []]);
	});

	test('A X && X A', () => {
		const result = dvv.sync([A, X]).getList;
		const result2 = dvv.sync([X, A]).getList;
		expect(result).toEqual(result2);
	});

	test('A Y', () => {
		const result = dvv.sync([A, Y]).getList;
		expect(result).toEqual([[['a', 1, ['v1']], ['b', 1, ['v2']]], []]);
	});

	test('Y A', () => {
		const result = dvv.sync([Y, A]).getList;
		expect(result).toEqual([[['a', 1, ['v1']], ['b', 1, ['v2']]], []]);
	});

	test('A Y && Y A', () => {
		const result = dvv.sync([A, Y]).getList;
		const result2 = dvv.sync([Y, A]).getList;
		expect(result).toEqual(result2);
	});
});

describe('test_sync_update', () => {
	// Mary writes v1 w/o VV
	const A0 = dvv.create(dvv.new_list(['v1']), 'a');
	// Peter reads v1 with version vector (VV)
	const VV1 = dvv.join(A0);
	// Mary writes v2 w/o VV
	const A1 = dvv.update(dvv.new_list(['v2']), A0, 'a');
	// Peter writes v3 with VV from v1
	const A2 = dvv.update(dvv.new_list_with_history(VV1, ['v3']), A1, 'a');

	test('VV1', () => expect(VV1).toEqual([['a', 1]]));
	test('A0', () => expect(A0.getList).toEqual([[['a', 1, ['v1']]], []]));
	test('A1', () => expect(A1.getList).toEqual([[['a', 2, ['v2', 'v1']]], []]));
	// now A2 should only have v2 and v3, since v3 was causally newer than v1
	test('A2', () => expect(A2.getList).toEqual([[['a', 3, ['v3', 'v2']]], []]));
});

describe('test_event', () => {
	const A = dvv.create(dvv.new_dvv('v1'), 'a');
	const entries = A.getEntries;

	test('1', () => {
		const result = dvv.event(entries, 'a', 'v2');
		expect(result).toEqual([['a', 2, ['v2', 'v1']]]);
	});

	test('2', () => {
		const result = dvv.event(entries, 'b', 'v2');
		expect(result).toEqual([['a', 1, ['v1']], ['b', 1, ['v2']]]);
	});
});

describe('test_less', () => {
	const A = dvv.create(dvv.new_list('v1'), 'a'); // ['a']
	const B = dvv.create(dvv.new_list_with_history(dvv.join(A), ['v2']), 'a');
	const B2 = dvv.create(dvv.new_list_with_history(dvv.join(A), ['v2']), 'b');
	const B3 = dvv.create(dvv.new_list_with_history(dvv.join(A), ['v2']), 'z');
	const C = dvv.update(dvv.new_list_with_history(dvv.join(B), ['v3']), A, 'c');
	const D = dvv.update(dvv.new_list_with_history(dvv.join(C), ['v4']), B2, 'd');

	test('A < B', () => expect(dvv.less(A, B)).toBeTruthy());
	test('A < C', () => expect(dvv.less(A, C)).toBeTruthy());
	test('B < C', () => expect(dvv.less(B, C)).toBeTruthy());
	test('B < D', () => expect(dvv.less(B, D)).toBeTruthy());
	test('B2 < D', () => expect(dvv.less(B2, D)).toBeTruthy());
	test('A < D', () => expect(dvv.less(A, D)).toBeTruthy());
	test('B2 < C', () => expect(dvv.less(B2, C)).toBeFalsy());
	test('B < B2', () => expect(dvv.less(B, B2)).toBeFalsy());
	test('B2 < B', () => expect(dvv.less(B2, B)).toBeFalsy());
	test('A < A', () => expect(dvv.less(A, A)).toBeFalsy());
	test('C < C', () => expect(dvv.less(C, C)).toBeFalsy());
	test('D < B2', () => expect(dvv.less(D, B2)).toBeFalsy());
	test('B3 < D', () => expect(dvv.less(B3, D)).toBeFalsy());
});

describe('test_equal', () => {
	const A = new Clock([['a', 4, ['v5', 'v0']], ['b', 0, []], ['c', 1, ['v3']]], ['v0']);
	const B = new Clock([['a', 4, ['v555', 'v0']], ['b', 0, []], ['c', 1, ['v3']]], []);
	const C = new Clock([['a', 4, ['v5', 'v0']], ['b', 0, []]], ['v6', 'v1']);
	//  compare only the causal history
	test('A === B', () => expect(dvv.equal(A, B)).toBeTruthy());
	test('B === A', () => expect(dvv.equal(B, A)).toBeTruthy());
	test('A === C', () => expect(dvv.equal(A, C)).toBeFalsy());
	test('B === C', () => expect(dvv.equal(B, C)).toBeFalsy());
});

describe('test_size', () => {
	const clock = new Clock([['a', 4, ['v5', 'v0']], ['b', 0, []], ['c', 1, ['v3']]], ['v4', 'v1']);

	test('1', () => expect(dvv.size(dvv.new_list(["v1"]))).toBe(1));
	test('2', () => expect(dvv.size(clock)).toBe(5));
});

describe('test_values', () => {
	const A = new Clock([['a', 4, ['v0', 'v5']], ['b', 0, []], ['c', 1, ['v3']]], ['v1']);
	const B = new Clock([['a', 4, ['v0', 'v555']], ['b', 0, []], ['c', 1, ['v3']]], []);
	const C = new Clock([['a', 4, []], ['b', 0, []]], ['v1', 'v6']);

	test('A', () => expect(dvv.values(A).sort()).toEqual(['v0', 'v1', 'v3', 'v5']));
	test('B', () => expect(dvv.values(B).sort()).toEqual(['v0', 'v3', 'v555']));
	test('C', () => expect(dvv.values(C)).toEqual(['v1', 'v6']));
});

describe('test_ids', () => {
	const A = new Clock([['a', 4, ['v0', 'v5']], ['b', 0, []], ['c', 1, ['v3']]], ['v1']);
	const B = new Clock([['a', 4, ['v0', 'v555']], ['b', 0, []], ['c', 1, ['v3']]], []);
	const C = new Clock([['a', 4, []], ['b', 0, []]], ['v1', 'v6']);

	test('A', () => expect(dvv.ids(A)).toEqual(['a', 'b', 'c']));
	test('B', () => expect(dvv.ids(B)).toEqual(['a', 'b', 'c']));
	test('C', () => expect(dvv.ids(C)).toEqual(['a', 'b']));
});
