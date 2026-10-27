import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {registry} from '../src/registry.js';
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
test('public package keeps protected numerical source bytes and both reviewed runtimes',()=>{
 assert.ok(existsSync('clinical.sha256.json'),'protected-source digest manifest must exist');
 const pins=JSON.parse(readFileSync('clinical.sha256.json'));
 assert.deepEqual(Object.keys(pins).sort(),['src/engine.js','src/expansion-registry.js','src/expansion-vectors.js','src/registry.js','src/state.js']);
 for(const [file,expected]of Object.entries(pins))assert.equal(hash(file),expected,file);
 const expected=readFileSync('runtime.sha256','utf8').trim();
 assert.equal(hash('plugin.js'),expected);assert.equal(hash('desktop/plugin.js'),expected);
 assert.equal(registry.length,15);assert.equal(new Set(registry.map(d=>d.category)).size,6);
});
test('public metadata and clinical copy stay honest and consistent',()=>{
 const pkg=JSON.parse(readFileSync('package.json'));
 const lock=JSON.parse(readFileSync('package-lock.json'));
 const manifest=readFileSync('plugin.yaml','utf8');
 assert.equal(pkg.version,'0.3.0');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 assert.equal(pkg.license,'MIT');assert.match(readFileSync('LICENSE','utf8'),/Copyright \(c\) 2026 Andre Hugo/);
 assert.match(manifest,/version: "0\.3\.0"/);assert.match(manifest,/requires_hermes: ">=0\.21\.6"/);
 assert.equal(existsSync('__init__.py'),false,'no fake Python backend');
 for(const file of ['README.md','docs/clinical-guide.md']){
  const text=readFileSync(file,'utf8');assert.match(text,/no regulatory classification is asserted/i);
  assert.doesNotMatch(text,/it is not a medical device|all inputs are synthetic\/examples/i);
 }
});
