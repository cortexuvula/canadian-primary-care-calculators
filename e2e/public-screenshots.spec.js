import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {choose} from './ui-helpers.js';
test('public gallery uses only synthetic data and the compiled runtime',async({page})=>{
 const dir='.artifacts/public-screenshots';await mkdir(dir,{recursive:true});
 await page.setViewportSize({width:1200,height:950});await page.goto('/');await expect(page.locator('.cpc-row')).toHaveCount(24);
 const label=async()=>page.evaluate(()=>{const note=document.createElement('div');note.textContent='Synthetic example · browser harness · not live Desktop';note.style.cssText='box-sizing:border-box;padding:8px 12px;font:12px system-ui;color:#fff;background:#243b53;overflow-wrap:anywhere';document.body.prepend(note);});
 await label();
 await page.screenshot({path:`${dir}/library-light.png`,fullPage:true});
 await choose(page,'bsa-mosteller');await page.locator('#cpc-height').fill('170');await page.locator('#cpc-weight').fill('70');await page.getByRole('button',{name:'Calculate',exact:true}).click();
 await page.evaluate(()=>document.documentElement.dataset.hermesMode='dark');await expect(page.locator('.cpc-result')).toBeVisible();
 await page.screenshot({path:`${dir}/bsa-dark.png`,fullPage:true});
 await page.setViewportSize({width:320,height:950});await page.goto('/');await expect(page.locator('.cpc-row')).toHaveCount(24);await label();
 await page.screenshot({path:`${dir}/library-narrow.png`,fullPage:true});
});
