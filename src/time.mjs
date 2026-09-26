export const ZONE='Europe/Copenhagen';
export function finite(value, label='Tal') {
 if(value===null||value===undefined||typeof value==='boolean'||String(value).trim()==='') throw new Error(label+' mangler.');
 const n=typeof value==='number'?value:Number(String(value).replace(',','.'));
 if(!Number.isFinite(n)) throw new Error(label+' er ikke et gyldigt tal.');
 return n;
}
const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const pad2=value=>String(value).padStart(2,'0');
export function localParts(ms) {
 const p=Object.fromEntries(formatter.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return {date:`${p.year}-${pad2(p.month)}-${pad2(p.day)}`,time:`${pad2(p.hour)}:${pad2(p.minute)}`};
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
