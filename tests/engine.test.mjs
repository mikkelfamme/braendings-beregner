import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.mjs';
const H=3600000,M=60000;
const start=E.localToEpoch('2026-09-25','08:00').ms;
function prices(s,hours,fn=()=>2,forecast=false){const out=[];for(let i=0;i<hours*4;i++){const a=s+i*15*M;out.push({start:a,end:a+15*M,price:fn(i),forecast});}return out;}

test('all 12 factory programs build with one standard model',()=>{for(let id=1;id<=12;id++){const p=E.buildProgram(id);assert.equal(p.power,7);assert.equal(p.loadFactor,.5);assert.equal(p.effectiveKw,3.5);assert.ok(p.kwh>0);}});
test('P2 uses manual 8h30 and 50 percent factor',()=>{const p=E.buildProgram(2);assert.equal(p.minutes,510);assert.equal(p.kwh,29.75);});
test('P4 uses manual 7h40 and 50 percent factor',()=>{const p=E.buildProgram(4);assert.equal(p.minutes,460);assert.ok(Math.abs(p.kwh-26.8333333333)<1e-8);});
test('P2 plus P4 is 56.58 kWh, close to 56.7 kWh TOP100 reference',()=>{assert.ok(Math.abs(E.buildProgram(2).kwh+E.buildProgram(4).kwh-56.5833333333)<1e-8);});
test('P8-P12 do not require invented passive cooling duration',()=>{for(let id=8;id<=12;id++){const p=E.buildProgram(id);assert.equal(p.passiveCooling,true);assert.ok(p.minutes>0);}});
test('one hour at effective 3.5 kW and 2 DKK/kWh costs 7 DKK',()=>{const p={...E.buildProgram(7),minutes:60,kwh:3.5,profile:[{minutes:60,kwh:3.5}]};assert.equal(E.calculate(start,p,prices(start,1)).cost,7);});
test('variable prices are weighted across time',()=>{const p={...E.buildProgram(7),minutes:60,kwh:3.5,profile:[{minutes:60,kwh:3.5}]};const ps=prices(start,1,i=>i<2?1:3);assert.equal(E.calculate(start,p,ps).cost,7);});
test('missing price blocks total',()=>{const p={...E.buildProgram(7),minutes:60,kwh:3.5,profile:[{minutes:60,kwh:3.5}]};const ps=prices(start,1);ps.splice(1,1);assert.equal(E.calculate(start,p,ps).cost,null);});
test('hourly display aggregates four 15 minute slots',()=>{const ps=prices(start,2,i=>i<4?i+1:5);const h=E.hourlyPrices(ps,start,2);assert.equal(h.length,2);assert.equal(h[0].price,2.5);assert.equal(h[1].price,5);});
test('optimization best and alternative are at least 60m apart and alternative is daytime',()=>{const p={...E.buildProgram(7),minutes:30,kwh:1.75,profile:[{minutes:30,kwh:1.75}]};const ps=prices(start,76,i=>{const t=E.localParts(start+i*15*M);if(t.date==='2026-09-26'&&t.time>='02:00'&&t.time<'03:00')return .1;if(t.date==='2026-09-26'&&t.time>='07:00'&&t.time<'08:00')return .2;return 2;});const o=E.findCheapest(p,ps,start);assert.ok(o.best);assert.ok(o.alternative);assert.ok(Math.abs(o.alternative.start-o.best.start)>=H);const t=E.localParts(o.alternative.start).time;assert.ok(t>='06:30'&&t<='21:30');});
test('no recommendation is fabricated without data',()=>{const o=E.findCheapest(E.buildProgram(3),[],start);assert.equal(o.best,null);assert.equal(o.alternative,null);});
test('API parser uses price.total and preserves forecast',()=>{const p=E.parseStromligning({prices:[{date:'2026-09-25T00:00:00Z',price:{total:2.7},forecast:true}]});assert.equal(p[0].price,2.7);assert.equal(p[0].forecast,true);});
test('API parser rejects missing timezone',()=>assert.throws(()=>E.parseStromligning({prices:[{date:'2026-09-25T00:00:00',price:{total:2}}]})));
test('DST missing hour rejected',()=>assert.throws(()=>E.localToEpoch('2026-03-29','02:30')));

test('price bands cover all prices without gaps',()=>{assert.equal(E.priceBand(.99),'low');assert.equal(E.priceBand(1),'low');assert.equal(E.priceBand(1.01),'medium');assert.equal(E.priceBand(2),'medium');assert.equal(E.priceBand(2.01),'high');assert.equal(E.priceBand(3),'high');assert.equal(E.priceBand(3.01),'very-high');});
test('natural price range uses days for long feeds',()=>{assert.equal(E.naturalPriceRangeLabel(140),'Næste 6 døgn');assert.equal(E.naturalPriceRangeLabel(48),'Næste 2 døgn');assert.equal(E.naturalPriceRangeLabel(36),'Næste 36 timer');});

test('localParts always pads Danish month and day for iPhone-safe dates',()=>{
 const p=E.localParts(E.localToEpoch('2026-09-26','05:00').ms);
 assert.equal(p.date,'2026-09-26');
 assert.equal(p.time,'05:00');
});

test('selected-day optimizer searches only 06:30 through 21:30 on chosen date',()=>{
 const p={...E.buildProgram(7),minutes:30,kwh:1.75,profile:[{minutes:30,kwh:1.75}]};
 const day='2026-09-26';
 const dataStart=E.localToEpoch(day,'00:00').ms;
 const ps=prices(dataStart,30,i=>{
  const t=E.localParts(dataStart+i*15*M);
  if(t.date===day&&t.time>='07:15'&&t.time<'07:45')return .1;
  if(t.date===day&&t.time>='02:00'&&t.time<'03:00')return .01;
  return 2;
 });
 const o=E.findCheapestOnDay(p,ps,day);
 assert.ok(o.best);
 const t=E.localParts(o.best.start);
 assert.equal(t.date,day);
 assert.ok(t.time>='06:30'&&t.time<='21:30');
 assert.equal(t.time,'07:15');
});
