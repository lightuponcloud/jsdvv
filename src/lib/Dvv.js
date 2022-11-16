const Clock = require('./Clock');
const cmp_fun = require('../utils');

module.exports = class Dvv {
	/**
	 * @description Constructs a new clock set without causal history, and receives one value that goes to the anonymous list.
	 */
	new_dvv(value) {
		return new Clock([], [value]);
	}

	/**
	 * @description Same as new_dvv, but receives a list of values, instead of a single value.
	 */
	new_list(value) {
		return new Clock([], Array.isArray(value) ? value : [value]);
	}

	/**
	 * @description Constructs a new clock set with the causal history
	 * of the given version vector / vector clock,
	 * and receives one value that goes to the anonymous list.
	 * The version vector SHOULD BE the output of join.
	 */
	new_with_history(vector, value) {
		// defense against non-order preserving serialization
		const vectors = vector.sort((a, b) => cmp_fun(a, b));
		const entries = [];
		for (let i = 0; i < vectors.length; i++) {
				const item = vectors[i];
				const i_value = item[0];
				const number = item[1];
				entries.push([i_value, number, []]);
		}
		return new Clock(entries, value);
	}

	/**
	 * @description Same as new_with_history, but receives a list of values, instead of a single value.
	 */
	new_list_with_history(vector, value) {
		return this.new_with_history(vector, Array.isArray(value) ? value : [value]);
	}

	/**
	 * @decription Synchronizes a list of clocks using _sync().
	 * It discards (causally) outdated values, while merging all causal histories.
	 */
	sync(clocks) {
		return clocks.reverse().reduce((prevValue, currentValue) => this._sync(prevValue, currentValue));
	}

	_sync(clock1, clock2) {
		if (clock1.getList.length !== 2) return clock2;
		if (clock2.getList.length !== 2) return clock1;

		const defineValues = () => {
			if (this.less(clock1, clock2)) return clock2.getValues;
			if (this.less(clock2, clock1)) return clock1.getValues;

			const newset = new Set();
			for (let i = 0; i < clock1.getValues.length; i++) newset.add(clock1.getValues[i]);
			for (let i = 0; i < clock2.getValues.length; i++) newset.add(clock2.getValues[i]);

			return Array.from(newset);
		};

		return new Clock(this._sync2(clock1.getEntries, clock2.getEntries), defineValues());
	}

	_sync2(entries1, entries2) {
		if (entries1.length === 0) return entries2;
		if (entries2.length === 0) return entries1;

		const head1 = entries1[0];
		const head2 = entries2[0];

		if (cmp_fun(head2[0], head1[0])) return [head1].concat(this._sync2(entries1.slice(1), entries2));
		if (cmp_fun(head1[0], head2[0])) return [head2].concat(this._sync2(entries2.slice(1), entries1));

		const to_merge = head1.concat([head2[1], head2[2]]);
		const result = this._merge(...to_merge);

		return [result].concat(this._sync2(entries1.slice(1), entries2.slice(1)));
	}

	_merge(the_id, counter1, values1, counter2, values2) {
		const len1 = values1.length;
		const len2 = values2.length;
		if (counter1 >= counter2) {
			return counter1 - len1 >= counter2 - len2
				? [the_id, counter1, values1]
				// : [the_id, counter1, values1.slice(0).splice(0, counter1 - counter2 + len2)];
				: [the_id, counter1, values1.slice(0, counter1 - counter2 + len2)];
		}

		return counter2 - len2 >= counter1 - len1
			? [the_id, counter2, values2]
			// : [the_id, counter2, values2.slice(0).splice(0, counter2 - counter1 + len1)]
			: [the_id, counter2, values2.slice(0, counter2 - counter1 + len1)];
	}

	/**
	 * @description Return a version vector that represents the causal history.
	 */
	join(clock) {
		return clock.getEntries.reduce((acc, entry) => {
			entry && acc.push([entry[0], entry[1]]);
			return acc;
		}, []);
	}

	/**
	 * @description Advances the causal history with the given id.
	 * The new value is the *anonymous dot* of the clock.
	 * The client clock SHOULD BE a direct result of new.
	 */
	create(clock, the_id) {
		const values = Array.isArray(clock.getValues) && clock.getValues.length > 0
			? clock.getValues[0]
			: clock.getValues;

		return new Clock(this.event(clock.getEntries, the_id, values), []);
	}

	/**
	 * @description Advances the causal history of the
	 * first clock with the given id, while synchronizing
	 * with the second clock, thus the new clock is
	 * causally newer than both clocks in the argument.
	 * The new value is the *anonymous dot* of the clock.
	 * The first clock SHOULD BE a direct result of new/2,
	 * which is intended to be the client clock with
	 * the new value in the *anonymous dot* while
	 * the second clock is from the local server.
	 */
	update(clock1, clock2, the_id) {
		// Sync both clocks without the new value
		const dot = this._sync(new Clock(clock1.getEntries, []), clock2);
		// We create a new event on the synced causal history,
		// with the id I and the new value.
		// The anonymous values that were synced still remain.
		const clock_values = Array.isArray(clock1.getValues)
			? clock1.getValues[0]
			: clock1.getValues;

		return new Clock(this.event(dot.getEntries, the_id, clock_values), dot.getValues);
	}

	event(vector, the_id, value) {
		if (vector.length === 0) return [[the_id, 1, [value]]];
		if (vector.length > 0 && vector[0].length > 0 && vector[0][0] === the_id) {
			const values = Array.isArray(value)
				? value.concat(vector[0][2])
				: [value].concat(vector[0][2]);
			return [[vector[0][0], vector[0][1] + 1, values].concat(vector.slice(1))];
		}

		if (vector.length > 0 && vector[0].length > 0) {
			if (Array.isArray(vector[0][0]) || vector[0][0].length > the_id.length) {
				return [[the_id, 1, [value]]].concat(vector);
			}
		}

		const itm = this.event(vector.slice(1), the_id, value);
		return [vector[0]].concat(itm);
	}

	/**
	 * @description Returns the total number of values in this clock set.
	 */
	size(clock) {
		return clock.getEntries.reduce((acc, entry) => {
			acc += entry[2].length;
			return acc;
		}, clock.getValues.length);
	}

	/**
	 * @description Returns all the ids used in this clock set.
	 */
	ids(clock) {
		return clock.getEntries.map((item) => item[0]);
	}

	/**
	 * @description Returns all the values used in this clock set,
	 * including the anonymous values.
	 */
	values(clock) {
		const lst = clock.getEntries.reduce((acc, entry) => {
			const value = entry[2];
			value.length !== 0 && acc.push(value);
			return acc;
		}, []);
		return clock.getValues.concat(lst.flat());
	}

	/**
	 * @description Compares the equality of both clocks, regarding
	 * only the causal histories, thus ignoring the values.
	 */
	equal(clock1, clock2) {
		if (!Array.isArray(clock1.getList)) throw 'clock1 should be a list';
		if (!Array.isArray(clock2.getList)) throw 'clock2 should be a list';
		if (clock1.getList.length === 2 && clock2.getList.length === 2) return this._equal(clock1.getEntries, clock2.getEntries); // DVVSet
		return this._equal(clock1, clock2);
	}

	_equal(vector1, vector2) {
	    if(vector1.length == 0 && vector2.length == 0) return true;

	    if (vector1.length > 0 && vector1[0].length > 0 && vector2.length > 0 && vector2[0].length > 0) {
		if (vector1[0][0] == vector2[0][0]) {
		    if (vector1[0].length > 1 && vector2[0].length > 1 && vector1[0][1] == vector2[0][1]) {
			if (vector1[0][2].length == vector2[0][2].length) {
			    var v1 = JSON.parse(JSON.stringify(vector1)).slice(1);
			    var v2 = JSON.parse(JSON.stringify(vector2)).slice(1);
			    return this._equal(v1, v2);
			}
		    }
		}
	    }
	    return false;
	}

	_greater(vector1, vector2, strict) {
		if (vector1.length === 0 && vector2.length === 0) return strict;
		if (vector2.length === 0) return true;
		if (vector1.length === 0) return false;
		if (vector1[0][0] === vector2[0][0]) {
			const dot_number1 = vector1[0][1];
			const dot_number2 = vector2[0][1];
			if (dot_number1 === dot_number2) {
				return this._greater(vector1.slice(1), vector2.slice(1), strict);
			}
			if (dot_number1 > dot_number2) {
				return this._greater(vector1.slice(1), vector2.slice(1), true);
			}
			if (dot_number1 < dot_number2) return false;
		}

		if (cmp_fun(vector2[0][0], vector1[0][0])) return this._greater(vector1.slice(1), vector2, true);

		return false;
	}

	/**
	 * @description Returns True if the first clock is causally older than
	 * the second clock, thus values on the first clock are outdated.
	 * Returns False otherwise.
	 */
	less(clock1, clock2) {
		return this._greater(clock2.getEntries, clock1.getEntries, false);
	}
}