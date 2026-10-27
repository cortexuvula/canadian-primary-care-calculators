import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {choose} from './ui-helpers.js';
const dir='.artifacts/precision';
const lum=rgb=>rgb.map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
test('rendered console panel text action focus and input boundaries contrast in both appearances',async({page})=>{
 await page.goto('/');await choose(page,'bsa-mosteller');await page.locator('#cpc-height').fill('170');await page.locator('#cpc-weight').fill('70');await page.getByRole('button',{name:'Calculate',exact:true}).click();
 const results=[];
 for(const theme of ['light','dark']){
 await page.evaluate(theme=>document.documentElement.dataset.hermesMode=theme,theme);
 const samples=await page.evaluate(()=>{
 const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),bg=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(c!=='rgba(0, 0, 0, 0)')return rgb(c);e=e.parentElement;}throw Error('missing background');};
 return ['.cpc>header h1','.cpc>header .cpc-help','.cpc-command label','.cpc-command input','.cpc-row small','.cpc-work>h2','.cpc-flag','.cpc-field label','.cpc-field input','.cpc-field .cpc-help','.cpc-primary','.cpc-result dt','.cpc-result dd','.cpc-result .cpc-help','.cpc-result button'].map(selector=>{const e=document.querySelector(selector),s=getComputedStyle(e);return{selector,text:rgb(s.color),background:bg(e),border:rgb(s.borderTopColor)};});
 });
 for(const sample of samples){const ratio=contrast(sample.text,sample.background);expect(ratio,sample.selector+' '+theme).toBeGreaterThanOrEqual(4.5);results.push({theme,...sample,ratio});}
 const input=samples.find(s=>s.selector==='.cpc-field input');expect(contrast(input.border,input.background),'Input boundary '+theme).toBeGreaterThanOrEqual(3);
 await page.locator('#cpc-height').focus();await expect(page.locator('#cpc-height')).toHaveCSS('outline-style','solid');
 }
 await mkdir(dir,{recursive:true});await writeFile(`${dir}/contrast.json`,JSON.stringify(results,null,2)+'\n');
});
test('compiled library and scale screenshots plus 12 narrow wide and text-size discovery reflows',async({page,browser})=>{
 test.setTimeout(120000);await mkdir(dir,{recursive:true});const runs=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const theme of ['light','dark'])for(const width of [320,640,1200])for(const scale of [1,2]){
 await page.setViewportSize({width,height:1000});await page.goto('/');await expect(page.locator('#cpc-search')).toBeVisible();
 await page.evaluate(({theme,scale})=>{document.documentElement.dataset.hermesMode=theme;document.documentElement.style.fontSize=16*scale+'px';},{theme,scale});
 await expect(page.locator('.cpc-row')).toHaveCount(15);
 const g=await page.locator('.cpc').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,document:document.documentElement.scrollWidth,rows:[...e.querySelectorAll('.cpc-row')].map(r=>({height:r.getBoundingClientRect().height,x:r.getBoundingClientRect().x})),targets:[...e.querySelectorAll('input,select,button')].filter(e=>e.getClientRects().length).map(e=>({height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width})),columns:getComputedStyle(e.querySelector('.cpc-entries')).gridTemplateColumns}));
 expect(g.scroll).toBeLessThanOrEqual(g.width+1);expect(g.document).toBe(width);expect(g.targets.every(r=>r.height>=44&&r.width>=44)).toBe(true);
 expect(g.columns.split(' ').length).toBe(width===1200&&scale===1?2:1);
 await page.screenshot({path:`${dir}/library-${theme}-${width}-${scale===2?'200pct':'100pct'}.png`,fullPage:true});runs.push({theme,width,scale,...g});
 }
 await page.goto('/');await page.waitForFunction(()=>typeof window.probe?.mountScale==='function');await page.evaluate(()=>window.probe.mountScale(300));await expect(page.locator('.cpc-row')).toHaveCount(24);await page.setViewportSize({width:1200,height:1000});await page.screenshot({path:`${dir}/FICTIONAL-300-bounded-library.png`,fullPage:true});
 expect(errors).toEqual([]);await writeFile(`${dir}/discovery-reflow.json`,JSON.stringify({browser:browser.version(),runs,errors},null,2)+'\n');
});
