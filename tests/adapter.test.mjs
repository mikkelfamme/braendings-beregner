import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const adapter=new URL('../scripts/update-prices.mjs',import.meta.url).href;
const total=2.075439;
const example={
 priceArea:'DK2',
 supplier:{id:'radius_c',name:'Radius C',customerGroup:{id:'c',name:'C'}},
 company:{id:'nrgi',name:'NRGi',product:{id:'nrgi_time',name:'NRGi Time',productType:'variable'}},
 prices:[{
  date:new Date().toISOString(),forecast:true,
  price:{value:1.660351,vat:0.415088,total,unit:'kr/kWh'},
  details:{
   electricity:{total:1.69897},surcharge:{total:0.09},
   transmission:{systemTariff:{total:0.09},netTariff:{total:0.05375}},
   electricityTax:{total:0.01},distribution:{total:0.132719}
  }
 }]
};
const key='TEST-ONLY-NOT-A-REAL-SECRET';
function run({payload=example,status=200,env={},previous}={}){
 const dir=mkdtempSync(join(tmpdir(),'braending-adapter-'));
 try{
  mkdirSync(join(dir,'data'));
  if(previous)writeFileSync(join(dir,'data/prices.json'),JSON.stringify(previous));
  const code=`globalThis.fetch=async()=>new Response(JSON.stringify(${JSON.stringify(payload)}),{status:${status},headers:{'Content-Type':'application/json'}});await import(${JSON.stringify(adapter)});`;
  const r=spawnSync(process.execPath,['--input-type=module','--eval',code],{cwd:dir,encoding:'utf8',env:{...process.env,STROM_API_KEY:key,STROM_API_URL:'https://stromligning.dk/api/prices?from=old&to=new&aggregation=1h&productId=nrgi_time&supplierId=radius_c&customerGroupId=c&forecast=true',STROM_INTERVAL_MINUTES:'60',STROM_AUTH_HEADER:'X-API-Key',STROM_PRICE_LABEL:'NRGi Time · Radius C',...env}});
  assert.equal(r.status,0,r.stderr);
  const text=readFileSync(join(dir,'data/prices.json'),'utf8');
  assert.ok(!text.includes(key));assert.ok(!r.stdout.includes(key));
  return {feed:JSON.parse(text),log:r.stdout};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('Actions adapter publishes price.total after automatic basis verification',()=>{const {feed,log}=run();assert.equal(feed.verified,true);assert.equal(feed.version,5);assert.equal(feed.prices[0].price,total);assert.equal(feed.hasForecast,true);assert.equal(feed.status,'ok');assert.equal(feed.priceBasis,'variable-total-dkk-kwh-including-vat');assert.equal(feed.basisVerification.priceField,'price.total');assert.equal(feed.basisVerification.productId,'nrgi_time');assert.equal(feed.basisVerification.supplierId,'radius_c');assert.match(log,/Prisgrundlag verificeret automatisk/);});
test('Actions adapter missing credentials yields no fabricated prices',()=>{const {feed}=run({env:{STROM_API_KEY:''}});assert.equal(feed.verified,false);assert.equal(feed.errorCode,'CONFIG_MISSING');assert.deepEqual(feed.prices,[]);});
test('Actions adapter no longer requires manual price-basis confirmation variable',()=>{const {feed}=run({env:{STROM_PRICE_BASIS_CONFIRMED:'',STROM_VERIFIED:''}});assert.equal(feed.verified,true);assert.equal(feed.errorCode,undefined);});
test('Actions adapter rejects data without price.total',()=>{const bad=structuredClone(example);delete bad.prices[0].price.total;const {feed}=run({payload:bad});assert.equal(feed.verified,false);assert.equal(feed.errorCode,'PRICE_BASIS_INVALID');assert.deepEqual(feed.prices,[]);});
test('Actions adapter rejects total when value plus VAT does not match',()=>{const bad=structuredClone(example);bad.prices[0].price.total=9;const {feed}=run({payload:bad});assert.equal(feed.errorCode,'PRICE_BASIS_INVALID');assert.equal(feed.verified,false);});
test('Actions adapter rejects total when component sum does not match',()=>{const bad=structuredClone(example);bad.prices[0].details.distribution.total=0.5;const {feed}=run({payload:bad});assert.equal(feed.errorCode,'PRICE_BASIS_INVALID');assert.equal(feed.verified,false);});
test('Actions adapter rejects a payload for a different supplier or product',()=>{const bad=structuredClone(example);bad.supplier.id='wrong_supplier';const {feed}=run({payload:bad});assert.equal(feed.errorCode,'PRICE_BASIS_INVALID');assert.equal(feed.verified,false);});
test('Actions adapter handles HTTP 403 without exposing upstream payload',()=>{const {feed,log}=run({status:403,payload:{private:'DO-NOT-PRINT'}});assert.equal(feed.errorCode,'HTTP_403');assert.ok(!JSON.stringify(feed).includes('DO-NOT-PRINT'));assert.ok(!log.includes('DO-NOT-PRINT'));});
test('Actions adapter retains previous verified tariff during a failed refresh',()=>{const previous=run().feed;const {feed}=run({status:429,previous});assert.equal(feed.verified,true);assert.equal(feed.status,'error');assert.equal(feed.fetchedAt,previous.fetchedAt);assert.deepEqual(feed.prices,previous.prices);});
test('Actions adapter never reuses prices after tariff changes',()=>{const previous=run().feed;const {feed}=run({status:429,previous,env:{STROM_API_URL:'https://stromligning.dk/api/prices?from=old&to=new&aggregation=1h&productId=nrgi_time&supplierId=different&forecast=true'}});assert.equal(feed.verified,false);assert.deepEqual(feed.prices,[]);});
