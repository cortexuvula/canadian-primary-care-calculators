import {test,expect} from '@playwright/test';
import {registry} from '../src/registry.js';
import {choose} from './ui-helpers.js';
async function select(page,id){await choose(page,id);}
async function fill(page,d){for(const f of d.inputs){const input=page.locator('#cpc-'+f.id);const value=d.vectors[0].inputs[f.id];if(f.type==='choice')await input.selectOption(value);else await input.fill(value);}}
async function calculate(page,d){await select(page,d.id);await fill(page,d);await page.getByRole('button',{name:'Calculate',exact:true}).click();await expect(page.getByRole('region',{name:'Result',exact:true})).toBeVisible();}
for(const d of registry) test(`compiled ${d.id}: golden vector and every field invalidates copy/result`,async({page})=>{
 await page.goto('/');await calculate(page,d);
 const result=page.getByRole('region',{name:'Result',exact:true});
 for(const [key,value]of Object.entries(d.vectors[0].expected)){const unit=d.outputs.find(o=>o.key===key).unit;await expect(result).toContainText(value+' '+unit);}
 for(const f of d.inputs){const input=page.locator('#cpc-'+f.id);if(f.type==='choice')await input.selectOption(d.vectors[0].inputs[f.id]===''?f.options[0].value:'');else await input.fill(d.vectors[0].inputs[f.id]===''?'1':'');await expect(result).toHaveCount(0);await expect(page.getByRole('button',{name:'Copy result',exact:true})).toHaveCount(0);await fill(page,d);await page.getByRole('button',{name:'Calculate',exact:true}).click();await expect(result).toBeVisible();}
});
test('unsupported Framingham range blocks result and copy, error is associated with focused control',async({page})=>{
 await page.goto('/');const d=registry[0];await calculate(page,d);await page.locator('#cpc-age').fill('75');await page.getByRole('button',{name:'Calculate',exact:true}).click();await expect(page.locator('#cpc-age')).toBeFocused();await expect(page.locator('#cpc-age')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#cpc-age-error')).toContainText('Unsupported age');await expect(page.getByRole('region',{name:'Result',exact:true})).toHaveCount(0);
});
test('favourites persist only known IDs; search/filter never clear active clinical work; storage failure reverts',async({page})=>{
 await page.goto('/');await calculate(page,registry[1]);await page.getByRole('button',{name:'Add to favourites: HOMA1-IR',exact:true}).click();
 expect(await page.evaluate(()=>window.probe.storage)).toEqual([{key:'favourites.v1',value:['homa1-ir']}]);
 await page.getByRole('button',{name:'Show favourites',exact:true}).click();await expect(page.getByTestId('select-framingham')).toHaveCount(0);await expect(page.getByRole('region',{name:'Result',exact:true})).toBeVisible();await page.getByLabel('Search calculators',{exact:true}).fill('nonsense');await expect(page.getByRole('region',{name:'Result',exact:true})).toBeVisible();
 await page.evaluate(()=>{window.probe.unmount();});await expect(page.getByRole('heading',{level:1})).toHaveCount(0);await page.evaluate(()=>window.probe.mount());await select(page,'homa1-ir');await expect(page.locator('#cpc-glucose')).toHaveValue('');await expect(page.getByRole('button',{name:'Remove from favourites: HOMA1-IR',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>window.probe.storageFails=true);await page.getByRole('button',{name:'Remove from favourites: HOMA1-IR',exact:true}).click();await expect(page.getByText(/Could not save favourites/)).toBeVisible();await expect(page.getByRole('button',{name:'Remove from favourites: HOMA1-IR',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>window.probe.storage)).toHaveLength(1);
});
test('corrupted favourite records cannot become clinical persistence or actionable phantom entries',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.evaluate(()=>{window.probe.preference={insulin:'synthetic-only',favourites:['ghost']};window.probe.unmount();});await expect(page.getByRole('heading',{level:1})).toHaveCount(0);await page.evaluate(()=>window.probe.mount());await expect(page.getByText('Invalid favourite preferences were ignored.')).toBeVisible();await page.getByRole('button',{name:'Show favourites',exact:true}).click();await expect(page.getByText('No favourites yet')).toBeVisible();expect(await page.evaluate(()=>window.probe.storage)).toEqual([]);
});
test('clipboard success waits for acknowledgement; false and rejection report failure, no fallback',async({page})=>{
 await page.goto('/');await calculate(page,registry[1]);
 for(const outcome of [false,'throw']){await page.evaluate(v=>window.probe.osOutcome=v,outcome);await page.getByRole('button',{name:'Copy result',exact:true}).click();await expect(page.getByText('Could not copy. Select the result text to copy manually.',{exact:true})).toBeVisible();}
 expect(await page.evaluate(()=>window.probe.clipboard)).toHaveLength(2);
 await page.evaluate(()=>{window.probe.osOutcome=true;window.probe.holdCopy=true;});await page.getByRole('button',{name:'Copy result',exact:true}).click();await expect(page.getByRole('button',{name:'Copy result',exact:true})).toBeDisabled();await expect(page.getByText('Result copied',{exact:true})).toHaveCount(0);await page.locator('#cpc-glucose').fill('6.1');await page.evaluate(()=>window.probe.releaseCopy());await expect(page.getByText('Result copied',{exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:'Result',exact:true})).toHaveCount(0);
});
test('switch/unmount while copying cannot report success against another patient draft',async({page})=>{
 await page.goto('/');await calculate(page,registry[1]);await page.evaluate(()=>window.probe.holdCopy=true);await page.getByRole('button',{name:'Copy result',exact:true}).click();await select(page,'egfr-2021');await page.evaluate(()=>window.probe.releaseCopy());await expect(page.getByText('Result copied',{exact:true})).toHaveCount(0);await select(page,'homa1-ir');await expect(page.locator('#cpc-glucose')).toHaveValue('');expect(await page.evaluate(()=>window.probe.clipboard)).toHaveLength(1);
});
test('keyboard selection, jump, form submit and explicit keyboard copy; source links are opt-in',async({page})=>{
 await page.goto('/');await page.getByTestId('select-homa1-ir').focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Jump to calculator'}).click();await expect(page.getByRole('heading',{name:'HOMA1-IR',exact:true})).toBeFocused();await fill(page,registry[1]);await page.locator('#cpc-insulin').focus();await page.keyboard.press('Enter');await expect(page.getByText('Result ready',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Copy result',exact:true}).focus();await page.keyboard.press('Space');await expect(page.getByText('Result copied',{exact:true})).toBeVisible();await page.getByText('Method, applicability & sources',{exact:true}).click();
 const links=page.locator('.cpc a');expect(await links.count()).toBeGreaterThan(0);for(const a of await links.all()){await expect(a).toHaveAttribute('rel','noopener noreferrer');await expect(a).toHaveAttribute('target','_blank');await expect(a).toContainText('Opens online');}
});
test('all models operate offline without persistence APIs, telemetry, URL mutation or console values',async({page})=>{
 const forbidden=[];const logs=[];await page.addInitScript(()=>{window.forbidden=[];const stop=name=>(...args)=>{window.forbidden.push(name);throw Error('Forbidden '+name);};Storage.prototype.setItem=stop('storage.setItem');indexedDB.open=stop('indexedDB.open');window.fetch=stop('fetch');window.WebSocket=stop('WebSocket');window.XMLHttpRequest=stop('XMLHttpRequest');navigator.sendBeacon=stop('sendBeacon');});
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();page.on('request',r=>forbidden.push(r.url()));page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>logs.push(e.message));await page.context().setOffline(true);
 for(const d of registry){await calculate(page,d);await page.getByRole('button',{name:'Reset inputs'}).click();}
 expect(forbidden).toEqual([]);expect(logs).toEqual([]);expect(await page.evaluate(()=>window.forbidden)).toEqual([]);expect(await page.evaluate(()=>window.probe.storage)).toEqual([]);expect(await page.evaluate(()=>location.search+location.hash)).toBe('');
});
