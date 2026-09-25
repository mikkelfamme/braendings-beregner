/** Pure calculation engine. All durations are elapsed minutes, prices DKK/kWh. */
export const ZONE = 'Europe/Copenhagen';
export const DEFAULT_PROGRAMS = [
 {id:1,name:'Langsom forgl\u00f8dning',temp:980,minutes:810,kwh:null,profile:[],basis:'estimate'},
 {id:2,name:'Normal forgl\u00f8dning',temp:980,minutes:510,kwh:null,profile:[],basis:'estimate'},
 {id:3,name:'Lert\u00f8jsglasur',temp:1020,minutes:390,kwh:null,profile:[],basis:'estimate'},
 {id:4,name:'Stent\u00f8jsglasur',temp:1260,minutes:460,kwh:null,profile:[],basis:'estimate'}
];
export function finite(value, label='Tal') {
 if(value===null||value===undefined||typeof value==='boolean'||String(value).trim()==='') throw new Error(label+' mangler.');
 const n=typeof value==='number'?value:Number(String(value).replace(',','.'));
 if(!Number.isFinite(n)) throw new Error(label+' er ikke et gyldigt tal.');
 return n;
}
const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function localParts(ms) {
 const p=Object.fromEntries(formatter.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};
}
export function localToEpoch(date,time,occurrence='first') {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)) throw new Error('V\u00e6lg en gyldig dato og et klokkesl\u00e6t.');
 const wall=Date.parse(`${date}T${time}:00Z`);
 if(!Number.isFinite(wall)) throw new Error('Ugyldig dato.');
 // Danish civil time uses UTC+1 or UTC+2; try both rather than trusting phone timezone.
 const matches=[wall-7200000,wall-3600000].filter(ms=>{const p=localParts(ms);return p.date===date&&p.time===time;});
 if(!matches.length) throw new Error('Tidspunktet findes ikke i dansk tid. Ved sommertid springer uret fra 02 til 03.');
 return {ms:matches[occurrence==='second'?matches.length-1:0],ambiguous:matches.length>1};
}
export function addDays(date,days) {
 const ms=Date.parse(date+'T12:00:00Z');
 if(!Number.isFinite(ms)) throw new Error('Ugyldig dato.');
 return new Date(ms+days*86400000).toISOString().slice(0,10);
}
export function dayBounds(date) {return [localToEpoch(date,'00:00').ms,localToEpoch(addDays(date,1),'00:00').ms];}
export function validateProfile(program,power=7) {
 power=finite(power,'Ovnens effekt');
 if(power<=0||power>100) throw new Error('Ovnens effekt skal v\u00e6re mellem 0 og 100 kW.');
 let profile=program.profile;
 if(!Array.isArray(profile)||!profile.length) {
  const minutes=finite(program.minutes,'Varighed'),kwh=finite(program.kwh,'Forbrug i kWh');
  profile=[{minutes,kwh}];
 }
 if(profile.length>1000) throw new Error('H\u00f8jst 1000 forbrugsintervaller.');
 const clean=profile.map((p,i)=>{
  const minutes=finite(p.minutes,`Varighed i interval ${i+1}`),kwh=finite(p.kwh,`kWh i interval ${i+1}`);
  if(minutes<=0||kwh<0) throw new Error('Varighed skal v\u00e6re positiv og kWh mindst 0.');
  if(kwh>power*minutes/60+0.00001) throw new Error(`Interval ${i+1} overstiger ovnens maksimale effekt p\u00e5 ${power} kW.`);
  return {minutes,kwh};
 });
 const minutes=clean.reduce((s,p)=>s+p.minutes,0),kwh=clean.reduce((s,p)=>s+p.kwh,0);
 if(minutes>2880||kwh<=0) throw new Error('Programmet skal bruge str\u00f8m og vare h\u00f8jst 48 timer.');
 return {profile:clean,minutes,kwh,uniform:!Array.isArray(program.profile)||!program.profile.length};
}
export function normalizePrices(input) {
 if(!Array.isArray(input)) throw new Error('Prisdata skal v\u00e6re en liste.');
 const list=input.map(p=>({start:finite(p.start,'Prisstart'),end:finite(p.end,'Prisslut'),price:finite(p.price,'Elpris'),forecast:p.forecast===true})).sort((a,b)=>a.start-b.start);
 for(let i=0;i<list.length;i++) {
  if(list[i].end<=list[i].start) throw new Error('Et prisinterval har ugyldig varighed.');
  if(i&&list[i].start<list[i-1].end) throw new Error('Prisintervaller overlapper. Beregningen er stoppet.');
 }
 return list;
}
export function calculate(start,program,rawPrices,power=7) {
 start=finite(start,'Starttid');
 const p=validateProfile(program,power),prices=normalizePrices(rawPrices);
 let cursor=start,cost=0,coveredEnergy=0,missingMs=0,hasForecast=false;
 const breakdown=[];
 for(const phase of p.profile) {
  const end=cursor+phase.minutes*60000,kw=phase.kwh/(phase.minutes/60);
  let coverage=0;
  for(const price of prices) {
   if(price.end<=cursor) continue;
   if(price.start>=end) break;
   const a=Math.max(cursor,price.start),b=Math.min(end,price.end);
   if(b<=a) continue;
   const kwh=kw*(b-a)/3600000,amount=kwh*price.price;
   coverage+=b-a;coveredEnergy+=kwh;cost+=amount;hasForecast ||= price.forecast;
   breakdown.push({start:a,end:b,kwh,price:price.price,cost:amount,forecast:price.forecast});
  }
  // Missing prices during a zero-consumption cooling phase do not affect cost.
  if(kw>0) missingMs+=end-cursor-coverage;
  cursor=end;
 }
 const complete=missingMs<1;
 return {start,end:cursor,minutes:p.minutes,kwh:p.kwh,uniform:p.uniform,complete,cost:complete?cost:null,partialCost:cost,coveredEnergy,missingMinutes:missingMs/60000,forecast:hasForecast,breakdown};
}
export function optimize(first,last,program,prices,power=7,stepMinutes=15) {
 if(last<first||last-first>86400000) throw new Error('V\u00e6lg et startvindue p\u00e5 h\u00f8jst 24 timer.');
 if(stepMinutes<1) throw new Error('Ugyldigt tidsinterval.');
 const candidates=[];let skipped=0;
 for(let t=first;t<=last;t+=stepMinutes*60000) {
  const r=calculate(t,program,prices,power);
  if(r.complete&&!r.forecast) candidates.push(r); else skipped++;
 }
 candidates.sort((a,b)=>a.cost-b.cost||a.start-b.start);
 return {candidates,skipped,stepMinutes};
}
export function demoPrices(date,days=3) {
 const start=dayBounds(date)[0],end=dayBounds(addDays(date,days))[0],rows=[];
 for(let t=start;t<end;t+=900000) {
  const time=localParts(t).time,h=Number(time.slice(0,2))+Number(time.slice(3))/60;
  const price=1.42+0.85*Math.exp(-Math.pow((h-18)/2.2,2))-0.75*Math.exp(-Math.pow((h-12.5)/3.5,2))+0.14*Math.cos(h/2);
  rows.push({start:t,end:t+900000,price:Math.round(price*10000)/10000,forecast:false});
 }
 return rows;
}
export function parseStromligning(payload,intervalMinutes=15) {
 if(!payload||!Array.isArray(payload.prices)) throw new Error('Ukendt API-svar. Forventede prices-listen fra Str\u00f8mligning.');
 const duration=finite(intervalMinutes,'API-interval')*60000;
 if(![900000,3600000].includes(duration)) throw new Error('API-interval skal v\u00e6re 15 eller 60 minutter.');
 const all=payload.prices.map(row=>{
  if(typeof row.date!=='string'||!/(Z|[+-]\d{2}:?\d{2})$/.test(row.date)) throw new Error('API-tidsstempel mangler tidszone. Beregning er stoppet.');
  const unit=row.price?.unit;
  if(unit&&!['DKK/kWh','kr/kWh','DKK','kWh'].includes(unit)) throw new Error('Ukendt prisenhed fra API: '+String(unit).slice(0,30));
  const forecast=row.forecast===true||row.isForecast===true;
  return {start:Date.parse(row.date),end:Date.parse(row.date)+duration,price:finite(row.price?.total,'price.total'),forecast};
 });
 return normalizePrices(all).filter(p=>!p.forecast);
}
