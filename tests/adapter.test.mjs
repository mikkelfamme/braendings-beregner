import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const adapter=new URL('../scripts/update-prices.mjs',import.meta.url).href;
const example={prices:[{date:new Date().toISOString(),price:{total:1.6},forecast:true}]};
const key='TEST-ONLY-NOT-A-REAL-SECRET';
function run({payload=example,status=200,env={},previous}={}){
 const dir=mkdtempSync(join(tmpdir(),'braending-adapter-'));
 try{
  mkdirSync(join(dir,'data'));
  if(previous)writeFileSync(join(dir,'data/prices.json'),JSON.stringify(previous));
  const code=`globalThis.fetch=async()=>new Response(JSON.stringify(${JSON.stringify(payload)}),{status:${status},headers:{'Content-Type':'application/json'}});await import(${JSON.stringify(adapter)});`;
  const r=spawnSync(process.execPath,['--input-type=module','--eval',code],{cwd:dir,encoding:'utf8',env:{...process.env,STROM_API_KEY:key,STROM_API_URL:'https://stromligning.dk/api/prices?from=old&to=new&aggregation=15m&supplierId=example-only',STROM_PRICE_BASIS_CONFIRMED:'true',STROM_VERIFIED:'',...env}});
  assert.equal(r.status,0,r.stderr);
  const text=readFileSync(join(dir,'data/prices.json'),'utf8');
  assert.ok(!text.includes(key));assert.ok(!r.stdout.includes(key));
  return {feed:JSON.parse(text),log:r.stdout};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('Actions adapter publishes sanitized forecast data without keys',()=>{const {feed}=run();assert.equal(feed.verified,true);assert.equal(feed.prices[0].price,1.6);assert.equal(feed.hasForecast,true);assert.equal(feed.status,'ok');});
test('Actions adapter missing credentials yields no fabricated prices',()=>{const {feed}=run({env:{STROM_API_KEY:''}});assert.equal(feed.verified,false);assert.equal(feed.errorCode,'CONFIG_MISSING');assert.deepEqual(feed.prices,[]);});
test('Actions adapter refuses unconfirmed VAT and tariff basis',()=>{const {feed}=run({env:{STROM_PRICE_BASIS_CONFIRMED:''}});assert.equal(feed.errorCode,'PRICE_BASIS_UNCONFIRMED');assert.equal(feed.verified,false);});
test('Actions adapter handles HTTP 403 without exposing upstream payload',()=>{const {feed,log}=run({status:403,payload:{private:'DO-NOT-PRINT'}});assert.equal(feed.errorCode,'HTTP_403');assert.ok(!JSON.stringify(feed).includes('DO-NOT-PRINT'));assert.ok(!log.includes('DO-NOT-PRINT'));});
test('Actions adapter rejects data without price.total',()=>{const {feed}=run({payload:{prices:[{date:new Date().toISOString(),price:{value:1}}]}});assert.equal(feed.verified,false);assert.deepEqual(feed.prices,[]);});
test('Actions adapter retains previous tariff during a failed refresh',()=>{const previous=run().feed;const {feed}=run({status:429,previous});assert.equal(feed.verified,true);assert.equal(feed.status,'error');assert.equal(feed.fetchedAt,previous.fetchedAt);assert.deepEqual(feed.prices,previous.prices);});
test('Actions adapter never reuses prices after tariff changes',()=>{const previous=run().feed;const {feed}=run({status:429,previous,env:{STROM_API_URL:'https://stromligning.dk/api/prices?from=old&to=new&aggregation=15m&supplierId=different-example'}});assert.equal(feed.verified,false);assert.deepEqual(feed.prices,[]);});
