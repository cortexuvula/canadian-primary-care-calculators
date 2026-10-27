import {useState,useRef,useLayoutEffect} from 'react';
import {Button,Input,host,ROUTES_AREA,SIDEBAR_NAV_AREA,PALETTE_AREA} from '@hermes/plugin-sdk';
import {registry,favourites,summary} from './registry.js';
import {catalogPage,BATCH_SIZE} from './catalog-view.js';
import {initial,transition,currentSnapshot} from './state.js';
import {inputGroups} from './ui-groups.js';

import {css} from './precision-theme.js';

function Calculator({definition:d,ctx,active}) {
  const [view,setView]=useState(()=>initial(d));
  const live=useRef(view);
  const mounted=useRef(true);
  const busy=useRef(false);
  const [copyStatus,setCopyStatus]=useState('');
  const form=useRef(null);
  const pendingErrorFocus=useRef(null);
  useLayoutEffect(()=>{
    const field=pendingErrorFocus.current;
    pendingErrorFocus.current=null;
    if(field){
      const control=form.current?.querySelector(`#cpc-${field}`);
      control?.focus({preventScroll:true});
      // Scroll the committed label/control/help/error together, not the old
      // control box: inserted error text can otherwise land below the viewport.
      control?.closest('.cpc-field')?.scrollIntoView({block:'center',inline:'nearest'});
    }
  },[view]);
  useLayoutEffect(()=>{mounted.current=true;return()=>{mounted.current=false;live.current=null;};},[]);
  function send(action) {
    if(!live.current||active.current!==d.id)return;
    const next=transition(d,live.current,action);
    live.current=next; // before React batching: event handlers never read a stale snapshot
    pendingErrorFocus.current=action.type==='calculate'?Object.keys(next.errors)[0]:null;
    setView(next);setCopyStatus('');
  }
  async function copy() {
    if(busy.current||!mounted.current||active.current!==d.id)return;
    const snapshot=currentSnapshot(d,live.current);
    if(!snapshot)return;
    busy.current=true;setCopyStatus('Copying…');
    try {
      const ok=await ctx.os.writeClipboard(summary(d,snapshot.result));
      if(mounted.current&&active.current===d.id&&currentSnapshot(d,live.current)===snapshot)setCopyStatus(ok===true?'Result copied':'Could not copy. Select the result text to copy manually.');
    } catch {
      if(mounted.current&&active.current===d.id&&currentSnapshot(d,live.current)===snapshot)setCopyStatus('Could not copy. Select the result text to copy manually.');
    } finally {busy.current=false;}
  }
  const snapshot=currentSnapshot(d,view);
  return <section className="cpc-work" aria-labelledby="cpc-selected-title">
    <h2 id="cpc-selected-title" tabIndex={-1}>{d.name}</h2>
    <p className="cpc-muted">{d.version}</p><p>{d.endpoint}</p>
    <p className="cpc-flag">{d.applicability}</p>
    <div className="cpc-workbody"><div className="cpc-form-area"><form ref={form} autoComplete="off" noValidate onSubmit={event=>{event.preventDefault();send({type:'calculate'});}} aria-label={`${d.name} inputs`}>
      {inputGroups[d.id].map(([title,ids])=><fieldset key={title} className="cpc-input-group"><legend>{title}</legend><div className="cpc-fields">{ids.map(id=>d.inputs.find(f=>f.id===id)).map(f=><div key={f.id} className={f.type==='choice'?'cpc-field cpc-wide':'cpc-field'}>
        <label htmlFor={`cpc-${f.id}`}>{f.label} ({f.unit})</label>
        {f.type==='choice'?<select id={`cpc-${f.id}`} value={view.draft[f.id]} autoComplete="off" aria-describedby={`cpc-${f.id}-help${view.errors[f.id]?` cpc-${f.id}-error`:''}`} aria-invalid={!!view.errors[f.id]} onChange={e=>send({type:'edit',field:f.id,value:e.target.value})}>
          <option value="">Not selected</option>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>:<Input id={`cpc-${f.id}`} type={f.type==='date'?'date':'text'} inputMode={f.type==='number'?'decimal':'text'} autoComplete="off" spellCheck={false} value={view.draft[f.id]} aria-invalid={!!view.errors[f.id]} aria-describedby={`cpc-${f.id}-help${view.errors[f.id]?` cpc-${f.id}-error`:''}`} onChange={e=>send({type:'edit',field:f.id,value:e.target.value})}/>}
        {f.type==='choice'&&view.draft[f.id]&&<p id={`cpc-${f.id}-selected`} className={`cpc-selected-choice${f.options.find(o=>o.value===view.draft[f.id]).label.length<=30?' cpc-short-choice':''}`} aria-hidden="true">{f.options.find(o=>o.value===view.draft[f.id]).label}</p>}
        <p id={`cpc-${f.id}-help`} className="cpc-help">{f.help}</p>
        {view.errors[f.id]&&<p id={`cpc-${f.id}-error`} className="cpc-error">{view.errors[f.id]}</p>}
      </div>)}</div></fieldset>)}
      <div className="cpc-actions"><Button type="submit" className="cpc-primary">Calculate</Button><Button type="button" variant="outline" onClick={()=>send({type:'reset'})}>Reset inputs</Button></div>
    </form>
    <p role="status" aria-live="polite" className={snapshot?'cpc-status cpc-sr-only':'cpc-status'}>{view.status}</p></div><div className="cpc-output-area">
    {snapshot&&<section className="cpc-result" aria-label="Result">
      <h3>Result</h3>
      <dl className="cpc-values">{(d.resultOutputs?d.resultOutputs(snapshot.result):d.outputs).filter(o=>snapshot.result[o.key]!==null&&snapshot.result[o.key]!==undefined).map(o=><div key={o.key}><dt>{o.label}</dt><dd>{snapshot.result[o.key].toFixed(o.decimals)} <span>{o.unit}</span></dd></div>)}</dl>
      <p className="cpc-muted">{d.version}</p><p>{d.endpoint}</p>
      <p>{d.interpretation(snapshot.result)}</p><p className="cpc-help">{d.applicability}</p>
      <Button type="button" variant="outline" disabled={copyStatus==='Copying…'} onClick={copy}>Copy result</Button>
      <p className="cpc-help">Copy places this result on the system clipboard; it may remain there after you reset or leave Hermes. Clipboard content is not cleared by reset.</p>
    </section>}
    <p role="status" aria-live="polite">{copyStatus}</p></div></div>
    <details><summary>Method, applicability & sources</summary><h3>Method & conversion</h3><p>{d.method}</p><p>{d.conversion}</p><h3>Applicability & input limits</h3><p>{d.applicability}</p><p>{d.validation}</p><h3>Clinical review status</h3><p>{d.clinicalReview}</p><h3>Sources</h3><p className="cpc-help">Source links open online only when selected.</p><ul>{d.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title} — Opens online</a><div className="cpc-help">Accessed {s.accessed}</div></li>)}</ul></details>
  </section>;
}

