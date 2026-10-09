// Offline provenance report; requires only Node.js 24 and the repository assets.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {hairDefaults,classicHairPresets,referenceHairMeshes} from '../dist/hair.js';
const root=new URL('../dist/assets/anime/',import.meta.url),assets={};
for(const id of ['female','male','bob','long','uniform','classic']){
 const manifest=JSON.parse(await fs.readFile(new URL(id+'-manifest.json',root),'utf8'));
 const parts=await Promise.all(manifest.parts.map(p=>fs.readFile(new URL(p,root),'utf8')));
 assets[id]=JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64')));
 if(assets[id].license!=='CC0')throw Error('Non-CC0 source: '+id);
}
for(const preset of classicHairPresets){
 const state={...hairDefaults,...preset.values,gender:'female'};
 const records=referenceHairMeshes(assets,state).map(({owner,mesh})=>({section:mesh.name,source:owner.source,vertices:mesh.positions.length/3,triangles:mesh.groups.reduce((sum,g)=>sum+g.indices.length/3,0)}));
 console.log(JSON.stringify({preset:preset.label,parts:records}));
}
