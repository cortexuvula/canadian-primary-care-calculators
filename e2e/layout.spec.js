import {test,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
function luminance(rgb){return rgb.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('container reflow, zoom, both themes, neutral text contrast and focus visibility',async({page})=>{
 await mkdir('.artifacts',{recursive:true});await mkdir('.browser/screenshots',{recursive:true});const measured=[];
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.getByTestId('select-homa1-ir').click();
 for(const theme of ['light','dark'])for(const width of [320,640,1200])for(const scale of [1,2]) {
  await page.evaluate(({theme,width,scale})=>{document.body.classList.toggle('dark',theme==='dark');document.querySelector('#root').style.width=width+'px';document.documentElement.style.fontSize=16*scale+'px';},{theme,width,scale});
  const geometry=await page.evaluate(()=>{const main=document.querySelector('.cpc');const library=document.querySelector('.cpc-library').getBoundingClientRect();const work=document.querySelector('.cpc-work').getBoundingClientRect();return{scrollWidth:main.scrollWidth,clientWidth:main.clientWidth,columns:work.x>library.x+library.width-1,controlOverflow:[...main.querySelectorAll('button,input,select')].filter(e=>e.getBoundingClientRect().right>main.getBoundingClientRect().right+1).length};});
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth+1);expect(geometry.controlOverflow).toBe(0);expect(geometry.columns).toBe(width===1200);
  const colors=await page.evaluate(()=>{const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);const styles=e=>rgb(getComputedStyle(e).color);const bg=e=>{while(e){const c=getComputedStyle(e).backgroundColor;if(c!=='rgba(0, 0, 0, 0)')return rgb(c);e=e.parentElement;}return [255,255,255];};const primary=document.querySelector('.cpc h1'),secondary=document.querySelector('.cpc-help');return {primary:styles(primary),secondary:styles(secondary),primaryBackground:bg(primary),secondaryBackground:bg(secondary)};});
  const primary=contrast(colors.primary,colors.primaryBackground),secondary=contrast(colors.secondary,colors.secondaryBackground);expect(primary).toBeGreaterThanOrEqual(4.5);expect(secondary).toBeGreaterThanOrEqual(4.5);
  await page.locator('#cpc-glucose').focus();const focus=await page.locator('#cpc-glucose').evaluate(e=>({style:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth}));expect(focus.style).toBe('solid');expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
  measured.push({theme,width,textScale:scale,...geometry,primaryContrast:primary,secondaryContrast:secondary,focus});
  if(scale===1&&[320,1200].includes(width)) {
    await page.locator('#cpc-glucose').blur();
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:`.browser/screenshots/${theme}-${width}.png`,fullPage:true,caret:'initial'});
  }
 }
 await writeFile('.artifacts/precision-layout-measurements.json',JSON.stringify({note:'Real Chromium, compiled plugin + real React; SDK control adapters and representative harness tokens, NOT installed Desktop theme certification.',measured},null,2)+'\n');
});
