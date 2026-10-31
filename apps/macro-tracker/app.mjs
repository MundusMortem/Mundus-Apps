import { setupInstallButton } from '../../install.mjs';
import {MEALS,NUTRIENTS,GOALS,uid,localDate,shiftDay,validDate,foodRecord,entryRecord,scaled,totals,unitsFor,convert,newState,newProfile,mergeBackup,csvFor,goalsRecord} from './model.mjs';
import {openStore,loadState,saveState} from './storage.mjs';
import {searchFoods,lookupBarcode,enrichFood} from './api.mjs';
import {CameraScanner,scanImage} from './scanner.mjs';
const $=id=>document.getElementById(id);
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
let data=null,db=null,day=localDate(),month=day.slice(0,7),editing=null,baseFood=null,chosenMeal='Breakfast',lookupController=null,lookupGeneration=0,unitBefore='serving';
const profile=()=>data.profiles.find(p=>p.id===data.activeProfile);
const entries=()=>profile().entries.filter(e=>e.date===day);
const fmt=(n,digits=1)=>n===null?'—':Number(n).toLocaleString(undefined,{maximumFractionDigits:digits});
function say(message){$('status').textContent=message;for(const [dialog,status]of[['foodDialog','editorStatus'],['lookupDialog','lookupStatus'],['settingsDialog','settingsStatus']])if($(dialog).open)$(status).textContent=message;}
async function mutate(fn){
 const next=structuredClone(data);fn(next);
 try{data=db?await saveState(db,next,data.revision):{...next,revision:data.revision+1};render();return true;}catch(e){say(e.message);return false;}
}
function action(fn){return async event=>{try{if(!data)return;await fn(event);}catch(e){say(e.message||'This action could not finish.');}};}
function displayDay(value){return new Date(value+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'});}
function chooseDay(value){if(!validDate(value))return;day=value;month=day.slice(0,7);render();}
function dayText(summary,key,unit){const unknown=summary.count>0&&summary.missing[key]===summary.count;const approx=key==='netCarbs'&&summary.estimated>0||summary.missing[key]>0;return `${approx&&!unknown?'≈ ':''}${unknown?'—':fmt(summary.values[key],key==='calories'?0:1)}${unit?' '+unit:''}`;}
function render(){
 if(!data)return;
 $('profileSelect').replaceChildren(...data.profiles.map(p=>{const option=node('option',p.name);option.value=p.id;return option;}));$('profileSelect').value=data.activeProfile;
 $('dayInput').value=day;$('dayTitle').textContent=displayDay(day);
 const selected=entries(),summary=totals(selected);
 $('macroCards').replaceChildren();
 for(const [key,label,unit] of [['calories','Calories','kcal'],['protein','Protein','g'],['netCarbs','Net carbs','g'],['fat','Fat','g']]){
  const card=node('article',undefined,'macro-card');card.dataset.nutrient=key;card.append(node('span',label,'name'),node('strong',dayText(summary,key,'')),node('span',unit,'unit'));
  const goal=profile().goals[key];card.append(node('div',goal===null?'No goal set':`${fmt(goal,0)} ${unit} goal`,'goal'));
  if(goal>0){const track=node('div',undefined,'progress-track'),bar=node('span');bar.style.width=Math.min(100,100*summary.values[key]/goal)+'%';track.append(bar);card.append(track);}$('macroCards').append(card);
 }
 $('nutritionNote').textContent=summary.estimated?'≈ Net carbs estimate: unknown fiber or sugar alcohols are treated as zero deductions. Review or complete the food label.':Object.values(summary.missing).some(x=>x>0)?'≈ Some nutrients are unknown; totals include only recorded values.':'Net carbs subtract all recorded fiber and sugar alcohols. Calories use the food label/source values.';
 $('nutrientTable').replaceChildren();
 for(const [key,label,unit] of [...NUTRIENTS,['netCarbs','Net carbs','g']]){const tr=node('tr');tr.append(node('td',label),node('td',dayText(summary,key,unit)),node('td',profile().goals[key]!=null?`${fmt(profile().goals[key])} ${unit}`:'—'));$('nutrientTable').append(tr);}
 renderCalendar();renderMeals();renderWeek();
}
function renderCalendar(){
 const [year,m]=month.split('-').map(Number),first=new Date(year,m-1,1,12),start=new Date(year,m-1,1-first.getDay(),12);
 $('monthTitle').textContent=first.toLocaleDateString(undefined,{month:'short',year:'numeric'});$('calendar').replaceChildren();
 const days=new Set(profile().entries.map(e=>e.date));
 for(let i=0;i<42;i++){const date=new Date(start);date.setDate(start.getDate()+i);const value=localDate(date),button=node('button',String(date.getDate()),value.slice(0,7)!==month?'outside':'');button.type='button';button.setAttribute('aria-label',`${displayDay(value)}${days.has(value)?', has entries':''}`);button.setAttribute('aria-pressed',String(value===day));button.dataset.date=value;if(days.has(value))button.append(node('span',undefined,'day-dot'));button.onclick=()=>chooseDay(value);$('calendar').append(button);}
}
function renderMeals(){
 $('meals').replaceChildren();
 for(const meal of MEALS){const list=entries().filter(e=>e.meal===meal),card=node('section',undefined,'meal-card'),head=node('div',undefined,'meal-header');const add=node('button','＋ Add');add.setAttribute('aria-label',`Add ${meal}`);add.onclick=()=>openLookup(meal);head.append(node('h3',meal),node('span',dayText(totals(list),'calories','kcal'),'meal-total'),add);card.append(head);
  if(!list.length)card.append(node('p','No food logged here yet.','empty'));
  for(const e of list){const row=node('article',undefined,'food-entry'),content=node('div');const n=scaled(e.food,e.quantity,e.unit);content.append(node('h4',e.food.name),node('p',`${fmt(e.quantity,3)} ${e.unit}${e.unit==='serving'&&e.food.servingLabel?' · '+e.food.servingLabel:''}`),node('p',`${fmt(n.calories,0)} kcal · P ${fmt(n.protein)} g · Net ${n.netEstimated?'≈ ':''}${fmt(n.netCarbs)} g · F ${fmt(n.fat)} g`));if(e.note)content.append(node('p',e.note));const controls=node('div',undefined,'entry-actions'),edit=node('button','Edit'),remove=node('button','Delete');edit.setAttribute('aria-label',`Edit ${e.food.name}`);remove.setAttribute('aria-label',`Delete ${e.food.name}`);edit.onclick=()=>openEditor(e.food,e);remove.onclick=action(async()=>{if(confirm(`Delete ${e.food.name} from this day?`)){await mutate(state=>{const p=state.profiles.find(p=>p.id===state.activeProfile);p.entries=p.entries.filter(x=>x.id!==e.id);});}});controls.append(edit,remove);row.append(content,controls);card.append(row);}
  $('meals').append(card);
 }
}
function renderWeek(){const days=Array.from({length:7},(_,i)=>shiftDay(day,i-6)),summaries=days.map(date=>totals(profile().entries.filter(e=>e.date===date))),max=Math.max(1,...summaries.map(s=>s.values.calories));$('weekChart').replaceChildren();summaries.forEach((s,i)=>{const col=node('div',undefined,'chart-day'),bar=node('div',undefined,'bar');bar.style.height=Math.max(3,s.values.calories/max*88)+'px';bar.title=`${days[i]}: ${s.count?dayText(s,'calories','kcal'):'No entries'}`;const button=node('button',new Date(days[i]+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}));button.setAttribute('aria-label',`View ${displayDay(days[i])}`);button.onclick=()=>chooseDay(days[i]);col.append(node('span',s.count?dayText(s,'calories',''):'—','bar-label'),bar,button);$('weekChart').append(col);});}
function openLookup(meal=chosenMeal){chosenMeal=meal;$('lookupStatus').textContent='Choose a saved food, search a source, scan a barcode, or enter a label.';$('lookupDialog').showModal();showSaved();}
function foodButton(food,saved=false){const button=node('button',undefined,'food-result');button.type='button';button.append(node('strong',food.name),node('span',`${food.brand?food.brand+' · ':''}${food.source} · ${fmt(food.nutrients.calories,0)} kcal per ${food.basis==='serving'?'serving':'100 '+food.basis}`));button.onclick=action(async()=>{const generation=lookupGeneration;$('lookupStatus').textContent='Opening food…';const selected=saved?food:await enrichFood(food,fetch,lookupController?.signal);if(generation!==lookupGeneration||!$('lookupDialog').open)return;$('lookupDialog').close();openEditor(selected);});return button;}
function showSaved(query=''){const list=profile().foods.filter(f=>`${f.name} ${f.brand}`.toLowerCase().includes(query.toLowerCase())).slice().reverse().slice(0,40);$('searchResults').replaceChildren(...list.map(f=>foodButton(f,true)));if(!list.length)$('searchResults').append(node('p','Your saved foods appear here after you log them.','tiny muted'));}
function startLookup(){lookupController?.abort();lookupController=new AbortController();lookupGeneration++;return {signal:lookupController.signal,generation:lookupGeneration};}
async function doBarcode(value){const {signal,generation}=startLookup();$('lookupStatus').textContent='Looking up barcode…';try{const food=await lookupBarcode(value,fetch,signal);if(generation!==lookupGeneration)return;$('searchResults').replaceChildren(foodButton(food));$('lookupStatus').textContent='Product found. Review its label and amount before saving.';}catch(e){if(!signal.aborted)$('lookupStatus').textContent=e.message;}}
function readFood(){const nutrients=Object.fromEntries(NUTRIENTS.map(([key])=>[key,$('nutrient-'+key).value]));return foodRecord({...baseFood,name:$('foodName').value,basis:$('labelBasis').value,servingSize:$('servingSize').value,nutrients});}
function setUnitOptions(preserve=true){const basis=$('labelBasis').value,size=Number($('servingSize').value)||null,possible=unitsFor({basis,servingSize:size}),old=$('quantityUnit').value;$('quantityUnit').replaceChildren(...possible.map(unit=>{const op=node('option',unit==='serving'?'Servings':unit==='g'?'Grams':unit==='oz'?'Ounces (mass)':unit==='ml'?'Milliliters':'US fluid ounces');op.value=unit;return op;}));$('quantityUnit').value=preserve&&possible.includes(old)?old:possible.includes('serving')?'serving':possible[0];unitBefore=$('quantityUnit').value;$('servingSizeLabel').textContent=basis==='ml'?'One serving contains (ml), optional':'One serving weighs (g), optional';}
function preview(){try{const food=readFood(),n=scaled(food,$('quantity').value,$('quantityUnit').value);$('amountPreview').textContent=`${fmt(n.calories,0)} kcal · Protein ${fmt(n.protein)} g · Net carbs ${n.netEstimated?'≈ ':''}${fmt(n.netCarbs)} g · Fat ${fmt(n.fat)} g${n.netEstimated?' · Missing deductions estimated as zero.':''}`;}catch{$('amountPreview').textContent='Enter the label and an amount to preview this entry.';}}
function openEditor(food=null,entry=null){
 editing=entry?.id||null;baseFood=food?structuredClone(food):{id:uid(),name:'',basis:'serving',servingSize:null,nutrients:{},source:'Manual entry',sourceURL:'',note:''};$('foodName').value=baseFood.name;$('labelBasis').value=baseFood.basis;$('servingSize').value=baseFood.servingSize??'';$('entryDate').value=entry?.date||day;$('entryMeal').value=entry?.meal||chosenMeal;$('entryNote').value=entry?.note||'';
 for(const [key]of NUTRIENTS)$('nutrient-'+key).value=baseFood.nutrients[key]??'';
 $('foodSourceNote').textContent=baseFood.note||'Enter the nutrition label. Blank nutrients remain unknown.';$('foodSourceLink').hidden=!baseFood.sourceURL;if(baseFood.sourceURL)$('foodSourceLink').href=baseFood.sourceURL;
 setUnitOptions(false);if(entry)$('quantityUnit').value=entry.unit;unitBefore=$('quantityUnit').value;$('quantity').value=entry?.quantity||($('quantityUnit').value==='serving'?1:100);$('editorStatus').textContent='';$('foodTitle').textContent=entry?'Edit food entry':'Food & amount';preview();$('foodDialog').showModal();
}
function openSettings(){const p=profile();$('profileName').value=p.name;for(const key of GOALS)$('goal-'+key).value=p.goals[key]??'';$('settingsStatus').textContent='';$('settingsDialog').showModal();}
function download(content,name,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
for(const [key,label,unit]of NUTRIENTS){const box=node('div'),labelNode=node('label',`${label} (${unit})`),input=node('input');labelNode.htmlFor='nutrient-'+key;input.id='nutrient-'+key;input.type='number';input.min='0';input.step='any';box.append(labelNode,input);$('nutritionFields').append(box);}
for(const key of GOALS){const match=NUTRIENTS.find(n=>n[0]===key)||['netCarbs','Net carbs','g'],box=node('div'),label=node('label',`${match[1]} goal (${match[2]})`),input=node('input');label.htmlFor='goal-'+key;input.id='goal-'+key;input.type='number';input.min='0';input.step='any';box.append(label,input);$('goalFields').append(box);}
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$(button.dataset.close).close();
for(const label of document.querySelectorAll('.button-label')){label.tabIndex=0;label.setAttribute('role','button');label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$(label.htmlFor).click();}};}
$('addFood').onclick=action(()=>openLookup());$('settingsButton').onclick=action(openSettings);
$('dayInput').onchange=action(()=>chooseDay($('dayInput').value));$('prevDay').onclick=action(()=>chooseDay(shiftDay(day,-1)));$('nextDay').onclick=action(()=>chooseDay(shiftDay(day,1)));$('todayButton').onclick=action(()=>chooseDay(localDate()));
for(const [id,delta]of[['prevMonth',-1],['nextMonth',1]])$(id).onclick=action(()=>{const [y,m]=month.split('-').map(Number);month=localDate(new Date(y,m-1+delta,1,12)).slice(0,7);renderCalendar();});
$('profileSelect').onchange=action(async()=>{const id=$('profileSelect').value;await mutate(state=>{state.activeProfile=id;});});
$('searchForm').onsubmit=action(async event=>{event.preventDefault();const query=$('foodSearch').value,source=$('foodSource').value;if(source==='saved'){showSaved(query);return;}const {signal,generation}=startLookup();$('lookupStatus').textContent='Searching…';try{const foods=await searchFoods(query,source,fetch,signal);if(generation!==lookupGeneration)return;$('searchResults').replaceChildren(...foods.map(f=>foodButton(f)));$('lookupStatus').textContent=foods.length?`${foods.length} foods found.${source==='usda'&&foods.every(f=>f.source==='Open Food Facts')?' USDA unavailable or no matches; showing Open Food Facts.':''} Select one to review.`:'No foods found. Try another source or enter the label manually.';}catch(e){if(!signal.aborted)$('lookupStatus').textContent=e.message;}});
$('foodSource').onchange=()=>{if($('foodSource').value==='saved')showSaved($('foodSearch').value);};
$('barcodeForm').onsubmit=action(async event=>{event.preventDefault();await doBarcode($('barcodeInput').value);});
$('lookupDialog').addEventListener('close',()=>{lookupGeneration++;lookupController?.abort();});
$('manualFood').onclick=action(()=>{$('lookupDialog').close();openEditor();});
$('foodForm').addEventListener('input',preview);
$('labelBasis').onchange=()=>{setUnitOptions();$('editorStatus').textContent='Check nutrient values for the selected label basis.';preview();};$('servingSize').addEventListener('input',()=>{setUnitOptions();preview();});
$('quantityUnit').onchange=()=>{try{$('quantity').value=Number(convert(readFood(),$('quantity').value,unitBefore,$('quantityUnit').value).toFixed(6));}catch{}unitBefore=$('quantityUnit').value;preview();};
$('foodForm').onsubmit=action(async event=>{event.preventDefault();const food=readFood(),entry=entryRecord({id:editing||uid(),date:$('entryDate').value,meal:$('entryMeal').value,food,quantity:$('quantity').value,unit:$('quantityUnit').value,note:$('entryNote').value});const ok=await mutate(state=>{const p=state.profiles.find(p=>p.id===state.activeProfile),index=p.entries.findIndex(e=>e.id===entry.id);if(index<0)p.entries.push(entry);else p.entries[index]=entry;const existing=p.foods.findIndex(f=>f.id===food.id);if(existing<0)p.foods.push(food);else p.foods[existing]=food;});if(ok){$('foodDialog').close();chooseDay(entry.date);say(db?'Food saved on this device.':'Food saved for this session only. Export before leaving.');}});
$('copyYesterday').onclick=action(async()=>{const source=profile().entries.filter(e=>e.date===shiftDay(day,-1));if(!source.length){say('No entries were logged yesterday.');return;}if(!confirm(`Copy ${source.length} entries from yesterday into this day?`))return;await mutate(state=>{const p=state.profiles.find(p=>p.id===state.activeProfile);p.entries.push(...source.map(e=>({...structuredClone(e),id:uid(),date:day})));});});
$('goalsForm').onsubmit=action(async event=>{event.preventDefault();const goals=goalsRecord(Object.fromEntries(GOALS.map(k=>[k,$('goal-'+k).value])));const name=$('profileName').value.trim();if(!name)throw Error('Enter a profile name.');if(await mutate(state=>{const p=state.profiles.find(p=>p.id===state.activeProfile);p.name=name;p.goals=goals;}))say('Profile and goals saved locally.');});
$('newProfileForm').onsubmit=action(async event=>{event.preventDefault();if(data.profiles.length>=20)throw Error('A device can hold up to 20 profiles.');const p=newProfile($('newProfileName').value);if(await mutate(state=>{state.profiles.push(p);state.activeProfile=p.id;})){$('newProfileName').value='';$('profileName').value=p.name;for(const k of GOALS)$('goal-'+k).value='';say('New local profile selected.');}});
$('exportBackup').onclick=action(()=>download(JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2),`macro-tracker-${localDate()}.json`,'application/json'));
$('exportCSV').onclick=action(()=>download(csvFor(profile().entries),`macro-tracker-${localDate()}.csv`,'text/csv'));
$('importBackup').onchange=action(async()=>{const file=$('importBackup').files[0];if(!file)return;try{if(file.size>10000000)throw Error('Choose a backup smaller than 10 MB.');const raw=JSON.parse(await file.text());if(await mutate(state=>{const merged=mergeBackup(state,raw);Object.assign(state,merged);})){say('Backup imported as separate profiles. Existing data was kept.');$('profileName').value=profile().name;for(const k of GOALS)$('goal-'+k).value=profile().goals[k]??'';}}finally{$('importBackup').value='';}});
const scanner=new CameraScanner($('cameraVideo'),code=>{$('cameraDialog').close();$('barcodeInput').value=code;doBarcode(code);});
$('scanCamera').onclick=action(async()=>{$('cameraStatus').textContent='Starting camera…';$('cameraDialog').showModal();try{await scanner.start();if($('cameraDialog').open)$('cameraStatus').textContent='Point the camera at the food barcode.';}catch(e){scanner.stop();$('cameraStatus').textContent=e.message;}});
$('cameraDialog').addEventListener('close',()=>scanner.stop());window.addEventListener('pagehide',()=>scanner.stop());document.addEventListener('visibilitychange',()=>{if(document.hidden){scanner.stop();if($('cameraDialog').open)$('cameraDialog').close();}});
$('barcodePhoto').onchange=action(async()=>{const file=$('barcodePhoto').files[0];if(!file)return;$('lookupStatus').textContent='Reading barcode photo on this device…';try{const code=await scanImage(file);$('barcodeInput').value=code;await doBarcode(code);}finally{$('barcodePhoto').value='';}});
const installController=setupInstallButton($('install'),{name:'Macro Tracker'});
const controls=Array.from(document.querySelectorAll('button,input,select'));controls.forEach(el=>el.disabled=true);
try{db=await openStore();data=await loadState(db);}catch(e){db=null;data=newState();$('storageWarning').hidden=false;$('storageWarning').textContent='Local saving is unavailable. Changes in this session will not be saved. Export a backup before leaving. '+e.message;}
controls.forEach(el=>el.disabled=false);installController.refresh();render();document.documentElement.dataset.ready='true';
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