function readFavourites(ctx) {
  try {
    const stored=ctx.storage.get('favourites.v1',[]);
    const ids=favourites(stored);
    return {ids,warning:JSON.stringify(stored)===JSON.stringify(ids)?'':'Invalid favourite preferences were ignored.'};
  } catch {return {ids:[],warning:'Could not read favourites; calculations remain available.'};}
}
export function Library({ctx,catalog=registry}) {
  const [filters,setFilters]=useState({query:'',category:'all',onlyFavourites:false,az:false,letter:'all'});
  const {query,category,onlyFavourites,az,letter}=filters;
  const [limit,setLimit]=useState(BATCH_SIZE);
  const [prefs,setPrefs]=useState(()=>readFavourites(ctx));
  const [selected,setSelected]=useState(null);
  const active=useRef(null);
  const container=useRef(null);
  const [compact,setCompact]=useState(true);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const focusSelection=useRef(false);
  const reveal=useRef(null);
  useLayoutEffect(()=>{
    const observer=new ResizeObserver(entries=>setCompact(entries[0].contentRect.width<760));
    observer.observe(container.current);
    return()=>observer.disconnect();
  },[]);
  useLayoutEffect(()=>{
    if(focusSelection.current){document.getElementById('cpc-selected-title')?.focus();focusSelection.current=false;}
  },[selected]);
  useLayoutEffect(()=>{
    if(reveal.current){container.current?.querySelector(`[data-testid="select-${reveal.current}"]`)?.focus();reveal.current=null;}
  },[limit]);
  const {matches,shown}=catalogPage(catalog,{...filters,favouriteIds:prefs.ids},limit);
  const categories=[...new Set(catalog.map(d=>d.category))];
  const groups=az?[null]:[...new Set(shown.map(d=>d.category))];
  function change(values){setFilters(previous=>({...previous,...values}));setLimit(BATCH_SIZE);}
  function resetFilters(){setFilters({query:'',category:'all',onlyFavourites:false,az:false,letter:'all'});setLimit(BATCH_SIZE);}
  function select(d) {setLibraryOpen(false);if(active.current===d.id){document.getElementById('cpc-selected-title')?.focus();return;}active.current=d.id;focusSelection.current=true;setSelected(d);}
  function toggle(id) {
    const ids=favourites(prefs.ids.includes(id)?prefs.ids.filter(x=>x!==id):[...prefs.ids,id]);
    try {ctx.storage.set('favourites.v1',ids);setPrefs({ids,warning:''});setLimit(BATCH_SIZE);}
    catch {setPrefs({...prefs,warning:'Could not save favourites; previous preferences retained.'});}
  }
  return <main className={`cpc${selected?' cpc-active':''}`} ref={container}>
    <style>{css}</style><header><h1>Canadian Primary Care</h1><p className="cpc-muted">Local, on-device calculations · clinical inputs not saved</p><p className="cpc-help">No patient identifiers. Not a diagnosis. Clinician decision support — verify applicability and consult the model references. Release review evidence is recorded in the project documentation.</p></header>
    <div className="cpc-layout"><aside className="cpc-library" aria-label="Calculator library">
      {compact&&selected&&<Button type="button" variant="outline" aria-expanded={libraryOpen} aria-controls="cpc-catalog" onClick={()=>setLibraryOpen(open=>!open)}>Change calculator · {selected.name} · {selected.inputs.length} inputs</Button>}
      <div id="cpc-catalog" hidden={compact&&!!selected&&!libraryOpen}>
      <div className="cpc-command"><label htmlFor="cpc-search">Search calculators</label><Input id="cpc-search" type="search" autoComplete="off" value={query} placeholder="Name, alias or category" onChange={e=>change({query:e.target.value})}/>
      <div className="cpc-filters"><select aria-label="Filter by clinical category" value={category} onChange={e=>change({category:e.target.value})}><option value="all">All categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
      <Button type="button" variant="outline" aria-pressed={onlyFavourites} onClick={()=>change({onlyFavourites:!onlyFavourites})}>{onlyFavourites?'Show all calculators':'Show favourites'}</Button>
      <Button type="button" variant="outline" aria-pressed={az} onClick={()=>change({az:!az})}>Sort A–Z</Button>
      <select aria-label="Browse first letter" value={letter} onChange={e=>change({letter:e.target.value,az:e.target.value!=='all'||az})}><option value="all">Any letter</option>{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c=><option key={c} value={c}>{c}</option>)}</select>
      </div><div className="cpc-actions">{query&&<Button type="button" variant="outline" onClick={()=>change({query:''})}>Clear search</Button>}{(query||category!=='all'||onlyFavourites||az||letter!=='all')&&<Button type="button" variant="outline" onClick={resetFilters}>Reset filters</Button>}</div>
      <p className="cpc-help" id="cpc-count" role="status">Showing {shown.length} of {matches.length} {matches.length===1?'calculator':'calculators'}</p></div>
      <div className="cpc-catalog-rows">{groups.map(group=><section key={group??'az'} aria-label={group??'Alphabetical calculators'}>{group&&<h2>{group}</h2>}<div className="cpc-entries">{shown.filter(d=>!group||d.category===group).map(d=><div key={d.id} className="cpc-row">
        <Button type="button" variant="outline" data-testid={`select-${d.id}`} aria-current={selected?.id===d.id?'true':undefined} onClick={()=>select(d)}><span className="cpc-name">{d.name}</span>{selected?.id===d.id?' — Selected':''}<small>{d.version}</small></Button>
        <Button type="button" variant="outline" aria-label={`${prefs.ids.includes(d.id)?'Remove from':'Add to'} favourites: ${d.name}`} aria-pressed={prefs.ids.includes(d.id)} onClick={()=>toggle(d.id)}>{prefs.ids.includes(d.id)?'★':'☆'}</Button>
      </div>)}</div></section>)}</div>
      {shown.length<matches.length&&<Button type="button" variant="outline" onClick={()=>{reveal.current=matches[shown.length].id;setLimit(previous=>previous+BATCH_SIZE);}}>Show more calculators</Button>}
      {!matches.length&&<p>{onlyFavourites&&!prefs.ids.length?'No favourites yet':query||category!=='all'||letter!=='all'?'No calculators match these filters.':'No calculators available.'}</p>}
      {prefs.warning&&<p role="status">{prefs.warning}</p>}
      {selected&&<><p className="cpc-selected-note">Working on: {selected.name}</p><Button type="button" variant="outline" onClick={()=>{setLibraryOpen(false);document.getElementById('cpc-selected-title')?.focus();}}>Jump to calculator</Button></>}
      </div>
    </aside>
    {selected?<Calculator key={selected.id} definition={selected} ctx={ctx} active={active}/>:<section className="cpc-work cpc-empty"><h2>Select a calculator to begin</h2><p>Choose a model from the library. Inputs start blank and are cleared when switching calculators or leaving this page.</p></section>}
    </div>
  </main>;
}
export default {
  id:'canadian-primary-care',name:'Canadian Primary Care',defaultEnabled:false,
  register(ctx) {
    ctx.register({id:'page',area:ROUTES_AREA,data:{path:'/canadian-primary-care'},render:()=> <Library ctx={ctx}/>});
    ctx.register({id:'nav',area:SIDEBAR_NAV_AREA,order:63,data:{path:'/canadian-primary-care',label:'Canadian Primary Care',codicon:'symbol-method'}});
    ctx.register({id:'open',area:PALETTE_AREA,data:{id:'canadian-primary-care.open',label:'Open Canadian Primary Care',keywords:['calculators','Canadian','primary care'],run:()=>host.navigate('/canadian-primary-care')}});
  }
};
