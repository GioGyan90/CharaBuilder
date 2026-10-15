import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const base=fileURLToPath(process.env.CHARAMAKE_DIST?pathToFileURL(process.env.CHARAMAKE_DIST.replace(/[/\\]?$/,'/')):new URL('../dist/',import.meta.url));
const url=p=>pathToFileURL(p).href;
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'adult-hair-v91-'));
let candidate=await fs.readFile(process.env.CHARAMAKE_HAIR_CANDIDATE||base+'hair.js','utf8');candidate=candidate.replace("'three'",JSON.stringify(url(base+'vendor/three.module.js'))).replace(/'\.\/adult-head\.js\?v=\d+'/,JSON.stringify(url(base+'adult-head.js')));
await fs.writeFile(dir+'/new.mjs',candidate);
const next=await import(url(dir+'/new.mjs'));
const {prepareAdultHead}=await import(url(base+'adult-head.js'));
const {reserveImportedEyes,addImportedFeatures,graftHead,composeStoneReference}=await import(url(base+'stone-avatar.js'));
async function load(name){const m=JSON.parse(await fs.readFile(base+'assets/anime/'+name+'-manifest.json','utf8')),parts=await Promise.all(m.parts.map(p=>fs.readFile(base+'assets/anime/'+p,'utf8')));const d=JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64')));d.maps=d.materials.map(()=>null);return d;}
const [head,owner,body]=await Promise.all([load('adult-male'),load('imported-00003'),load('stone-ref')]);const original=JSON.stringify([head,owner,body]);
const adult={characterType:'man',foundationRevision:1,gender:'male',faceSource:'imported00003',bodySource:'stone',clothes:'underwear',frontHair:'imported00003',backHair:'imported00003',sideHair:'imported00003',braid:'none',frontLength:50,backLength:50,sideLength:50,hairVolume:50,craniumWidth:50,craniumDepth:50,facePlaneSoftness:50};
const donor=addImportedFeatures(reserveImportedEyes(prepareAdultHead(head,adult),adult),adult),graft=graftHead(composeStoneReference(body,adult),donor,body,head,{neckProfile:true,trapeziusStructure:true,headLift:.008,headForward:.028});
const target={...body,...graft},assets={male:target,'imported-00003':owner},result=next.referenceHairMeshes(assets,adult);
assert.equal(JSON.stringify([head,owner,body]),original);
assert.equal(result.filter(r=>r.mesh.name.endsWith('Undercut')).length,0,'gray shell should be represented on the head material');
assert.equal(result.filter(r=>r.mesh.adultCrown).reduce((n,r)=>n+r.mesh.groups.reduce((a,g)=>a+g.indices.length/3,0),0),2063);
for(const {mesh:m}of result){assert.ok(m.positions.every(Number.isFinite));for(const g of m.groups)for(const i of g.indices)assert.ok(i>=0&&i<m.positions.length/3);}
const fixtures=[
 [{...adult,foundationRevision:0},'59bd74bf8629aaf85faa7174c926dd51440517f3c308345e1c5dd2f3348a4982'],
 [{...adult,characterType:'boy',frontLength:25,backLength:80,sideLength:30,hairVolume:25},'790746e7d8f40bf48abe95abdc37045e7beab821fce0311dd97cf26f769e268c'],
 [{...adult,characterType:'girl',frontLength:80,backLength:15,sideLength:65,hairVolume:100},'4400c707a248c0c38fbe5668aeb6a249234fd0f4ecb462505f8205a65894c9b9']
];
// Golden geometry signatures were recorded from v89 with unchanged imported source assets.
for(const [state,expected]of fixtures){const out=next.referenceHairMeshes({male:owner,'imported-00003':owner},state),actual=createHash('sha256').update(JSON.stringify(out.map(({mesh})=>mesh))).digest('hex');assert.equal(actual,expected,'legacy geometry changed: '+state.characterType);}
for(const lengths of [[0,100,25],[100,0,100],[0,0,0],[100,100,100]]){const r=next.referenceHairMeshes(assets,{...adult,frontLength:lengths[0],backLength:lengths[1],sideLength:lengths[2],hairVolume:lengths[2],craniumWidth:lengths[0],craniumDepth:lengths[1]});assert.ok(!r.some(({mesh:m})=>m.name.endsWith('Undercut')));const crown=r.filter(r=>r.mesh.adultCrown),shared=new Map();for(const {mesh:m}of crown)for(const id of m.groups.flatMap(g=>g.indices)){const src=m.sourceVertexIds[id],p=m.positions.slice(id*3,id*3+3);if(shared.has(src))assert.deepEqual(p,shared.get(src),'crown split crack');shared.set(src,p);}assert.ok(r.every(({mesh:m})=>m.positions.every(Number.isFinite)));}
console.log('PASS adult gray shell removed, crown unchanged, four length extremes stay welded, immutable sources and exact legacy geometry');await fs.rm(dir,{recursive:true,force:true});
