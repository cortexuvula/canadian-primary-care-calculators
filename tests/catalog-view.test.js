import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registry} from '../src/registry.js';
import {filterCatalog,catalogPage} from '../src/catalog-view.js';
import {fictionalCatalog} from './fixtures/fictional-catalog.js';
for(const size of [50,150,300])test(`FICTIONAL ${size} bounded composable presentation`,()=>{
 const catalog=fictionalCatalog(size),before=JSON.stringify(catalog);
 let page=catalogPage(catalog,{});
 assert.equal(page.matches.length,size);assert.equal(page.shown.length,24);
 assert.equal(catalogPage(catalog,{},48).shown.length,48);
 assert.equal(catalogPage(catalog,{},size+24).shown.length,size);
 assert.deepEqual(filterCatalog(catalog,{query:'fictional-alias-27-exact'}).map(d=>d.id),['fictional-27']);
 const filters={category:'Fictional category 0',onlyFavourites:true,favouriteIds:['fictional-0','fictional-26','fictional-78'],letter:'A',az:true};
 assert.deepEqual(filterCatalog(catalog,filters).map(d=>d.id),size>78?['fictional-0','fictional-78']:['fictional-0']);
 const sorted=filterCatalog(catalog,{az:true});assert.deepEqual(sorted.map(d=>d.name),catalog.map(d=>d.name).sort((a,b)=>a.localeCompare(b,'en')));
 assert.equal(filterCatalog(catalog,{query:'no such entry'}).length,0);
 assert.equal(filterCatalog(catalog,{onlyFavourites:true,favouriteIds:[]}).length,0);
 assert.equal(JSON.stringify(catalog),before);
});
test('presentation search composes canonical alias and category without changing registry',()=>{
 assert.deepEqual(filterCatalog(registry,{query:'  KIDNEY ',category:'Renal'}).map(d=>d.id),['egfr-2021']);
 assert.deepEqual(filterCatalog(registry,{query:'CrCl'}).map(d=>d.id),['cockcroft-gault']);
 assert.equal(filterCatalog(registry,{category:'Renal'}).length,2);
 assert.deepEqual(filterCatalog(registry,{}),registry);
});
