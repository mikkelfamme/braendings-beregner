/** Actions-only adapter. Only normalized prices are published, never credentials/raw responses. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseStromligning,normalizePrices} from '../src/engine.mjs';
import {makeRequest} from './strom-config.mjs';
const file='data/prices.json',now=Date.now();let previous=null,request=null;
try{previous=JSON.parse(await readFile(file,'utf8'));}catch{}
const messages={
 CONFIG_MISSING:'Tilføj STROM_API_KEY og STROM_API_URL som GitHub Actions secrets.',
 PRICE_BASIS_INVALID:'Strømligning-svaret kunne ikke verificeres som samlet variabel pris inkl. moms. Appen offentliggør derfor ingen nye priser.',
 KEY_IN_URL:'API-nøglen må ikke indgå i URLen.',URL_NOT_ALLOWED:'STROM_API_URL skal være en HTTPS-adresse til stromligning.dk/api/prices.',
 DATE_BOUNDS_MISSING:'Kopiér en pris-URL med fra- og til-dato fra Strømlignings dokumentation.',
 INTERVAL_MISSING:'Angiv STROM_INTERVAL_MINUTES som 15 eller 60, svarende til API-kaldet.',
 AUTH_HEADER:'Kontrollér STROM_AUTH_HEADER i GitHub Actions variables.'
};
async function publish(data){await mkdir('data',{recursive:true});await writeFile(file,JSON.stringify(data));}
function finiteNumber(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function nearlyEqual(a,b,tol=0.00001){return Math.abs(a-b)<=Math.max(tol,Math.abs(a)*1e-7,Math.abs(b)*1e-7);}
function verifyVariableTotal(payload,requestUrl){
 if(!payload||!Array.isArray(payload.prices)||!payload.prices.length)throw Error('PRICE_BASIS_INVALID');
 const expected=new URL(requestUrl).searchParams;
 if(expected.get('productId')&&payload.company?.product?.id!==expected.get('productId'))throw Error('PRICE_BASIS_INVALID');
 if(expected.get('supplierId')&&payload.supplier?.id!==expected.get('supplierId'))throw Error('PRICE_BASIS_INVALID');
 if(expected.get('customerGroupId')&&payload.supplier?.customerGroup?.id!==expected.get('customerGroupId'))throw Error('PRICE_BASIS_INVALID');
 const sample=[];
 for(const row of payload.prices){
  const price=row?.price||{},details=row?.details||{};
  const total=finiteNumber(price.total),value=finiteNumber(price.value),vat=finiteNumber(price.vat);
  if(total===null||value===null||vat===null||!nearlyEqual(value+vat,total))throw Error('PRICE_BASIS_INVALID');
  const unit=String(price.unit||'').toLowerCase();if(!['kr/kwh','dkk/kwh'].includes(unit))throw Error('PRICE_BASIS_INVALID');
  const components=[details?.electricity?.total,details?.surcharge?.total,details?.transmission?.systemTariff?.total,details?.transmission?.netTariff?.total,details?.electricityTax?.total,details?.distribution?.total].map(finiteNumber);
  if(components.some(v=>v===null))throw Error('PRICE_BASIS_INVALID');
  const sum=components.reduce((a,b)=>a+b,0);if(!nearlyEqual(sum,total,0.00002))throw Error('PRICE_BASIS_INVALID');
  if(sample.length<3)sample.push({total,componentSum:sum});
 }
 return {
  method:'api-components-sum-to-price.total',
  priceField:'price.total',
  unit:'kr/kWh',
  includesVat:true,
  priceArea:payload.priceArea||null,
  supplierId:payload.supplier?.id||null,
  supplierName:payload.supplier?.name||null,
  customerGroupId:payload.supplier?.customerGroup?.id||null,
  companyId:payload.company?.id||null,
  companyName:payload.company?.name||null,
  productId:payload.company?.product?.id||null,
  productName:payload.company?.product?.name||null,
  productType:payload.company?.product?.productType||null,
  checkedRows:payload.prices.length,
  sample
 };
}
try{
 request=makeRequest(process.env,now);
 const response=await fetch(request.url,{headers:request.headers,redirect:'error',signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('HTTP_'+response.status);
 const reader=response.body.getReader();let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8000000){await reader.cancel();throw Error('RESPONSE_TOO_LARGE');}chunks.push(value);}
 const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 const basisVerification=verifyVariableTotal(payload,request.url);
 let prices=parseStromligning(payload,request.interval);
 if(!prices.length)throw Error('EMPTY_PRICES');
 if(previous?.fingerprint===request.fingerprint){
  const freshStarts=new Set(prices.map(p=>p.start));
  const old=normalizePrices(previous.prices||[]).filter(p=>!p.forecast&&p.end<now&&p.start>=now-30*86400000&&!freshStarts.has(p.start));
  prices=normalizePrices([...old,...prices]);
 }
 const future=prices.filter(p=>p.end>now);
 const apiLabel=[basisVerification.productName,basisVerification.supplierName].filter(Boolean).join(' · ');
 await publish({version:5,status:'ok',verified:true,priceBasis:'variable-total-dkk-kwh-including-vat',basisVerification,label:request.label==='Fælles elaftale'&&apiLabel?apiLabel:request.label,fingerprint:request.fingerprint,fetchedAt:new Date(now).toISOString(),lastAttemptAt:new Date(now).toISOString(),intervalMinutes:request.interval,from:prices[0].start,to:prices.at(-1).end,hasForecast:prices.some(p=>p.forecast),prices});
 console.log('Prisgrundlag verificeret automatisk: price.total matcher prisens value + vat og summen af el, tillæg, systemtarif, nettarif, elafgift og distribution.');
 console.log('Priser opdateret: '+prices.length+' intervaller. Heraf '+future.filter(p=>p.forecast).length+' fremtidige prognoseintervaller. Ingen legitimationsoplysninger gemt.');
 if(!future.some(p=>p.forecast))console.log('::warning::API-svaret indeholder ingen prognoser. Appen viser kun forslag med fuld prisdækning og markerer at alle tre døgn ikke er dækket.');
}catch(error){
 const raw=String(error?.message||'');
 const code=messages[raw]?raw:/^HTTP_\d{3}$/.test(raw)?raw:raw.startsWith('API_')?raw.split(':')[0]:'UPDATE_FAILED';
 const message=messages[code]||(/HTTP_(401|403)/.test(code)?'API-adgang afvist. Kontrollér nøgle og godkendelsesheader i GitHub.':code==='HTTP_429'?'Strømlignings kaldgrænse er nået. Næste planlagte kørsel prøver igen.':'Prisopdatering fejlede. Kontrollér API-kald og svarformat i GitHub Actions.');
 const keep=request&&previous?.fingerprint===request.fingerprint&&previous?.verified===true&&previous?.priceBasis==='variable-total-dkk-kwh-including-vat';
 let safe=[];try{if(keep)safe=normalizePrices(previous.prices||[]);}catch{}
 const result=keep?{...previous,prices:safe}:{version:5,verified:false,prices:[],fetchedAt:null};
 await publish({...result,status:'error',errorCode:code,message,lastAttemptAt:new Date(now).toISOString()});
 console.log('::warning::'+code+' - '+message);
}
