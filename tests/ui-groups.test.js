import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registry} from '../src/registry.js';
import {inputGroups} from '../src/ui-groups.js';
test('UI grouping exhaustively preserves calculator and field order with no duplicates',()=>{
 assert.deepEqual(Object.keys(inputGroups).sort(),registry.map(d=>d.id).sort());
 for(const d of registry){const groups=inputGroups[d.id];assert.equal(new Set(groups.map(([title])=>title)).size,groups.length);assert.deepEqual(groups.flatMap(([,ids])=>ids),d.inputs.map(f=>f.id),d.id);}
});
