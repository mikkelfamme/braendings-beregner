import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');

test('bottom menu has exactly the four requested tabs in order',()=>{
  assert.match(app,/\[\['price','Elprisen','price'\],\['calc','Beregn','calc'\],\['cheap','Billigst','price'\],\['oven','Keramik ovnen','settings'\]\]/);
  assert.doesNotMatch(app,/\['history','Brændinger'/);
});

test('Elprisen is the default start tab and owns the hourly price board',()=>{
  assert.match(app,/const S=\{tab:'price'/);
  assert.match(app,/function pricePage\(\)\{return priceBoard\(\);\}/);
  assert.match(app,/S\.tab==='price'\?pricePage\(\):S\.tab==='calc'\?calcPage\(\):S\.tab==='cheap'\?cheapPage\(\):ovenPage\(\)/);
});

test('Beregn no longer renders the electricity price board',()=>{
  const calc=app.match(/function calcPage\(\)\{(.+?)\nfunction optimizerForm/s)?.[1]||'';
  assert.ok(calc.length>0);
  assert.doesNotMatch(calc,/priceBoard\(/);
});

test('history UI and save firing action are removed',()=>{
  assert.doesNotMatch(app,/function historyPage\(/);
  assert.doesNotMatch(app,/>Gem brænding</);
  assert.doesNotMatch(app,/data-action="save"/);
  assert.doesNotMatch(app,/save-form/);
});


test('all program selectors start on Program 1 by default',()=>{
  assert.match(app,/program:1,cheapProgram:1,dayProgram:1/);
});

test('Elprisen summary shows now, cheapest today and most expensive today',()=>{
  assert.match(app,/summary\('Nu',current\)/);
  assert.match(app,/summary\('Billigst i dag',cheapToday\)/);
  assert.match(app,/summary\('Dyrest i dag',highToday\)/);
});

test('forecast hours have a separate visual class and legend',()=>{
  assert.match(app,/x\.forecast\?' forecast'/);
  assert.match(app,/prognose/);
});

test('Billigst uses a two-mode selector instead of showing both searches at once',()=>{
  assert.match(app,/data-cheap-mode="next"/);
  assert.match(app,/data-cheap-mode="day"/);
  assert.match(app,/S\.cheapMode==='next'\?optimizerForm\(\):dayOptimizerForm\(\)/);
});

test('calculation result includes same-day comparison and savings',()=>{
  assert.match(app,/Sammenlign med samme dag/);
  assert.match(app,/Du kan spare/);
  assert.match(app,/use-same-day-best/);
});
