import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {normalize,performanceAt,defaults,STORAGE_KEY} from '../dist/dialogue-timeline.js';
assert.equal(STORAGE_KEY,'lucky-break:dialogue-2d:v1');
assert.deepEqual(normalize({gain:Infinity,duration:-10,expression:'invalid',view:'x'}),{...defaults,duration:5,expression:'neutral',view:'half'});
for(let t=0;t<35;t+=.05){
  for(const speaking of [true,false]){
    const state=performanceAt(t,defaults,speaking);
    assert(Object.values(state.parameters).every(Number.isFinite));
    assert(state.parameters.eyeOpen>=0 && state.parameters.eyeOpen<=1);
    assert.equal(state.parameters.eyeROpen,state.parameters.eyeOpen);
    assert.equal(state.parameters.eyeLOpen,state.parameters.eyeOpen);
    assert.equal(state.parameters.bodyAngleZ,0);
    if(!speaking)assert.equal(state.parameters.mouthOpen,0);
  }
}
assert.equal(performanceAt(1,defaults,true,0).parameters.mouthOpen,0);
assert(performanceAt(1,defaults,true,.5).parameters.mouthOpen>0);
assert(performanceAt(0,defaults,false,null,{id:'blink',elapsed:.16}).parameters.eyeOpen<.01);
assert.equal(performanceAt(12,defaults,true).expression,'smile');
const rig=JSON.parse(readFileSync(new URL('../dist/assets/dialogue/lucky-npc/rig.json',import.meta.url)));
assert.deepEqual(rig.image,{width:1072,height:1920});
for(const eye of rig.eyes){assert.equal(eye.top.length,24);assert.equal(eye.bot.length,24);}
const sprites=JSON.parse(readFileSync(new URL('../dist/assets/dialogue/lucky-npc/built/sprites/sprites.json',import.meta.url)));
for(const [name,rect] of Object.entries(sprites.layers)){
  assert(rect[0]>=0 && rect[1]>=0 && rect[0]+rect[2]<=1072 && rect[1]+rect[3]<=1920);
  assert(existsSync(new URL(`../dist/assets/dialogue/lucky-npc/built/sprites/${name}.png`,import.meta.url)));
}
const html=readFileSync(new URL('../dialogue.html',import.meta.url),'utf8');
assert(!html.includes('dist/app.js'));
assert(readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('href="./dialogue.html"'));
console.log('PASS: 2D timeline, silent/audio mouth, blink, rig assets and independent entry');
const {lineAt}=await import('../dist/dialogue-timeline.js');
const authored=normalize({lines:[{text:'准备好了？',expression:'smile',motion:'tilt',at:.2,duration:3},{text:'开始吧。',expression:'neutral',motion:'nod',at:.5,duration:2}],duration:5});
assert.equal(lineAt(2.99,authored).index,0);
assert.equal(lineAt(3,authored).index,1);
assert.equal(lineAt(6,authored).elapsed,2);
assert.equal(performanceAt(.8,authored,true).expression,'smile');
assert.equal(performanceAt(3.8,authored,true).expression,'neutral');
assert(performanceAt(.8,authored,true).parameters.angleZ>2);
assert.equal(lineAt(6,{...authored,duration:10}).index,1);
assert.equal(normalize({lines:[{duration:-3,at:99,motion:'bad'}]}).lines[0].at,.9);
console.log('PASS: cue boundaries, authored expression/motion, audio time scaling and input bounds');
