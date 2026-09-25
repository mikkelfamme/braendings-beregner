// Runs only inside Actions. The real API contract must be verified before activation.
import {writeFile} from 'node:fs/promises';
import {parseStromligning,dayBounds,localParts,addDays} from '../src/engine.mjs';
const env=process.env;
if(env.STROM_VERIFIED!=='true'){console.log('Manual calculator only. API not yet verified.');process.exit(0);}
try{
 const key=env.STROM_API_KEY,template=env.STROM_API_URL,header=env.STROM_AUTH_HEADER,interval=Number(env.STROM_INTERVAL_MINUTES);
 if(!key||!template||!['X-API-Key','Authorization','X-API-Token'].includes(header)||![15,60].includes(interval))throw Error('Incomplete verified API settings');
 const today=localParts(Date.now()).date;
 const vals={date:today,start:new Date(dayBounds(addDays(today,-2))[0]).toISOString(),end:new Date(dayBounds(addDays(today,2))[0]).toISOString()};
 const url=new URL(template.replace(/\{(date|start|end)\}/g,(_,k)=>encodeURIComponent(vals[k])));
 if(url.protocol!=='https:'||url.hostname!=='stromligning.dk'||url.pathname!=='/api/prices'||url.username||url.password||url.hash||url.port)throw Error('Endpoint not allowed');
 if(url.href.includes(key)||[...url.searchParams.keys()].some(k=>/key|token|secret|password/i.test(k)))throw Error('Do not put secrets in the URL');
 const response=await fetch(url,{headers:{[header]:(env.STROM_AUTH_PREFIX||'')+key,Accept:'application/json'},signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!response.ok)throw Error('Upstream HTTP failure');
 const text=await response.text();if(text.length>8000000)throw Error('Response too large');
 const prices=parseStromligning(JSON.parse(text),interval);
 if(!prices.length)throw Error('No published prices');
 await writeFile('data/prices.json',JSON.stringify({verified:true,priceBasis:'variable-total-dkk-kwh-including-vat',fetchedAt:new Date().toISOString(),prices}));
 console.log('Published '+prices.length+' sanitized price intervals. No raw response or credentials stored.');
}catch{console.error('Price update failed. Check the API format and settings. No credentials or raw response are printed. Existing published site is unchanged.');process.exit(1);}
