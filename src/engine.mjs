import {finite,localParts,localToEpoch,addDays,dayBounds} from './time.mjs';
import {ALL_PROGRAMS,DEFAULT_SETTINGS,factoryProgram} from './programs.mjs';
export {finite,localParts,localToEpoch,addDays,dayBounds,ALL_PROGRAMS,DEFAULT_SETTINGS,factoryProgram};
const MINUTE=60000,HOUR=3600000;

function derivedActiveMinutes(program,startTemperature=20){
 let temp=startTemperature,minutes=0,passiveCooling=false;
 for(const s of program.segments){
  if(s.rate===null){passiveCooling=true;temp=s.temp;}
  else if(s.temp!==temp)minutes+=Math.abs(s.temp-temp)/s.rate*60;
  if(s.hold>0)minutes+=s.hold;
  temp=s.temp;
 }
 return {minutes,passiveCooling};
}

/**
 * Standard estimate used for every factory firing:
 * estimated kWh = kiln kW x active program hours x 0.50.
 * 0.50 is the fixed adjustment/load factor. Natural cooling after program end is 0 kWh.
 */
export function buildProgram(id,settings=DEFAULT_SETTINGS){
 const f=factoryProgram(id);
 const power=finite(settings.power??7,'Effekt'),loadFactor=finite(settings.loadFactor??0.5,'Belastningsfaktor');
 if(Math.abs(power-7)>1e-9)throw Error('SC 100 beregnes med fast mærkeeffekt på 7,0 kW.');
 if(Math.abs(loadFactor-0.5)>1e-9)throw Error('Standardberegningen bruger fast belastningsfaktor 0,50.');
 const derived=derivedActiveMinutes(f,finite(settings.startTemperature??20,'Starttemperatur'));
 const minutes=f.minutes??derived.minutes;
 if(!Number.isFinite(minutes)||minutes<=0)throw Error('Programmet mangler beregningsvarighed.');
 const effectiveKw=power*loadFactor,kwh=effectiveKw*minutes/60;
 return {...f,power,loadFactor,effectiveKw,minutes,kwh,passiveCooling:derived.passiveCooling,
  profile:[{minutes,kwh,label:'Standardestimat'}],basis:'standard-50',basisLabel:'Standardestimat · 50 % belastning',
  coolingText:derived.passiveCooling?'Programmet har desuden en naturlig SkIP-afkøling med ukendt varighed.':'Efter programmet køler ovnen naturligt ned; manualen angiver ingen fast tid.'};
}

export function validateProfile(profile,power=7){
 if(!Array.isArray(profile)||!profile.length)throw Error('Programmet mangler en gyldig forbrugsprofil.');
 const clean=profile.map(p=>{const minutes=finite(p.minutes,'Varighed'),kwh=finite(p.kwh,'Forbrug');if(minutes<=0||kwh<0||kwh>power*minutes/60+1e-6)throw Error('Ugyldigt forbrug.');return {minutes,kwh,label:p.label||''};});
 return {profile:clean,minutes:clean.reduce((s,p)=>s+p.minutes,0),kwh:clean.reduce((s,p)=>s+p.kwh,0)};
}

export function normalizePrices(input){
 if(!Array.isArray(input)||input.length>60000)throw Error('Ugyldige prisdata.');
 const p=input.map(x=>({start:finite(x.start,'Prisstart'),end:finite(x.end,'Prisslut'),price:finite(x.price,'Elpris'),forecast:x.forecast===true})).sort((a,b)=>a.start-b.start);
 for(let i=0;i<p.length;i++){if(p[i].end<=p[i].start||p[i].end-p[i].start>HOUR)throw Error('Ugyldigt prisinterval.');if(i&&p[i].start<p[i-1].end)throw Error('Prisintervaller overlapper.');}
 return p;
}

