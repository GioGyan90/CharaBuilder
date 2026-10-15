import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import {gunzipSync} from 'node:zlib';
import {reserveImportedEyes,graftHead,composeStoneReference} from '../dist/stone-avatar.js';
const data=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('../dist/assets/anime/imported-00003.b64',import.meta.url),'utf8'),'base64')));data.maps=data.materials.map(()=>null);data.meshes=data.meshes.filter(m=>m.name==='Face');
const mesh=reserveImportedEyes(data).meshes[0],edges=new Map();
for(const g of mesh.groups)for(let i=0;i<g.indices.length;i+=3)for(let k=0;k<3;k++){const a=g.indices[i+k],b=g.indices[i+(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}
const bad=[...edges].filter(([key,n])=>n!==2&&!key.split(',').every(id=>mesh.positions[Number(id)*3+1]===146465));
console.log('Non-collar boundary/nonmanifold edges:',bad.length,JSON.stringify(bad.slice(0,12).map(([e,n])=>[n,e.split(',').map(id=>mesh.positions.slice(Number(id)*3,Number(id)*3+3))])));assert.equal(bad.length,0);
console.log('PASS eye surface has shared edges and no unintended open boundaries');

const manifest=JSON.parse(await fs.readFile(new URL('../dist/assets/anime/stone-ref-manifest.json',import.meta.url),'utf8'));const bodyData=JSON.parse(gunzipSync(Buffer.from((await Promise.all(manifest.parts.map(p=>fs.readFile(new URL('../dist/assets/anime/'+p,import.meta.url),'utf8')))).join(''),'base64')));bodyData.maps=bodyData.materials.map(()=>null);
const {stonePreset}=await import('../dist/presets.js');
const joined=graftHead(composeStoneReference(bodyData,stonePreset),reserveImportedEyes(data),bodyData,data,{neckProfile:true,headLift:.008,headForward:.028}).meshes.find(m=>m.name==='Face');
const oriented=new Map();for(const g of joined.groups)for(let i=0;i<g.indices.length;i+=3)for(let k=0;k<3;k++){const a=joined.positions.slice(g.indices[i+k]*3,g.indices[i+k]*3+3).join(','),b=joined.positions.slice(g.indices[i+(k+1)%3]*3,g.indices[i+(k+1)%3]*3+3).join(','),key=[a,b].sort().join('|');const e=oriented.get(key)||{count:0,sum:0};e.count++;e.sum+=a<b?1:-1;oriented.set(key,e);}
const inconsistent=[...oriented].filter(([,e])=>e.count===2&&e.sum!==0);console.log('Inconsistent head/neck winding edges:',inconsistent.length,JSON.stringify(inconsistent));assert.equal(inconsistent.length,0);
