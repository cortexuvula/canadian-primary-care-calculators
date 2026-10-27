import {test,expect} from '@playwright/test';
import {choose} from './ui-helpers.js';
test('Precision Console scoped light dark surfaces and container-sized discovery',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 await expect(page.locator('.cpc')).toHaveCSS('background-color','rgb(220, 229, 230)');
 const host=await page.evaluate(()=>document.documentElement.style.cssText);
 await page.evaluate(()=>document.documentElement.dataset.hermesMode='dark');
 await expect(page.locator('.cpc')).toHaveCSS('background-color','rgb(16, 29, 35)');
 await expect(page.locator('.cpc')).toHaveCSS('color','rgb(235, 247, 247)');
 expect(await page.evaluate(()=>document.documentElement.style.cssText)).toBe(host);
 await page.evaluate(()=>{document.documentElement.dataset.hermesMode='light';document.querySelector('#root').style.width='320px';});
 await choose(page,'bsa-mosteller');await expect(page.getByRole('button',{name:/^Change calculator/})).toBeVisible();await expect(page.locator('#cpc-search')).toBeHidden();
 expect(await page.locator('.cpc').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 const sizes=await page.locator('.cpc button,.cpc input,.cpc select').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height));expect(sizes.every(h=>h>=44)).toBe(true);
});

test('active wide discovery is independently bounded beside a compact output-first workspace',async({page})=>{
 await page.setViewportSize({width:1200,height:1000});await page.goto('/');await choose(page,'bsa-mosteller');await page.locator('#cpc-height').fill('170');await page.locator('#cpc-weight').fill('70');await page.getByRole('button',{name:'Calculate',exact:true}).click();
 const library=await page.locator('.cpc-library').boundingBox();expect(library.height).toBeLessThanOrEqual(750);
 const form=await page.locator('.cpc-form-area').boundingBox(),result=await page.locator('.cpc-result').boundingBox();expect(result.x).toBeGreaterThan(form.x+form.width);expect(Math.abs(result.y-form.y)).toBeLessThan(2);
 await page.evaluate(()=>document.documentElement.style.fontSize='32px');
 const resultLarge=await page.locator('.cpc-result').boundingBox(),formLarge=await page.locator('.cpc-form-area').boundingBox();expect(resultLarge.y).toBeGreaterThan(formLarge.y+formLarge.height);
});

test('discovery composes category alias favourites letter and A-Z without remounting work',async({page})=>{
 await page.setViewportSize({width:1200,height:900});await page.goto('/');
 await expect(page.locator('#cpc-count')).toHaveText('Showing 24 of 26 calculators');
 await page.getByLabel('Filter by clinical category').selectOption('Renal');
 await page.getByLabel('Search calculators',{exact:true}).fill('CrCl');
 await expect(page.locator('.cpc-row')).toHaveCount(1);await choose(page,'cockcroft-gault');
 await page.locator('#cpc-age').fill('55');
 await page.getByLabel('Search calculators',{exact:true}).fill('zzzz');
 await expect(page.getByText('No calculators match these filters.')).toBeVisible();
 await expect(page.locator('#cpc-age')).toHaveValue('55');
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();
 await page.getByRole('button',{name:'Add to favourites: Adult BMI',exact:true}).click();
 await page.getByRole('button',{name:'Show favourites',exact:true}).click();
 await expect(page.locator('.cpc-row')).toHaveCount(1);
 await page.getByLabel('Browse first letter').selectOption('B');
 await expect(page.getByRole('button',{name:'Sort A–Z',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByText('No calculators match these filters.')).toBeVisible();
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();
 await page.getByRole('button',{name:'Sort A–Z',exact:true}).click();
 const names=await page.locator('.cpc-row [data-testid] .cpc-name').allTextContents();
 expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b,'en')));
 await expect(page.locator('#cpc-age')).toHaveValue('55');
});
