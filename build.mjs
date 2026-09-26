import {readFile,writeFile,mkdir,rm,cp} from 'node:fs/promises';
let core='';for(const file of ['time.mjs','programs.mjs','engine.mjs']){
 const source=await readFile('src/'+file,'utf8');
 core+=source.replace(/^import .*;\r?\n/gm,'').replace(/^export \{[^}]+\};\r?\n/gm,'').replace(/\bexport (?=(const|function|class)\b)/g,'')+'\n';
}
const expose=['finite','localParts','localToEpoch','addDays','dayBounds','ALL_PROGRAMS','DEFAULT_SETTINGS','factoryProgram','buildProgram','validateProfile','normalizePrices','calculate','findCheapest','hourlyPrices'];
const js='const E=(()=>{'+core+';return {'+expose.join(',')+'};})();\n'+await readFile('src/app.js','utf8');
const html=(await readFile('src/page.html','utf8')).replace('/*STYLE*/',await readFile('src/style.css','utf8')).replace('/*BUNDLE*/',js);
await writeFile('index.html',html);await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const f of ['index.html','assets','data'])await cp(f,'dist/'+f,{recursive:true});
await writeFile('dist/.nojekyll','');console.log('Built Braending 4.0.0. No credentials included.');
