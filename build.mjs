import {readFile,writeFile,mkdir,rm,cp} from 'node:fs/promises';
const engine=(await readFile('src/engine.mjs','utf8')).replace(/export /g,'');
const names=[...engine.matchAll(/(?:const|function)\s+(\w+)/g)].map(x=>x[1]);
const expose=['DEFAULT_PROGRAMS','finite','localParts','localToEpoch','addDays','dayBounds','validateProfile','normalizePrices','calculate','optimize','demoPrices'];
const js='const E=(()=>{'+engine+';return {'+expose.join(',')+'};})();\n'+await readFile('src/app.js','utf8');
const html=(await readFile('src/page.html','utf8')).replace('/*STYLE*/',await readFile('src/style.css','utf8')).replace('/*BUNDLE*/',js);
await writeFile('index.html',html);await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const f of ['index.html','assets','data'])await cp(f,'dist/'+f,{recursive:true});
await writeFile('dist/.nojekyll','');console.log('Built static GitHub app.');
