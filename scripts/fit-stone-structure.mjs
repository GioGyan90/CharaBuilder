import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {parameterDefaults,createDeformer,buildAnimeFace,bodyAnchors} from '../dist/parameters.js';
const root=new URL('../dist/assets/anime/',import.meta.url),out=new URL('../artifacts/stone-fit-v79/',import.meta.url);await fs.mkdir(out,{recursive:true});
const mf=JSON.parse(await fs.readFile(new URL('male-manifest.json',root)));
const base=JSON.parse(gunzipSync(Buffer.from((await Promise.all(mf.parts.map(p=>fs.readFile(new URL(p,root),'utf8')))).join(''),'base64')));
base.rig=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('male-rig.b64',root),'utf8'),'base64')));
const fitted=buildAnimeFace(base,'male','foundation'),landmarks={...fitted.landmarks,bodyRig:bodyAnchors(base)};
const app=await fs.readFile(new URL('../dist/app.js',import.meta.url),'utf8'),literal=app.match(/const paintedFacePreset=(.*);/)[1];
let state={...parameterDefaults,height:50,legs:50,hips:50,faceWidth:50,...Function('faceNeutral','return ('+literal+')')({})};
try{state=JSON.parse(await fs.readFile(new URL('baseline-state.json',out)));}catch{}
const keys=['midfaceSupport','jawBodySupport','cheek','cheekboneWidth','cheekboneDepth','jawWidth','jawBase','jawCornerDepth','jawRamus','masseter','chinWidth','chinProjection','chinSquareness','chinLength','maxillaDepth','maxillaWidth','zygomaticArchDepth','lowerFaceLength','faceHeight'];
const m=fitted.meshes[0],ids=[...new Set(m.groups.filter(g=>fitted.materials[g.material].name.includes('_SKIN')).flatMap(g=>g.indices))];
const positions=ids.map(i=>m.positions.slice(i*3,i*3+3).map(v=>v/100000));
function evaluate(s){const d=createDeformer(s,landmarks,1);return positions.map((p,j)=>d(...p,m.faceRegions[ids[j]]));}
const d=createDeformer(state,landmarks,1),rig=landmarks.faceRig;
const current=evaluate(state),derivatives={};for(const key of keys)derivatives[key]=evaluate({...state,[key]:state[key]+1}).map((p,i)=>p.map((v,k)=>v-current[i][k]));
let candidate=null;try{candidate=JSON.parse(await fs.readFile(new URL('candidate.json',out)));}catch{}
await fs.writeFile(new URL('runtime.json',out),JSON.stringify({state,keys,positions,current,derivatives,ids,faces:m.groups.filter(g=>fitted.materials[g.material].name.includes('_SKIN')).flatMap(g=>g.indices).map(i=>ids.indexOf(i)),anchors:{eyes:rig.eyes.map((p,i)=>d(...p,'Face:eye'+i)),mouth:d(...rig.mouth,'Face:mouth')},candidate:candidate?evaluate({...state,...candidate}):null}));
console.log({vertices:ids.length,anchors:{eyes:rig.eyes.map((p,i)=>d(...p,'Face:eye'+i)),mouth:d(...rig.mouth,'Face:mouth')}});
