import { test } from 'node:test';import assert from 'node:assert/strict';
import {defaults,validateConfig,selectArticles,safeLink,digestText} from '../apps/reports/model.mjs';
const a={id:'1',title:'AI update',source:'Example',url:'https://example.com/ai',themes:['AI'],publishedAt:'2026-10-31T00:00:00Z'};
test('settings accept custom topics and validate bounds and publishers',()=>{assert.deepEqual(validateConfig({...defaults,themes:['AI','AI']}).themes,['AI']);for(const bad of [{themes:[]},{sources:['javascript:foo']},{maxArticles:101},{digestHours:2},{emailEnabled:'yes'}])assert.throws(()=>validateConfig({...defaults,...bad}));});
test('filters combine topics, text, unread and saved states',()=>{assert.equal(selectArticles([a],{topic:'AI',search:'update',savedOnly:true,saved:['1'],unreadOnly:true}).length,1);assert.equal(selectArticles([a],{unreadOnly:true,read:['1']}).length,0);assert.equal(selectArticles([a],{topic:'Other'}).length,0);assert.equal(safeLink('javascript:alert(1)'),null);});
test('digest contains original source and link',()=>{assert.match(digestText([a]),/Example/);assert.match(digestText([a]),/https:\/\/example.com\/ai/);});
import { deliveryPlan } from '../apps/reports/model.mjs';
test('email delivery obeys opt-in, cadence, fresh matching settings, and deduplication',()=>{
 const now=Date.parse('2026-10-31T04:00:00Z');const config={...defaults,emailEnabled:true};const data={config,generatedAt:new Date(now).toISOString(),articles:[a]};const state={lastSentAt:null,articleIds:[]};
 assert.equal(deliveryPlan(config,data,state,now).reason,'ready');
 assert.equal(deliveryPlan({...config,emailEnabled:false},data,state,now).reason,'disabled');
 assert.equal(deliveryPlan(config,data,{...state,lastSentAt:new Date(now-3600000).toISOString()},now).reason,'not due');
 assert.equal(deliveryPlan(config,{...data,generatedAt:'2026-10-30T00:00:00Z'},state,now).reason,'stale feed');
 assert.equal(deliveryPlan(config,{...data,generatedAt:new Date(now+1000).toISOString()},state,now).reason,'stale feed');
 assert.equal(deliveryPlan(config,{...data,config:null},state,now).reason,'settings pending collection');
 assert.equal(deliveryPlan(config,{...data,config:{...config,themes:['Other']}},state,now).reason,'settings pending collection');
 assert.equal(deliveryPlan(config,data,{...state,articleIds:['1']},now).reason,'no new stories');
});

import { settingsRequestURL,parseSettingsIssue } from '../apps/reports/settings.mjs';
test('token-free settings confirmation preserves recipient, topics and Unicode',()=>{
 const config={...defaults,themes:['Énergie & AI'],emailTo:'reports+weekly@example.com'};
 const url=new URL(settingsRequestURL(config));
 assert.equal(url.origin,'https://github.com');assert.match(url.searchParams.get('title'),/^\[Reports settings\]/);
 const issue={state:'open',title:url.searchParams.get('title'),body:url.searchParams.get('body'),user:{id:52387967}};
 assert.deepEqual(parseSettingsIssue(issue),validateConfig(config));
 for(const bad of [{...issue,user:{id:123,login:'MundusMortem'}},{...issue,state:'closed'},{...issue,body:'ignore validation'},{...issue,pull_request:{}}])assert.throws(()=>parseSettingsIssue(bad));
});
test('recipient allows one address or the connected-account default, never injected headers',()=>{
 assert.equal(validateConfig(defaults).emailTo,'');
 for(const emailTo of ['a@example.com,b@example.com','a@example.com\nBcc:evil@example.com','not-an-email','a@localhost'])assert.throws(()=>validateConfig({...defaults,emailTo}));
});
