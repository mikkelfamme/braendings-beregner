/** Actions-only adapter. Only normalized prices are published, never credentials/raw responses. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseStromligning,normalizePrices} from '../src/engine.mjs';
import {makeRequest} from './strom-config.mjs';
const file='data/prices.json',now=Date.now();let previous=null,request=null;
try{previous=JSON.parse(await readFile(file,'utf8'));}catch{}
const messages={
 CONFIG_MISSING:'Tilf\u00f8j STROM_API_KEY og STROM_API_URL som GitHub Actions secrets.',
 PRICE_BASIS_UNCONFIRMED:'Bekr\u00e6ft at pris-URLen g\u00e6lder jeres fulde variable pris inkl. moms, og s\u00e6t STROM_PRICE_BASIS_CONFIRMED=true.',
 KEY_IN_URL:'API-n\u00f8glen m\u00e5 ikke indg\u00e5 i URLen.',URL_NOT_ALLOWED:'STROM_API_URL skal v\u00e6re en HTTPS-adresse til stromligning.dk/api/prices.',
 DATE_BOUNDS_MISSING:'Kopi\u00e9r en pris-URL med fra- og til-dato fra Str\u00f8mlignings dokumentation.',
 INTERVAL_MISSING:'Angiv STROM_INTERVAL_MINUTES som 15 eller 60, svarende til API-kaldet.',
 AUTH_HEADER:'Kontroll\u00e9r STROM_AUTH_HEADER i GitHub Actions variables.'
};
async function publish(data){await mkdir('data',{recursive:true});await writeFile(file,JSON.stringify(data));}
try{
 request=makeRequest(process.env,now);
 const response=await fetch(request.url,{headers:request.headers,redirect:'error',signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('HTTP_'+response.status);
 const reader=response.body.getReader();let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8000000){await reader.cancel();throw Error('RESPONSE_TOO_LARGE');}chunks.push(value);}
 const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 let prices=parseStromligning(payload,request.interval);
 if(!prices.length)throw Error('EMPTY_PRICES');
 // Retain up to 30 days of previously published, non-forecast prices of the SAME tariff.
 if(previous?.fingerprint===request.fingerprint){
  const freshStarts=new Set(prices.map(p=>p.start));
  const old=normalizePrices(previous.prices||[]).filter(p=>!p.forecast&&p.end<now&&p.start>=now-30*86400000&&!freshStarts.has(p.start));
  prices=normalizePrices([...old,...prices]);
 }
 const future=prices.filter(p=>p.end>now);
 await publish({version:4,status:'ok',verified:true,priceBasis:'variable-total-dkk-kwh-including-vat',label:request.label,fingerprint:request.fingerprint,fetchedAt:new Date(now).toISOString(),lastAttemptAt:new Date(now).toISOString(),intervalMinutes:request.interval,from:prices[0].start,to:prices.at(-1).end,hasForecast:prices.some(p=>p.forecast),prices});
 console.log('Priser opdateret: '+prices.length+' intervaller. Heraf '+future.filter(p=>p.forecast).length+' fremtidige prognoseintervaller. Ingen legitimationsoplysninger gemt.');
 if(!future.some(p=>p.forecast))console.log('::warning::API-svaret indeholder ingen prognoser. Appen viser kun forslag med fuld prisdaekning og markerer at alle tre doegn ikke er daekket.');
}catch(error){
 const raw=String(error?.message||'');
 const code=messages[raw]?raw:/^HTTP_\d{3}$/.test(raw)?raw:raw.startsWith('API_')?raw.split(':')[0]:'UPDATE_FAILED';
 const message=messages[code]||(/HTTP_(401|403)/.test(code)?'API-adgang afvist. Kontroll\u00e9r n\u00f8gle og godkendelsesheader i GitHub.':code==='HTTP_429'?'Str\u00f8mlignings kaldgr\u00e6nse er n\u00e5et. N\u00e6ste planlagte k\u00f8rsel pr\u00f8ver igen.':'Prisopdatering fejlede. Kontroll\u00e9r API-kald og svarformat i GitHub Actions.');
 // Only keep old prices when we know the requested tariff did not change.
 const keep=request&&previous?.fingerprint===request.fingerprint&&previous?.verified===true;
 let safe=[];try{if(keep)safe=normalizePrices(previous.prices||[]);}catch{}
 const result=keep?{...previous,prices:safe}:{version:4,verified:false,prices:[],fetchedAt:null};
 await publish({...result,status:'error',errorCode:code,message,lastAttemptAt:new Date(now).toISOString()});
 console.log('::warning::'+code+' - '+message);
 // Publish the new app and an explicit error state rather than silently falling back to demo prices.
}