function costPrepared(start,program,prices,detail=false){
 let cursor=start,cost=0,missing=0,forecastKwh=0,index=0;const breakdown=[];
 while(index<prices.length&&prices[index].end<=start)index++;
 for(const phase of program.profile){
  const end=cursor+phase.minutes*MINUTE,kw=phase.kwh/(phase.minutes/60);let coverage=0;
  for(let i=index;i<prices.length;i++){
   const p=prices[i];if(p.start>=end)break;if(p.end<=cursor){index=i+1;continue;}
   const a=Math.max(cursor,p.start),b=Math.min(end,p.end);if(b<=a)continue;
   const energy=kw*(b-a)/HOUR,amount=energy*p.price;coverage+=b-a;cost+=amount;if(p.forecast)forecastKwh+=energy;
   if(detail)breakdown.push({start:a,end:b,kwh:energy,price:p.price,cost:amount,forecast:p.forecast});
  }
  missing+=Math.max(0,end-cursor-coverage);cursor=end;
 }
 const complete=missing<10;
 return {start,end:cursor,cost:complete?cost:null,complete,missingMinutes:missing/MINUTE,kwh:program.kwh,minutes:program.minutes,
  forecast:forecastKwh>1e-9,forecastKwh,breakdown,programId:program.id,programName:program.name,basis:program.basis,basisLabel:program.basisLabel,
  power:program.power,loadFactor:program.loadFactor,effectiveKw:program.effectiveKw,passiveCooling:program.passiveCooling,coolingText:program.coolingText};
}
export function calculate(start,program,rawPrices){start=finite(start,'Starttid');validateProfile(program.profile,program.power);return costPrepared(start,program,normalizePrices(rawPrices),true);}

export function findCheapest(program,rawPrices,now=Date.now()){
 validateProfile(program.profile,program.power);const prices=normalizePrices(rawPrices);
 const first=Math.ceil(finite(now)/MINUTE)*MINUTE,last=now+72*HOUR;let checked=0,skipped=0;const candidates=[];
 for(let start=first;start<=last;start+=MINUTE){checked++;const r=costPrepared(start,program,prices);if(!r.complete){skipped++;continue;}candidates.push(r);}
 candidates.sort((a,b)=>Math.abs(a.cost-b.cost)<1e-8?a.start-b.start:a.cost-b.cost);
 const best=candidates[0]||null;
 const alternative=candidates.find(r=>{const {time}=localParts(r.start);return (!best||Math.abs(r.start-best.start)>=HOUR)&&time>='06:30'&&time<='21:30';})||null;
 return {first,last,checked,skipped,covered:checked-skipped,allStartsCovered:skipped===0,best,alternative,stepMinutes:1};
}

/** Aggregate 15/60-minute API intervals to complete clock hours for display. */
export function hourlyPrices(rawPrices,now=Date.now(),maxHours=168){
 const prices=normalizePrices(rawPrices),first=Math.floor(now/HOUR)*HOUR,last=first+maxHours*HOUR,out=[];
 for(let start=first;start<last;start+=HOUR){
  const end=start+HOUR;let weighted=0,coverage=0,forecast=false;
  for(const p of prices){if(p.start>=end)break;if(p.end<=start)continue;const a=Math.max(start,p.start),b=Math.min(end,p.end);if(b<=a)continue;weighted+=p.price*(b-a);coverage+=b-a;if(p.forecast)forecast=true;}
  if(coverage>=HOUR-10)out.push({start,end,price:weighted/coverage,forecast});
 }
 return out;
}

export function parseStromligning(payload,intervalMinutes=15){
 if(!payload||!Array.isArray(payload.prices))throw Error('API_FORMAT: Svaret mangler prices-listen.');
 if(![15,60].includes(Number(intervalMinutes)))throw Error('API_INTERVAL: Vælg 15 eller 60 minutter.');
 const raw=payload.prices.map(row=>{
  if(typeof row.date!=='string'||!/(Z|[+-]\d{2}:?\d{2})$/.test(row.date))throw Error('API_TIMEZONE: Tidszone mangler.');
  const unit=row.price?.unit;if(unit&&!['DKK/kWh','kr/kWh','DKK','kWh'].includes(unit))throw Error('API_UNIT: Ukendt enhed.');
  const flag=row.forecast??row.isForecast??false;if(typeof flag!=='boolean')throw Error('API_FORECAST: Uventet prognosemarkering.');
  const start=Date.parse(row.date);let end=start+Number(intervalMinutes)*MINUTE;
  if(row.endDate!==undefined){if(typeof row.endDate!=='string'||!/(Z|[+-]\d{2}:?\d{2})$/.test(row.endDate))throw Error('API_TIMEZONE: Ugyldig sluttid.');end=Date.parse(row.endDate);}
  return {start,end,price:finite(row.price?.total,'price.total'),forecast:flag};
 });
 const dedup=new Map();for(const p of raw){const previous=dedup.get(p.start);if(previous&&!previous.forecast&&!p.forecast&&(previous.price!==p.price||previous.end!==p.end))throw Error('API_DUPLICATE: Modstridende offentliggjorte priser.');if(!previous||previous.forecast&&!p.forecast)dedup.set(p.start,p);}
 return normalizePrices([...dedup.values()]);
}
