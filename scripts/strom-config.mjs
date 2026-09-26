import {createHash} from 'node:crypto';
import {localParts,localToEpoch,addDays} from '../src/time.mjs';
/** Use the account's real GET /api/prices request URL, never guessed supplier IDs.
 * Keep its product/tariff/forecast selectors; replace time bounds on every run.
 */
export function makeRequest(env,now=Date.now()){
 const key=env.STROM_API_KEY?.trim(),template=env.STROM_API_URL?.trim();
 if(!key||!template)throw Error('CONFIG_MISSING');
 const header=(env.STROM_AUTH_HEADER||'X-API-Key').trim();
 if(!['X-API-Key','X-API-Token','Authorization'].includes(header))throw Error('AUTH_HEADER');
 const today=localParts(now).date;
 const start=new Date(localToEpoch(addDays(today,-7),'00:00').ms).toISOString();
 const end=new Date(localToEpoch(addDays(today,6),'00:00').ms).toISOString();
 const values={start,end,from:start,to:end,date:today};
 const url=new URL(template.replace(/\{(start|end|from|to|date)\}/g,(_,n)=>encodeURIComponent(values[n])));
 if(url.protocol!=='https:'||url.hostname!=='stromligning.dk'||url.pathname!=='/api/prices'||url.username||url.password||url.port||url.hash)throw Error('URL_NOT_ALLOWED');
 if([...url.searchParams.keys()].some(k=>/key|token|secret|password/i.test(k))||decodeURIComponent(url.href).includes(key))throw Error('KEY_IN_URL');
 if(url.searchParams.has('from')||url.searchParams.has('to')){url.searchParams.set('from',start);url.searchParams.set('to',end);}
 else if(url.searchParams.has('start')||url.searchParams.has('end')){url.searchParams.set('start',start);url.searchParams.set('end',end);}
 else throw Error('DATE_BOUNDS_MISSING');
 const aggregation=url.searchParams.get('aggregation');
 const interval=aggregation==='15m'?15:aggregation==='1h'?60:Number(env.STROM_INTERVAL_MINUTES);
 if(![15,60].includes(interval))throw Error('INTERVAL_MISSING');
 const fingerprintUrl=new URL(url);for(const name of ['from','to','start','end'])fingerprintUrl.searchParams.delete(name);
 const fingerprint=createHash('sha256').update(fingerprintUrl.href+'|'+interval).digest('hex').slice(0,24);
 return {url:url.href,headers:{[header]:(env.STROM_AUTH_PREFIX||'')+key,Accept:'application/json'},interval,fingerprint,label:(env.STROM_PRICE_LABEL||'Fælles elaftale').slice(0,120),start,end};
}
