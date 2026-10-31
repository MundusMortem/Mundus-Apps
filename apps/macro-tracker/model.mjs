export const MEALS=['Breakfast','Lunch','Dinner','Snack'];
export const OUNCE=28.349523125;
export const NUTRIENTS=[
 ['calories','Calories','kcal'],['protein','Protein','g'],['carbs','Total carbs','g'],['fat','Fat','g'],['fiber','Fiber','g'],['sugarAlcohol','Sugar alcohols','g'],['sugar','Sugars','g'],['saturatedFat','Saturated fat','g'],['sodium','Sodium','mg'],['potassium','Potassium','mg'],['calcium','Calcium','mg'],['iron','Iron','mg'],['cholesterol','Cholesterol','mg'],['vitaminC','Vitamin C','mg'],['vitaminD','Vitamin D','µg']
];
export const GOALS=['calories','protein','netCarbs','fat','fiber'];
export function uid(){return crypto.randomUUID();}
export function localDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===value;}
export function shiftDay(value,days){if(!validDate(value))throw Error('Choose a valid date.');const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+days);return localDate(d);}
function text(value,max=200){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Check the name or text length.');return value.trim();}
export function numberOrNull(value){if(value===null||value===undefined||value==='')return null;const n=Number(value);if(!Number.isFinite(n)||n<0||n>10000000)throw Error('Nutrient values must be finite, non-negative numbers.');return n;}
export function foodRecord(raw){
 if(!raw||typeof raw!=='object')throw Error('Food information is missing.');
 const basis=['g','ml','serving'].includes(raw.basis)?raw.basis:'g';
 const nutrients=Object.fromEntries(NUTRIENTS.map(([key])=>[key,numberOrNull(raw.nutrients?.[key])]));
 if(Object.values(nutrients).every(n=>n===null))throw Error('Enter at least one nutrient.');
 const servingSize=numberOrNull(raw.servingSize);
 if(servingSize===0)throw Error('Serving size must be greater than zero.');
 const id=raw.id?text(raw.id,120):uid();
 return {id,name:text(raw.name),brand:String(raw.brand||'').slice(0,150),basis,servingSize,servingLabel:String(raw.servingLabel||'').slice(0,150),nutrients,source:String(raw.source||'Manual entry').slice(0,120),sourceURL:secureURL(raw.sourceURL)||'',barcode:String(raw.barcode||'').slice(0,30),note:String(raw.note||'').slice(0,500)};
}
export function secureURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function unitsFor(food){return food.basis==='ml'?['ml','fl oz',...(food.servingSize?['serving']:[])]:food.basis==='serving'?['serving',...(food.servingSize?['g','oz']:[])]:['g','oz',...(food.servingSize?['serving']:[])];}
export function factor(food,quantity,unit){
 const q=Number(quantity);if(!Number.isFinite(q)||q<=0||q>1000000)throw Error('Enter an amount greater than zero.');
 if(!unitsFor(food).includes(unit))throw Error('Add the serving size before converting this unit. Mass and volume cannot be mixed without a known density.');
 if(food.basis==='serving')return unit==='serving'?q:(unit==='oz'?q*OUNCE:q)/food.servingSize;
 const size=food.basis==='ml'?(unit==='fl oz'?q*29.5735295625:unit==='serving'?q*food.servingSize:q):(unit==='oz'?q*OUNCE:unit==='serving'?q*food.servingSize:q);
 return size/100;
}
export function convert(food,quantity,from,to){return factor(food,quantity,from)/factor(food,1,to);}
export function scaled(food,quantity,unit){
 const mult=factor(food,quantity,unit);const out=Object.fromEntries(NUTRIENTS.map(([key])=>[key,food.nutrients[key]===null?null:food.nutrients[key]*mult]));
 out.netCarbs=out.carbs===null?null:Math.max(0,out.carbs-(out.fiber??0)-(out.sugarAlcohol??0));
 out.netEstimated=out.carbs!==null&&(out.fiber===null||out.sugarAlcohol===null);return out;
}
export function entryRecord(raw){
 if(!validDate(raw.date)||!MEALS.includes(raw.meal))throw Error('Choose a valid day and meal.');
 const food=foodRecord(raw.food),quantity=Number(raw.quantity);factor(food,quantity,raw.unit);
 return {id:raw.id?text(raw.id,120):uid(),date:raw.date,meal:raw.meal,food,quantity,unit:raw.unit,note:String(raw.note||'').slice(0,500)};
}
export function totals(entries){
 const keys=[...NUTRIENTS.map(([k])=>k),'netCarbs'];const values=Object.fromEntries(keys.map(k=>[k,0])),missing=Object.fromEntries(keys.map(k=>[k,0]));let estimated=0;
 for(const e of entries){const n=scaled(e.food,e.quantity,e.unit);for(const k of keys){if(n[k]===null)missing[k]++;else values[k]+=n[k];}if(n.netEstimated)estimated++;}
 return {values,missing,estimated,count:entries.length};
}
export function goalsRecord(goals={}){return Object.fromEntries(GOALS.map(k=>[k,numberOrNull(goals[k])]));}
export function profileRecord(raw){
 if(!raw||!Array.isArray(raw.entries)||!Array.isArray(raw.foods)||raw.entries.length>20000||raw.foods.length>2000)throw Error('This profile is invalid or too large.');
 const entries=raw.entries.map(entryRecord),foods=raw.foods.map(foodRecord);
 if(new Set(entries.map(e=>e.id)).size!==entries.length||new Set(foods.map(f=>f.id)).size!==foods.length)throw Error('Duplicate food or entry IDs in this profile.');
 return {id:raw.id?text(raw.id,120):uid(),name:text(raw.name,60),goals:goalsRecord(raw.goals),entries,foods};
}
export function newProfile(name='My profile'){return {id:uid(),name:text(name,60),goals:goalsRecord(),entries:[],foods:[]};}
export function newState(){const p=newProfile();return {version:1,revision:0,activeProfile:p.id,profiles:[p]};}
export function validateState(raw){
 if(raw?.version!==1||!Array.isArray(raw.profiles)||!raw.profiles.length||raw.profiles.length>20)throw Error('This is not a supported Macro Tracker backup.');
 const profiles=raw.profiles.map(profileRecord);if(new Set(profiles.map(p=>p.id)).size!==profiles.length)throw Error('Duplicate profiles in this backup.');
 return {version:1,revision:Number.isSafeInteger(raw.revision)&&raw.revision>=0?raw.revision:0,activeProfile:profiles.some(p=>p.id===raw.activeProfile)?raw.activeProfile:profiles[0].id,profiles};
}
export function mergeBackup(current,raw){
 const imported=validateState(raw);if(current.profiles.length+imported.profiles.length>20)throw Error('A device can hold up to 20 profiles.');
 const copies=imported.profiles.map(p=>({...p,id:uid(),name:(p.name+' (imported)').slice(0,60)}));
 return {...current,profiles:[...current.profiles,...copies],activeProfile:copies[0].id};
}
export function csvFor(entries){
 const esc=value=>{let s=String(value??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const keys=NUTRIENTS.map(([k])=>k);const rows=[['Date','Meal','Food','Amount','Unit',...NUTRIENTS.map(([,label,unit])=>`${label} (${unit})`),'Net carbs (g)','Net estimate','Note']];
 for(const e of entries){const n=scaled(e.food,e.quantity,e.unit);rows.push([e.date,e.meal,e.food.name,e.quantity,e.unit,...keys.map(k=>n[k]===null?'':n[k].toFixed(3)),n.netCarbs===null?'':n.netCarbs.toFixed(3),n.netEstimated?'yes':'no',e.note]);}
 return rows.map(row=>row.map(esc).join(',')).join('\r\n');
}
