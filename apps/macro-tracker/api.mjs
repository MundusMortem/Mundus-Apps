import {foodRecord,secureURL} from './model.mjs';
const OFF='https://world.openfoodfacts.org';
const fields='code,product_name,brands,nutriments,serving_quantity,serving_quantity_unit,serving_size,product_quantity_unit,nutrition_data_per';
const cache=new Map();
export function barcodeValue(value){const code=String(value).replace(/[\s-]/g,'');if(!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code))throw Error('Enter an 8, 12, 13 or 14 digit food barcode.');return code;}
const val=(object,key)=>{const value=object?.[key];if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;};
export function fromOFF(product){
 if(!product?.product_name||!product.nutriments)throw Error('This product has no usable nutrition data. You can enter its label manually.');
 const n=product.nutriments,get=k=>val(n,k+'_100g');const fiber=get('fiber');let carbs=get('carbohydrates-total'),note='Review imported values against the label. Missing nutrients stay unknown.';
 if(carbs===null){const available=get('carbohydrates');carbs=available===null?null:available+(fiber??0);note+=' Available carbohydrates were normalized to total carbs by adding recorded fiber; check the label.';}
 const grams=k=>get(k),milligrams=k=>get(k)===null?null:get(k)*1000;
 const basis=product.serving_quantity_unit==='ml'?'ml':product.serving_quantity_unit==='g'?'g':product.product_quantity_unit==='ml'?'ml':'g';
 let servingSize=val(product,'serving_quantity');if(!servingSize){const match=String(product.serving_size||'').match(/([\d.]+)\s*(g|ml)\b/i);if(match&&match[2].toLowerCase()===basis)servingSize=Number(match[1]);}
 let sugarAlcohol=get('polyols');if(sugarAlcohol===null)sugarAlcohol=get('sugar-alcohol');if(sugarAlcohol===null)sugarAlcohol=get('erythritol');
 const sodium=milligrams('sodium')??(get('salt')===null?null:get('salt')*400);
 return foodRecord({id:'off:'+product.code,name:product.product_name,brand:product.brands,basis,servingSize:servingSize||null,servingLabel:product.serving_size,source:'Open Food Facts',sourceURL:`https://world.openfoodfacts.org/product/${encodeURIComponent(product.code)}`,barcode:product.code,note,nutrients:{calories:get('energy-kcal')??(get('energy-kj')===null?null:get('energy-kj')/4.184),protein:grams('proteins'),fat:grams('fat'),carbs,fiber,sugarAlcohol,sugar:grams('sugars'),saturatedFat:grams('saturated-fat'),sodium,potassium:milligrams('potassium'),calcium:milligrams('calcium'),iron:milligrams('iron'),cholesterol:milligrams('cholesterol'),vitaminC:milligrams('vitamin-c'),vitaminD:get('vitamin-d')===null?null:get('vitamin-d')*1000000}});
}
export function fromUSDA(food){
 if(!food?.description||!Array.isArray(food.foodNutrients))throw Error('No usable food data was returned.');
 const find=(...ids)=>{for(const id of ids){const nutrient=food.foodNutrients.find(n=>(n.nutrientId??n.nutrient?.id)===id);const value=nutrient?.value??nutrient?.amount;if(Number.isFinite(Number(value))&&value!==null&&value!==undefined)return Number(value);}return null;};
 const portion=(food.foodPortions||[]).find(p=>/medium/i.test(p.modifier||''))||(food.foodPortions||[]).find(p=>Number(p.gramWeight)>0);
 const grams=portion?Number(portion.gramWeight):100;
 return foodRecord({id:'usda:'+food.fdcId,name:food.description,brand:food.brandOwner||'',basis:'g',servingSize:grams,servingLabel:portion?`${portion.amount||1} ${portion.modifier||portion.measureUnit?.name||'portion'}`:'100 g',source:'USDA FoodData Central',sourceURL:`https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,note:'USDA values per 100 g. Review serving size; missing nutrients stay unknown.',nutrients:{calories:find(1008,2048,2047)??(find(1062)===null?null:find(1062)/4.184),protein:find(1003),fat:find(1004),carbs:find(1005),fiber:find(1079),sugarAlcohol:find(1086),sugar:find(2000,1063),saturatedFat:find(1258),sodium:find(1093),potassium:find(1092),calcium:find(1087),iron:find(1089),cholesterol:find(1253),vitaminC:find(1162),vitaminD:find(1114)}});
}
async function request(url,fetcher,signal){
 if(cache.has(url))return structuredClone(cache.get(url));
 const timeout=AbortSignal.timeout(18000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
 let response;try{response=await fetcher(url,{signal:combined,credentials:'omit',referrerPolicy:'no-referrer'});}catch(e){if(signal?.aborted)throw e;throw Error('Food lookup could not connect. Try again, use your saved foods, or enter the label manually.');}
 if(response.status===429||response.status===403)throw Error('This free food service has reached its lookup limit. Try the other source or enter the label manually.');
 if(!response.ok)throw Error('The food service is temporarily unavailable. Try the other source or manual entry.');
 const body=await response.json();cache.set(url,body);return structuredClone(body);
}
export async function searchFoods(query,source='usda',fetcher=fetch,signal){
 const term=query.trim();if(term.length<2||term.length>100)throw Error('Enter 2–100 characters to search.');
 if(source==='usda'){
  const url=new URL('https://api.nal.usda.gov/fdc/v1/foods/search');url.search=new URLSearchParams({api_key:'DEMO_KEY',query:term,dataType:'SR Legacy',pageSize:'20'});
  try{const body=await request(url.href,fetcher,signal);const foods=(body.foods||[]).flatMap(f=>{try{return [fromUSDA(f)];}catch{return [];}});if(foods.length)return foods;}catch(error){if(signal?.aborted)throw error;}
  return searchFoods(term,'off',fetcher,signal);
 }
 const url=new URL(OFF+'/cgi/search.pl');url.search=new URLSearchParams({search_terms:term,search_simple:'1',action:'process',json:'1',page_size:'20',fields,app_name:'MundusMacroTracker',app_version:'1.0'});
 const body=await request(url.href,fetcher,signal);return (body.products||[]).flatMap(p=>{try{return [fromOFF(p)];}catch{return [];}});
}
export async function lookupBarcode(value,fetcher=fetch,signal){const code=barcodeValue(value);const body=await request(`${OFF}/api/v3/product/${code}.json?fields=${fields}&app_name=MundusMacroTracker&app_version=1.0`,fetcher,signal);if(!body.product||body.status===0||body.status==='failure')throw Error('Barcode not found. You can enter the nutrition label manually.');return fromOFF(body.product);}
export async function enrichFood(food,fetcher=fetch,signal){if(!food.id.startsWith('usda:'))return food;try{const body=await request(`https://api.nal.usda.gov/fdc/v1/food/${food.id.slice(5)}?api_key=DEMO_KEY`,fetcher,signal);return fromUSDA(body);}catch{return food;}}
