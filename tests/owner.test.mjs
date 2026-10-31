import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OWNER_ID, verifyOwner, submitRequest, shouldRejectRequest } from '../request-client.mjs';
const reply = (data,status=200) => new Response(JSON.stringify(data), {status});
test('only the immutable owner ID is accepted, never a matching display name', async () => {
  await assert.rejects(verifyOwner('test', async()=>reply({id:123,login:'MundusMortem'})), /Only MundusMortem/);
  await assert.rejects(verifyOwner('test', async()=>reply({},401)), /verification failed/);
  await assert.rejects(verifyOwner('', async()=>{throw Error('must not fetch');}), /Enter your/);
  assert.equal((await verifyOwner('test',async()=>reply({id:OWNER_ID}))).id,OWNER_ID);
});
test('unauthorized identity or expired token never sends an issue write', async () => {
  for (const response of [reply({id:123}),reply({},401)]) {
    const calls=[];
    await assert.rejects(submitRequest('test','App','Description',async(url,options)=>{calls.push(options.method);return response;}));
    assert.deepEqual(calls,[undefined]);
  }
});
test('submission rechecks owner and posts as that token without leaking it into content', async () => {
  const calls=[];
  const result=await submitRequest('test-only-secret','Budget & bills','Export CSV',async(url,options)=>{
    calls.push({url,options});
    return options.method==='POST' ? reply({number:5,user:{id:OWNER_ID}}) : reply({id:OWNER_ID});
  });
  assert.equal(calls[0].url,'https://api.github.com/user');
  assert.equal(calls[1].options.headers.Authorization,'Bearer test-only-secret');
  assert.equal(JSON.parse(calls[1].options.body).title,'[App request] Budget & bills');
  assert.ok(!calls[1].options.body.includes('test-only-secret'));
  assert.equal(result.url,'https://github.com/MundusMortem/Mundus-Apps/issues/5');
});
test('GitHub rejection keeps the request unconfirmed', async () => {
  await assert.rejects(submitRequest('test','App','Description',async(url,options)=>options.method==='POST'?reply({},403):reply({id:OWNER_ID})), /not confirmed/);
});
test('bypass policy rejects other authors and permits only owner app requests', () => {
  assert.equal(shouldRejectRequest({title:'[App request] App',user:{id:123,login:'MundusMortem'}}),true);
  assert.equal(shouldRejectRequest({title:'[App request] App',user:{id:OWNER_ID}}),false);
  assert.equal(shouldRejectRequest({title:'Bug report',user:{id:123}}),false);
  assert.equal(shouldRejectRequest({title:'[App request] Missing user'}),true);
});
