Dotted Version Vector Sets
==========================

[![SWUbanner](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner2-direct.svg)](https://github.com/vshymanskyy/StandWithUkraine/blob/main/docs/README.md)

This is an implementation of the Erlang's [DVV](https://github.com/ricardobcl/Dotted-Version-Vectors) on JavaScript.

It is used in distributed systems, where UTC timestamp is unreliable value for object's version control.

Usage examples
==============

* Creating a new version
```js
const dvv = new Dvv();
const modified_utc = Date.now().toString(); // timestamp value is used for example only. It can be anything.
const dot = dvv.create(dvv.new_dvv(modified_utc), 'user_id_1');
```

* Incrementing version
```js
const context = dvv.join(dot);
const modified_utc2 = Date.now().toString();
const new_dot = dvv.update(dvv.new_with_history(context, modified_utc2), dot, 'user_id_2');
dvv.sync([dot, new_dot]);
```

* Detecting conflicts

Conflict is situation when two branches of the history exist.
It could happen when someone updates old version ( casual history ).

```js
const merged_history = dvv.sync([OldVersion, NewVersion]);
const values = dvv.values(merged_history);
values.length > 1
	? console.log('Conflict detected')
	: console.log('Ok');
```

Example
=======
1. User 1 uploads file to the server, specifying version vector:

```js
const dvv = new Dvv();
const modified_utc = Date.now().toString();
const dot = dvv.create(dvv.new_dvv(modified_utc), 'user_id_1');
```

2. Server checks version on a subject of conflict. Then it
stores file with version information and provides it to User 2.

```js
const merged_history = dvv.sync([ExistingVersion, UploadedVersion]);
const values = dvv.values(merged_history);
values.length > 1
	? console.log('409 Conflict detected')
	: console.log('200 OK') // Casual history is linear
```

3. User 2 downloads file, edits it and increments its version, before uploading back to server.

```js
const context = dvv.join(dot); // dot is a downloaded version
const modified_utc = Date.now().toString();
const new_dot = dvv.update(dvv.new_with_history(context, modified_utc), dot, 'user_id_2');
dvv.sync([dot, new_dot]);
```
