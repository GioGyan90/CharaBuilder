import assert from 'node:assert/strict';
import {faceEditorGroups,bodyEditorGroups,dragValues,bindDrag} from '../dist/editor.js';
import {faceAdjustmentKeys,bodyAdjustmentKeys} from '../dist/parameters.js';
assert.deepEqual(new Set(faceEditorGroups.flatMap(g=>g.keys).filter(k=>faceAdjustmentKeys.includes(k))),new Set(faceAdjustmentKeys));
assert.equal(faceEditorGroups.flatMap(g=>g.keys).filter(k=>faceAdjustmentKeys.includes(k)).length,33);
const axis=['eyeSpace','eyeVertical'],initial={eyeSpace:50,eyeVertical:50};
assert.deepEqual(dragValues(initial,20,-40,axis),{eyeSpace:61,eyeVertical:72});
assert.deepEqual(dragValues(initial,20,-40,axis,{fine:true}),{eyeSpace:52,eyeVertical:54});
assert.deepEqual(dragValues(initial,-20,-40,axis,{side:-1}),{eyeSpace:61,eyeVertical:72});
assert.deepEqual(dragValues(initial,1000,1000,axis),{eyeSpace:150,eyeVertical:-50});
assert.deepEqual(initial,{eyeSpace:50,eyeVertical:50});
class Target{listeners=new Map();capture=null;classes=new Set();classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)};addEventListener(k,fn){this.listeners.set(k,fn);}setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(id){this.capture=null;}send(kind,values={}){this.listeners.get(kind)?.({button:0,pointerId:7,clientX:100,clientY:100,shiftKey:false,preventDefault(){},stopPropagation(){},...values});}}
let state={...initial},begins=0,ends=0;const target=new Target();
bindDrag(target,{read:()=>state,axis:()=>axis,write:v=>Object.assign(state,v),begin:()=>begins++,end:()=>ends++});
target.send('pointerdown',{button:2});assert.equal(begins,0);
target.send('pointerdown');assert.equal(target.capture,7);target.send('pointermove',{pointerId:8,clientX:200});assert.deepEqual(state,initial);
target.send('pointermove',{clientX:120,clientY:60});assert.deepEqual(state,{eyeSpace:61,eyeVertical:72});
target.send('pointermove',{clientX:140,clientY:60});assert.deepEqual(state,{eyeSpace:72,eyeVertical:72}); // relative to pointer-down, no accumulating drift
assert.equal(begins,1);target.send('pointerup');assert.equal(ends,1);assert.equal(target.capture,null);assert.equal(target.classes.size,0);
target.send('pointermove',{clientX:500});assert.deepEqual(state,{eyeSpace:72,eyeVertical:72});
for(const cancel of ['pointercancel','lostpointercapture']){target.send('pointerdown',{pointerType:'touch'});target.send('pointermove',{clientX:110,shiftKey:true});target.send(cancel);assert.equal(target.capture,null);assert.equal(target.classes.size,0);}
assert.equal(ends,3);console.log('PASS 33 grouped geometry parameters, mirrored/relative drags, free bounds, Shift micro-adjustment, touch capture and cancel cleanup');

assert.deepEqual(new Set(bodyEditorGroups.flatMap(g=>g.keys).filter(k=>bodyAdjustmentKeys.includes(k))),new Set(bodyAdjustmentKeys));
assert.equal(bodyEditorGroups.filter(g=>g.axes.length).length,8);
assert.deepEqual(dragValues({weight:45,height:50},40,-20,bodyEditorGroups[0].axes[0]),{weight:67,height:61});
console.log('PASS 35 body parameters in eight drag groups, plus independent skin color card');
