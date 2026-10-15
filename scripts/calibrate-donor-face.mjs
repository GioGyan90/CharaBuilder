import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {parameterDefaults,createDeformer,buildAnimeFace,bodyAnchors} from '../dist/parameters.js';
const root=new URL('../dist/assets/anime/',import.meta.url);
const mf=JSON.parse(await fs.readFile(new URL('male-manifest.json',root)));
const base=JSON.parse(gunzipSync(Buffer.from((await Promise.all(mf.parts.map(p=>fs.readFile(new URL(p,root),'utf8')))).join(''),'base64')));
base.rig=JSON.parse(gunzipSync(Buffer.from(await fs.readFile(new URL('male-rig.b64',root),'utf8'),'base64')));
const fitted=buildAnimeFace(base,'male','foundation'),landmarks={...fitted.landmarks,bodyRig:bodyAnchors(base)};
const app=await fs.readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const literal=app.match(/const paintedFacePreset=(.*);/)[1];
const state={...parameterDefaults,height:50,legs:50,hips:50,faceWidth:50,...Function('faceNeutral','return ('+literal+')')({})};
const donor=JSON.parse(await fs.readFile(new URL('donor-face-measurements.json',root)));
const target=donor.measurements.eyeSpanPerEyeMouth;
function ratio(eyeSpace){const d=createDeformer({...state,eyeSpace},landmarks,1),r=landmarks.faceRig;const eyes=r.eyes.map((e,i)=>d(...e,'Face:eye'+i));const mouth=d(...r.mouth,'Face:mouth');return Math.abs(eyes[1][0]-eyes[0][0])/((eyes[0][1]+eyes[1][1])/2-mouth[1]);}
if(!Number.isFinite(target)||!Number.isFinite(ratio(state.eyeSpace)))throw Error('Non-finite landmark calibration');
let best=state.eyeSpace,error=Infinity;for(let v=-50;v<=150;v++){const e=Math.abs(ratio(v)-target);if(e<error){error=e;best=v;}}
const report={method:'Uniform-scale invariant eye-center span / eye-to-mouth vertical distance. Fit eyeSpace only; no claims about eye corners or lip boundary.',target,current:{eyeSpace:state.eyeSpace,ratio:ratio(state.eyeSpace)},candidate:{eyeSpace:best,ratio:ratio(best)}};
console.log(JSON.stringify(report,null,2));
await fs.mkdir(new URL('../artifacts/donor-reference/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../artifacts/donor-reference/calibration.json',import.meta.url),JSON.stringify(report,null,2));


