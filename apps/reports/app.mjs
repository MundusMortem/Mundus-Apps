import { defaults,validateConfig,selectArticles,digestText,syncConfig } from './model.mjs';
const $=id=>document.getElementById(id);
let config={...defaults},serverConfig=null,data={articles:[]},topic='';
const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
let saved=load('reports-saved',[]),read=load('reports-read',[]);
if(!Array.isArray(saved))saved=[];if(!Array.isArray(read))read=[];
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{$('status').textContent='Browser storage is unavailable; changes will last for this visit only.';return false;}}
function visible(){return selectArticles(data.articles,{search:$('search').value,topic,savedOnly:$('savedOnly').checked,unreadOnly:$('unreadOnly').checked,sort:$('sort').value,saved,read});}
function render(){
  $('topics').replaceChildren();
  for(const name of ['',...config.themes]){const b=document.createElement('button');b.textContent=name||'All topics';b.setAttribute('aria-pressed',String(topic===name));b.onclick=()=>{topic=name;render();};$('topics').append(b);}
  $('articles').replaceChildren();const articles=visible();$('count').textContent=`(${articles.length})`;
  if(!articles.length){const p=document.createElement('p');p.textContent=data.articles.length?'No stories match these filters.':'Your feed is waiting for its first collection. Publish your topics or check back after the next hourly refresh.';$('articles').append(p);}
  for(const a of articles){
    const card=document.createElement('article');card.className='story'+(read.includes(a.id)?' read':'');
    const content=document.createElement('div'),meta=document.createElement('div');meta.className='meta';meta.textContent=`${a.source} · ${a.publishedAt?.slice(0,10)||'Date unavailable'} · ${(a.themes||[]).join(', ')}`;
    const h=document.createElement('h3'),link=document.createElement('a');link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=a.title;link.onclick=()=>{read=[...new Set([...read,a.id])];store('reports-read',read);card.classList.add('read');};h.append(link);
    const desc=document.createElement('p');desc.textContent=a.summary||'';content.append(meta,h,desc);
    const save=document.createElement('button');save.textContent=saved.includes(a.id)?'Saved ✓':'Save';save.setAttribute('aria-label',`${saved.includes(a.id)?'Unsave':'Save'} ${a.title}`);save.onclick=()=>{saved=saved.includes(a.id)?saved.filter(id=>id!==a.id):[...saved,a.id];store('reports-saved',saved);render();};card.append(content,save);$('articles').append(card);
  }
  $('emailStatus').textContent=serverConfig?.emailEnabled?`Email enabled · every ${serverConfig.digestHours} hours`:'Email reports are off. Enable and publish in Customize.';
}
async function refresh(){
  $('status').textContent='Refreshing your briefing…';
  try{const responses=await Promise.all([fetch('./config.json',{cache:'no-store'}),fetch('./data.json',{cache:'no-store'})]);if(responses.some(r=>!r.ok))throw Error();
    serverConfig=validateConfig(await responses[0].json());const next=await responses[1].json();if(!Array.isArray(next.articles))throw Error();data=next;
    try{config=validateConfig(load('reports-settings',serverConfig));}catch{config=serverConfig;}
    if(topic&&!config.themes.includes(topic))topic='';render();
    const stale=data.generatedAt&&(Date.now()-Date.parse(data.generatedAt)>3*3600000);
    $('status').textContent=JSON.stringify(config)!==JSON.stringify(serverConfig)?'Local settings differ from published settings. Publish saved settings to update news collection and email.':stale?'The feed is over three hours old. Check the news refresh workflow.':data.errors?.length?`Some topics could not refresh: ${data.errors.join(', ')}. Showing available stories.`:'Hourly feed · Choose a topic or search your briefing.';
    $('updated').textContent=data.generatedAt?`Collected ${new Date(data.generatedAt).toLocaleString()}`:'Collection pending.';
  }catch{$('status').textContent='Could not refresh. Showing the last available briefing. Check your connection.';}
}
for(const id of ['search','savedOnly','unreadOnly','sort'])$(id).addEventListener('input',render);
$('refresh').onclick=refresh;
$('settingsButton').onclick=()=>{for(const key of ['country','language','maxArticles','digestHours','digestLimit'])$(key).value=config[key];$('themesInput').value=config.themes.join('\n');$('sourcesInput').value=config.sources.join(', ');$('excludeInput').value=config.exclude.join(', ');$('emailEnabled').checked=config.emailEnabled;$('settings').showModal();};
$('closeSettings').onclick=()=>$('settings').close();$('settings').addEventListener('close',()=>{$('syncToken').value='';});
$('settingsForm').onsubmit=event=>{event.preventDefault();try{const parts=(id,delimiter)=>$(id).value.split(delimiter).map(x=>x.trim()).filter(Boolean);config=validateConfig({themes:parts('themesInput','\n'),sources:parts('sourcesInput',','),exclude:parts('excludeInput',','),country:$('country').value,language:$('language').value,maxArticles:Number($('maxArticles').value),digestHours:Number($('digestHours').value),digestLimit:Number($('digestLimit').value),emailEnabled:$('emailEnabled').checked});const persisted=store('reports-settings',config);topic='';render();$('settingsStatus').textContent=persisted?'Saved on this device. Publish saved settings below to apply collection and email changes.':'Saved for this visit only; browser storage is unavailable.';}catch(e){$('settingsStatus').textContent=e.message;}};
$('publishForm').onsubmit=async event=>{event.preventDefault();const button=$('publishForm').querySelector('button');button.disabled=true;const token=$('syncToken').value;$('syncToken').value='';$('settingsStatus').textContent='Verifying owner and publishing…';try{await syncConfig(token,config);$('settingsStatus').textContent='Published. News collection will run shortly. Email preferences apply at the next hourly check.';}catch(e){$('settingsStatus').textContent=e.message.startsWith('Only ')||e.message.includes('Settings were')?e.message:'Could not publish. Check your connection and token permissions.';}finally{button.disabled=false;}};
$('digestButton').onclick=()=>{$('digestText').textContent=digestText(visible(),config.digestLimit);$('digest').showModal();};$('closeDigest').onclick=()=>$('digest').close();
$('downloadDigest').onclick=()=>{const a=document.createElement('a');const url=URL.createObjectURL(new Blob([$('digestText').textContent],{type:'text/plain'}));a.href=url;a.download='reports-digest.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
