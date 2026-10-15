import assert from 'node:assert/strict';
import {refineTrapezius} from '../dist/stone-avatar.js';
import {createContinuousTrapezius} from '../dist/adult-trapezius.js';
import {createBodyDeformer,bodyDefaults} from '../dist/body.js';

// A shared diagonal must remain shared after local support vertices are added.
const mesh={positions:[5000,140000,0,15000,140000,0,15000,137000,0,5000,137000,0],normals:Array(12).fill(0),uv:[0,0,1,0,1,1,0,1],skinIndices:Array(16).fill(0),skinWeights:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],faceRegions:Array(4).fill('Body'),groups:[{indices:[0,1,2,0,2,3]}]};
refineTrapezius(mesh,1.45);
assert.ok(mesh.trapeziusSupportVertices>0);
const edges=new Map();
for(const g of mesh.groups)for(let i=0;i<g.indices.length;i+=3){const t=g.indices.slice(i,i+3);for(let k=0;k<3;k++){const key=[t[k],t[(k+1)%3]].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}}
for(const [key,n] of edges){assert.ok(n===1||n===2);if(n===1){const [a,b]=key.split(',').map(Number),pa=mesh.positions.slice(a*3,a*3+3),pb=mesh.positions.slice(b*3,b*3+3);assert.ok((pa[0]===pb[0]&&[5000,15000].includes(pa[0]))||(pa[1]===pb[1]&&[137000,140000].includes(pa[1])),'new interior crack');}}
for(let i=0;i<mesh.skinWeights.length;i+=4)assert.ok(Math.abs(mesh.skinWeights.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<1e-8);
const landmarks={hips:[0,.9,0],neck:[0,1.45,0]},state={...bodyDefaults,characterType:'man',foundationRevision:1,gender:'male',bodySource:'stone'};
const low=createBodyDeformer({...state,trapeziusRidge:0},landmarks),high=createBodyDeformer({...state,trapeziusRidge:100},landmarks);
const point=[.06,1.412,-.070],a=low(...point,point),b=high(...point,point);
assert.ok(b[1]-a[1]>.010,'crest control must change actual geometry');
// The new inner crest falls continuously toward the shoulder instead of making a second outer peak.
const neutral=createBodyDeformer(state,landmarks);
const inner=[.06,1.412,-.070],outer=[.12,1.412,-.070];
assert.ok(neutral(...inner,inner)[1]-inner[1]>neutral(...outer,outer)[1]-outer[1],'neck-root rise must exceed outer rise');
const strong=createBodyDeformer({...state,trapezius:200,trapeziusRidge:200},landmarks);
for(let y=1.36;y<1.56;y+=.002){const p=[.06,y,-.035],q=[.06,y+.00001,-.035];assert.ok(strong(...q,q)[1]>strong(...p,p)[1],'extreme trapezius inverted vertical neck layers');}
const skull=[.06,1.64,0];assert.deepEqual(low(...skull,skull),high(...skull,skull),'crest must not move the skull');
console.log('PASS trapezius support topology, normalized weights, crest control and skull protection');

// The side-neck attenuation must also preserve vertical layers at maximum gains.
const roof=createContinuousTrapezius({...state,trapezius:200,trapeziusRidge:200},landmarks);
for(let x=.03;x<.15;x+=.01)for(let y=1.32;y<1.56;y+=.004)for(const z of [-.08,-.035,0,.025]){const p=[x,y,z],q=[x,y+.00001,z];assert.ok(roof(...q,q)[1]>roof(...p,p)[1],'side-neck fade inverted vertical layers');}
