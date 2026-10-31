export const defaults = {themes:['Technology','Business'],country:'US',language:'en',sources:[],exclude:[],maxArticles:30,emailEnabled:false,emailTo:'',digestHours:24,digestLimit:15};
export function validateConfig(value) {
  if (!value || typeof value !== 'object') throw Error('Settings must be an object.');
  const c = {...defaults,...value};
  for (const [key, max, length] of [['themes',8,120],['sources',12,100],['exclude',20,80]]) {
    if (!Array.isArray(c[key]) || c[key].length>max || c[key].some(x=>typeof x!=='string'||!x.trim()||x.length>length)) throw Error(`Check ${key}: up to ${max} entries allowed.`);
    c[key]=[...new Set(c[key].map(x=>x.trim()))];
  }
  if(!c.themes.length) throw Error('Add at least one topic.');
  if(c.sources.some(x=>!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(x))) throw Error('Sources must be domains such as reuters.com.');
  if(!['US','GB','CA','AU','IN','DE','FR'].includes(c.country)||!['en','de','fr','es'].includes(c.language)) throw Error('Choose a supported edition.');
  for(const [key,min,max] of [['maxArticles',5,100],['digestLimit',1,50]]) if(!Number.isInteger(c[key])||c[key]<min||c[key]>max) throw Error(`Check ${key}.`);
  if(![1,6,12,24,168].includes(c.digestHours)||typeof c.emailEnabled!=='boolean') throw Error('Choose a valid email schedule.');
  if(typeof c.emailTo!=='string'||c.emailTo.length>254||(c.emailTo && (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(c.emailTo)||c.emailTo.includes('..'))))throw Error('Enter one valid email address, or leave it blank for your configured sender address.');
  return Object.fromEntries(Object.keys(defaults).map(k=>[k,c[k]]));
}
export function safeLink(url) { try {const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password ? u.href:null;}catch{return null;} }
export function selectArticles(articles, {search='',topic='',savedOnly=false,saved=[],read=[],unreadOnly=false,sort='newest'}={}) {
  return articles.filter(a=>safeLink(a.url)&&(!topic||a.themes?.includes(topic))&&(!savedOnly||saved.includes(a.id))&&(!unreadOnly||!read.includes(a.id))&&`${a.title} ${a.source} ${a.summary||''}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='source'?a.source.localeCompare(b.source):(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
}
export function digestText(articles,limit=15) {return ['REPORTS · Industry update',...articles.slice(0,limit).map(a=>`${a.title}\n${a.source} · ${a.publishedAt?.slice(0,10)||'Date unavailable'}\n${a.url}`)].join('\n\n');}
export function deliveryPlan(config,data,state,now=Date.now()) {
  config=validateConfig(config);
  if(!config.emailEnabled)return {reason:'disabled',articles:[]};
  try { if(JSON.stringify(validateConfig(data.config))!==JSON.stringify(config))return {reason:'settings pending collection',articles:[]}; } catch { return {reason:'settings pending collection',articles:[]}; }
  const collected=Date.parse(data.generatedAt);
  if(!Number.isFinite(collected)||now-collected>3*3600000||collected>now)return {reason:'stale feed',articles:[]};
  const last=Date.parse(state.lastSentAt);
  if(Number.isFinite(last)&&now-last<config.digestHours*3600000)return {reason:'not due',articles:[]};
  const seen=Array.isArray(state.articleIds)?state.articleIds:[];
  const articles=selectArticles(data.articles).filter(a=>!seen.includes(a.id)).slice(0,config.digestLimit);
  return {reason:articles.length?'ready':'no new stories',articles};
}
