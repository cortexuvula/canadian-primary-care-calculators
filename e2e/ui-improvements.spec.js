import {test,expect} from '@playwright/test';
import {registry,summary} from '../src/registry.js';
import {choose} from './ui-helpers.js';
async function fill(page,d){for(const f of d.inputs){const c=page.locator('#cpc-'+f.id),v=d.vectors[0].inputs[f.id]??'';if(f.type==='choice')await c.selectOption(v);else await c.fill(v);}}
test('all compiled forms expose ordered semantic input groups and exact registry fields',async({page})=>{
 await page.goto('/');
 for(const d of registry){await choose(page,d.id);const form=page.getByRole('form',{name:`${d.name} inputs`,exact:true});
 expect(await form.locator('fieldset').count()).toBeGreaterThanOrEqual(d.inputs.length>4?2:1);
 expect(await form.locator('fieldset legend').allTextContents()).not.toContain('Inputs & eligibility');
 expect(await form.locator('input,select').evaluateAll(es=>es.map(e=>e.id))).toEqual(d.inputs.map(f=>'cpc-'+f.id));
 for(const f of d.inputs){const c=page.locator('#cpc-'+f.id);await expect(c).toBeVisible();await expect(c).toHaveValue('');await expect(c).toHaveAccessibleName(`${f.label} (${f.unit})`);await expect(page.locator('#cpc-'+f.id+'-help')).toHaveText(f.help);if(f.options)expect(await c.locator('option').allTextContents()).toEqual(['Not selected',...f.options.map(o=>o.label)]);}
 }
});
test('result leads with outputs and selected long choices remain readable at 200 percent',async({page})=>{
 await page.setViewportSize({width:320,height:900});await page.goto('/');await page.evaluate(()=>document.documentElement.style.fontSize='32px');const d=registry.find(d=>d.id==='has-bled');await choose(page,d.id);await fill(page,d);await page.locator('#cpc-anticoagulant').selectOption('non-vka');await page.locator('#cpc-labile').selectOption('na');
 for(const f of d.inputs.filter(f=>f.type==='choice')){const value=await page.locator('#cpc-'+f.id).inputValue(),label=f.options.find(o=>o.value===value).label;await expect(page.locator('#cpc-'+f.id+'-selected')).toHaveText(label);}
 await page.getByRole('button',{name:'Calculate',exact:true}).click();const r=page.getByRole('region',{name:'Result',exact:true});await expect(r).toBeVisible();
 expect(await r.locator(':scope > *').evaluateAll(es=>es.map(e=>e.tagName).slice(0,3))).toEqual(['H3','DL','P']);
 const outputTop=await r.locator('dl').evaluate(e=>e.getBoundingClientRect().top);expect(outputTop).toBeLessThan(await r.getByText(d.version,{exact:true}).evaluate(e=>e.getBoundingClientRect().top));
 await expect(r).toContainText('Clipboard content is not cleared by reset.');await page.getByRole('button',{name:'Copy result',exact:true}).click();expect(await page.evaluate(()=>window.probe.clipboard.at(-1))).toBe(summary(d,d.calculate({...d.vectors[0].inputs,anticoagulant:'non-vka',labile:'na'})));
});
test('simple result read order leads with output before model and catalog stars stay beside cards',async({page})=>{
 await page.setViewportSize({width:320,height:900});await page.goto('/');const card=page.getByTestId('select-bsa-mosteller'),star=page.getByRole('button',{name:'Add to favourites: Body surface area — Mosteller',exact:true});const a=await card.boundingBox(),b=await star.boundingBox();expect(b.x).toBeGreaterThan(a.x);expect(b.y).toBe(a.y);await choose(page,'bsa-mosteller');await fill(page,registry.find(d=>d.id==='bsa-mosteller'));await page.getByRole('button',{name:'Calculate',exact:true}).click();expect(await page.locator('.cpc-result > *').evaluateAll(es=>es.map(e=>e.tagName).slice(0,3))).toEqual(['H3','DL','P']);
});
test('selected narrow task closes library, retains search and draft, and focuses new task',async({page})=>{
 for(const width of [320,640]){await page.setViewportSize({width,height:900});await page.goto('/');await page.getByLabel('Search calculators',{exact:true}).fill('Framingham');await choose(page,'framingham');
 const toggle=page.getByRole('button',{name:/^Change calculator/});await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toContainText('12 inputs');await expect(page.locator('#cpc-search')).toBeHidden();await expect(page.locator('#cpc-selected-title')).toBeFocused();
 expect(await page.locator('.cpc-work').evaluate(e=>e.getBoundingClientRect().top+scrollY)).toBeLessThan(650);
 await page.locator('#cpc-age').fill('55');await toggle.click();await expect(page.locator('#cpc-search')).toHaveValue('Framingham');await page.locator('#cpc-search').fill('zzzz');await expect(page.locator('#cpc-age')).toHaveValue('55');await toggle.click();await expect(page.locator('#cpc-age')).toHaveValue('55');await toggle.click();await page.getByRole('button',{name:'Clear search'}).click();await choose(page,registry.at(-1).id);await expect(page.locator('#cpc-selected-title')).toBeFocused();await expect(toggle).toHaveAttribute('aria-expanded','false');
 }
});
