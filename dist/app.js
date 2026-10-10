import {faceEditorGroups,bodyEditorGroups,bindDrag,clampValue} from './editor.js?v=21';
import {openHslPicker} from './colors.js?v=16';
import {updateCharacterMotion,motionPresets} from './motion.js?v=26';
import {parameterDefaults,parameterRanges} from './parameters.js?v=21';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { loadHumanAssets, createHuman, disposeHuman, ensureHumanPresets, applyHumanColors } from './anime.js?v=25';

import {hairDefaults,hairChoices,hairRanges,classicHairPresets,hairOptionsFor,filterHairForGender} from './hair.js?v=16';
import {wardrobeDefaults,wardrobeRanges} from './wardrobe.js?v=25';
const $ = s => document.querySelector(s);
const defaults = {...parameterDefaults,...hairDefaults,...wardrobeDefaults,faceSource:'vroid',name:'新角色',gender:'female',height:50,weight:45,shoulders:45,legs:50,faceWidth:50,jaw:45,eyeSize:50,eyeSpace:50,nose:50,mouth:50,hair:'modular',clothes:'shirtPants',shoes:'shoes',expression:'neutral',skin:'#f1cbb2',hairColor:'#332821',eyeColor:'#806449',shirt:'#778f87',pants:'#343b50'};
const choices = {faceSource:[['vroid','原版日漫'],['authored','参考日漫']],gender:[['female','女性'],['male','男性']],...hairChoices,hair:[['modular','分区发型']],clothes:[['shirtPants','衬衫 · 长裤'],['underwear','贴身内衣']],shoes:[['shoes','穿鞋'],['barefoot','光脚']],expression:[['neutral','自然'],['fun','微笑'],['joy','开心'],['angry','认真'],['sorrow','忧伤'],['blink','闭眼']]};
const palettes = {eyeColor:['#806449','#427b99','#538368','#a67845','#8773a1','#8f454a'],skin:['#f1cbb2','#d6a17e','#b87c55','#86543c','#51372c'],hairColor:['#201d20','#332821','#815137','#c5a15e','#b7b9c4','#854d67'],shirt:['#778f87','#d7c8b0','#a24d54','#537892','#373c49','#bca0c2'],pants:['#343b50','#292c31','#a09380','#655850']};
const ranges = {...parameterRanges,...hairRanges,...wardrobeRanges,height:['身高','较矮','较高'],weight:['体型','纤细','丰满'],shoulders:['肩宽','窄','宽'],legs:['腿长比例','短','长'],faceWidth:['脸部宽度','窄','宽'],jaw:['下颌轮廓','收窄','方正'],eyeSize:['眼睛大小','小','大'],eyeSpace:['眼间距','近','远'],nose:['鼻子大小','小','大'],mouth:['嘴部宽度','窄','宽']};
const tabs = {body:['01 / FOUNDATION','创造独一无二的你','保留日漫基础结构，用参数调整身体比例。',['name','gender','height','weight','shoulders','legs','headSize','neckWidth','chest','waist','hips','legThickness','torsoLength','shoulderSlope','shoulderDepth','chestDepth','bustSize','bustHeight','backDepth','waistHeight','abdomen','hipDepth','hipHeight','armLength','upperArm','forearm','handSize','thigh','calf','ankle','footLength','footWidth','legSpace','skin']],face:['02 / FEATURES','每一面，都有个性','眼形与瞳孔分开处理，瞳孔保留原始比例。',['faceWidth','faceHeight','jaw','cheek','chinWidth','chinLength','forehead','eyeSize','eyeWidth','eyeHeight','eyeSpace','eyeVertical','eyeTilt','browHeight','browAngle','nose','noseWidth','noseHeight','noseProjection','mouth','mouthHeight','mouthThickness','mouthProjection','mouthCorner','expression','eyeColor']],hair:['03 / HAIRSTYLE','从头开始的风格','从经典发型出发，分别调整前发、后发、侧发和马尾。',['frontHair','frontLength','backHair','backLength','sideHair','sideLength','braid','braidLength','hairVolume','hairColor']],clothes:['04 / WARDROBE','穿出你的日常','选择衬衫长裤或贴身内衣，可独立切换鞋履。',['clothes','shoes','shirtLength','sleeveLength','shirtEase','pantsWidth','shirt','pants']]};
const bounds=key=>(tabs.face[3].includes(key)||tabs.body[3].includes(key))&&ranges[key]?[-50,150]:[0,100];
const faceNeutral=Object.fromEntries(tabs.face[3].filter(k=>ranges[k]).map(k=>[k,50]));
const facePresets=[
 {label:'绫 · 成女脸',gender:'female',values:{faceSource:'authored',...faceNeutral,faceWidth:50,jaw:50,eyeSize:50,eyeSpace:50,nose:50,mouth:50,expression:'neutral'}},
 {label:'隼 · 熟男脸',gender:'male',values:{faceSource:'authored',...faceNeutral,faceWidth:50,jaw:50,eyeSize:50,eyeSpace:50,nose:50,mouth:50,expression:'neutral'}},
  {label:'柔和日漫',values:{faceSource:'vroid',faceWidth:45,jaw:22,eyeSize:88,eyeSpace:54,nose:15,mouth:30}},
  {label:'清爽青年',values:{faceSource:'vroid',faceWidth:42,jaw:38,eyeSize:73,eyeSpace:50,nose:27,mouth:36}},
  {label:'原版日漫',values:{faceSource:'vroid',faceWidth:50,jaw:50,eyeSize:50,eyeSpace:50,nose:50,mouth:50,forehead:50,chinLength:50,noseProjection:50,mouthHeight:50}}
];
const labels={frontHair:'前发',backHair:'后发',sideHair:'侧发',braid:'发辫 / 马尾',expression:'表情',gender:'性别',hair:'发型',clothes:'服饰',shoes:'鞋履',skin:'肤色',eyeColor:'瞳孔颜色',hairColor:'发色',shirt:'上装颜色',pants:'下装 / 鞋履颜色'};
let state={...defaults}, activeTab='body', currentView='full', model, renderer, scene, camera, orbit;
const stage=$('#stage');
let humanReady=false,buildRequest=0;
const presetLoading=element('div','model-loading','正在生成角色…');
function choicesFor(key){return hairChoices[key]?hairOptionsFor(key,state.gender):choices[key];}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2400);}
function normalize(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('无效角色');
 const out={...defaults};
 for(const key of Object.keys(defaults)){
  const v=value[key];
  if(key==='name'&&typeof v==='string')out[key]=v.trim().slice(0,32)||'新角色';
  else if(ranges[key]&&typeof v==='number'&&Number.isFinite(v))out[key]=Math.max(bounds(key)[0],Math.min(bounds(key)[1],v));
  else if(choices[key]&&choices[key].some(c=>c[0]===v))out[key]=v;
  else if(palettes[key]&&typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))out[key]=v;
 }
 // Old complete hairstyles migrate to editable sections; clothing becomes shirt + pants.
 if(!Object.hasOwn(value,'frontHair')){
  if(value.hair==='bald')Object.assign(out,{frontHair:'none',backHair:'none',sideHair:'none',braid:'none'});
  else if(value.hair==='longPreset'||value.hair==='long')Object.assign(out,{frontHair:'straight',backHair:'long',sideHair:'long'});
  else if(value.hair==='bobPreset'||value.hair==='bob')Object.assign(out,{frontHair:'straight',backHair:'bob',sideHair:'short'});
  else if(value.hair==='wavePreset')Object.assign(out,{frontHair:'swept',backHair:'bob',braid:'single'});
  else if(value.gender==='female'&&value.hair==='source')Object.assign(out,{frontHair:'parted',backHair:'short',braid:'double'});
 }
 return filterHairForGender(out);
}
function element(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
let buildTimer;
function update(){ $('#display-name').textContent=state.name;if(!buildTimer)buildTimer=setTimeout(()=>{buildTimer=null;buildCharacter();},80); }
let selectedFaceGroup='eyes',directFaceEdit=false;
const openCards=new Set(['contour','eyes','proportions']),dragModes=new Map(),undoStates=[],redoStates=[];
let faceBaseline={...defaults},bodyBaseline={...defaults};
function remember(){const previous=undoStates.at(-1);if(!previous||JSON.stringify(previous)!==JSON.stringify(state))undoStates.push({...state});if(undoStates.length>40)undoStates.shift();redoStates.length=0;syncUndo();}
function syncUndo(){const u=$('#face-undo'),r=$('#face-redo');if(u)u.disabled=!undoStates.length;if(r)r.disabled=!redoStates.length;}
function patch(values){for(const [key,value] of Object.entries(values))if(ranges[key])state[key]=clampValue(value,...bounds(key));syncFields();update();}
function syncFields(){for(const key of Object.keys(ranges)){const input=$('#control-'+key),number=$('#number-'+key),output=document.querySelector('[data-value="'+key+'"]');if(input)input.value=state[key];if(number)number.value=state[key];if(output)output.textContent=state[key];}for(const pad of document.querySelectorAll('.drag-pad'))paintPad(pad);}
function selectGroup(id){selectedFaceGroup=id;document.querySelectorAll('.part-card').forEach(card=>card.classList.toggle('editing',card.dataset.group===id));}
function beginDirectEdit(){if(!['face','body'].includes(activeTab))return;directFaceEdit=true;motionMode='rest';motionTime=0;motionPlaying=false;syncMotionControls();if(orbit){orbit.autoRotate=false;$('#rotate').classList.remove('selected');orbit.enabled=false;}setView(activeTab==='face'?'face':'full');const b=$('#direct-face');if(b){b.classList.add('selected');b.setAttribute('aria-pressed','true');}syncHandleVisibility();}
function finishDirectEdit(){directFaceEdit=false;if(orbit)orbit.enabled=true;const b=$('#direct-face');if(b){b.classList.remove('selected');b.setAttribute('aria-pressed','false');}syncHandleVisibility();}
function paintPad(pad){const group=[...faceEditorGroups,...bodyEditorGroups].find(g=>g.id===pad.dataset.group),axis=group.axes[dragModes.get(group.id)||0],dot=pad.querySelector('.pad-dot');dot.style.left=(15+(state[axis[0]]+50)/200*70)+'%';dot.style.top=(85-(state[axis[1]]+50)/200*70)+'%';pad.querySelector('.pad-value').textContent=axis[2]+' '+state[axis[0]]+' / '+axis[3]+' '+state[axis[1]];}
function makePad(group){
 const wrap=element('div','part-drag'),switches=element('div','axis-switch');
 const pad=element('div','drag-pad');pad.dataset.group=group.id;pad.tabIndex=0;pad.setAttribute('role','group');pad.setAttribute('aria-label',group.title+'二维拖拽调整');pad.append(element('span','pad-cross'),element('span','pad-dot'),element('span','pad-value'));
 const description=element('div','pad-axis-labels');
 const setMode=i=>{dragModes.set(group.id,i);switches.querySelectorAll('button').forEach((b,j)=>b.classList.toggle('selected',i===j));const axis=group.axes[i];description.textContent='横向：'+axis[2]+' · 纵向：'+axis[3];paintPad(pad);};
 group.axes.forEach((axis,i)=>{const b=element('button',null,i===0?'位置 / 轮廓':'形状 / 深度');b.type='button';b.onclick=()=>{selectGroup(group.id);setMode(i);};switches.append(b);});
 bindDrag(pad,{read:()=>state,axis:()=>group.axes[dragModes.get(group.id)||0],write:patch,begin:()=>{remember();selectGroup(group.id);beginDirectEdit();},paint:()=>paintPad(pad)});
 pad.onkeydown=e=>{const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];if(!direction)return;e.preventDefault();remember();const axis=group.axes[dragModes.get(group.id)||0],step=e.shiftKey?1:5;patch({[axis[0]]:state[axis[0]]+direction[0]*step,[axis[1]]:state[axis[1]]+direction[1]*step});};
 wrap.append(switches,pad,description);setMode(dragModes.get(group.id)||0);return wrap;
}
function renderField(key){
 const wrap=element('div','field'),label=element('label','field-title',ranges[key]?.[0]||labels[key]||'角色名称');label.htmlFor='control-'+key;wrap.append(label);
 if(key==='name'){const input=element('input','name-input');input.id='control-'+key;input.maxLength=32;input.value=state.name;input.oninput=()=>{state.name=input.value;$('#display-name').textContent=state.name||'新角色';};wrap.append(input);}
 else if(ranges[key]){
  const [min,max]=bounds(key),output=element('output','scrub-value',state[key]);output.dataset.value=key;output.title='横向拖动调整，Shift 微调';label.append(output);
  bindDrag(output,{read:()=>({...state,__scrub:50}),axis:()=>[key,'__scrub'],write:values=>patch({[key]:values[key]}),begin:remember});
  const row=element('div','range-row'),input=element('input');input.id='control-'+key;input.type='range';input.min=min;input.max=max;input.step=1;input.value=state[key];input.onpointerdown=remember;input.onkeydown=e=>{if(e.key.startsWith('Arrow'))remember();};input.oninput=()=>patch({[key]:Number(input.value)});
  const number=element('input','parameter-number');number.id='number-'+key;number.type='number';number.min=min;number.max=max;number.step=1;number.value=state[key];number.setAttribute('aria-label',(ranges[key][0])+'数值');number.onfocus=remember;number.oninput=()=>{if(Number.isFinite(number.valueAsNumber))patch({[key]:number.valueAsNumber});};number.onchange=()=>{if(Number.isFinite(number.valueAsNumber))patch({[key]:number.valueAsNumber});else syncFields();};
  row.append(input,number);wrap.append(row);const ends=element('div','range-labels');ends.append(element('span',null,ranges[key][1]),element('span',null,ranges[key][2]));wrap.append(ends);
 }else{
  const box=element('div',palettes[key]?'swatches':key==='gender'?'segmented':'options');for(const [value,text] of palettes[key]?.map(c=>[c,c])||choicesFor(key)){
   const button=element('button',palettes[key]?'swatch':'option',palettes[key]?undefined:text);button.classList.toggle('selected',state[key]===value);button.setAttribute('aria-label',labels[key]+' '+text);button.setAttribute('aria-pressed',String(state[key]===value));if(palettes[key])button.style.setProperty('--color',value);
   button.onclick=()=>{remember();state[key]=value;if(key==='gender'){state=normalize(state);finishDirectEdit();faceBaseline={...state};bodyBaseline={...state};}if(palettes[key])applyHumanColors(model,state);else update();renderControls();};box.append(button);
  }
  if(palettes[key]){const custom=element('button','custom-color','HSL '+state[key].toUpperCase());custom.style.setProperty('--color',state[key]);custom.setAttribute('aria-label','打开'+labels[key]+' HSL 色板');custom.onclick=()=>{remember();openHslPicker(labels[key],state[key],color=>{state[key]=color;applyHumanColors(model,state);custom.textContent='HSL '+color.toUpperCase();custom.style.setProperty('--color',color);box.querySelectorAll('.swatch').forEach(b=>{const selected=b.getAttribute('aria-label')===labels[key]+' '+color;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});});};box.append(custom);}wrap.append(box);
 }
 return wrap;
}
function renderControls(){
 const [num,title,desc,fields]=tabs[activeTab];$('#section-number').textContent=num;$('#section-title').textContent=title;$('#section-desc').textContent=desc;$('#controls').replaceChildren();$('#controls').classList.toggle('face-control-panel',['face','body'].includes(activeTab));
 if(activeTab==='hair'){
  const wrap=element('div','field'),box=element('div','options');wrap.append(element('div','field-title','经典发型组合'));for(const preset of classicHairPresets.filter(p=>!p.gender||p.gender===state.gender)){const b=element('button','option',preset.label);b.classList.toggle('selected',Object.entries(preset.values).every(([k,v])=>state[k]===v));b.onclick=()=>{remember();Object.assign(state,preset.values,{frontLength:50,backLength:50,sideLength:50,braidLength:50,hairVolume:50});update();renderControls();setView('face');};box.append(b);}wrap.append(box);const note=element('p','reference-note','基于作者原模型分区。 ');for(const preset of classicHairPresets.filter(p=>p.reference&&p.gender===state.gender)){const a=element('a',null,preset.label+'来源 ');a.href=preset.reference;a.target='_blank';a.rel='noopener';note.append(a);}const allRefs=element('a',null,'全部模型来源');allRefs.href='https://github.com/GioGyan90/CharaBuilder/blob/main/HAIR_REFERENCES.md';allRefs.target='_blank';allRefs.rel='noopener';note.append(allRefs);wrap.append(note);$('#controls').append(wrap);
 }
 if(activeTab==='face'){
  const wrap=element('div','field face-presets'),box=element('div','options');wrap.append(element('div','field-title','脸型预设'));for(const preset of facePresets.filter(p=>!p.gender||p.gender===state.gender)){const b=element('button','option',preset.label);b.classList.toggle('selected',Object.entries(preset.values).every(([k,v])=>state[k]===v));b.onclick=()=>{remember();Object.assign(state,faceNeutral,preset.values);faceBaseline={...state};update();renderControls();setView('face');};box.append(b);}wrap.append(box);$('#controls').append(wrap);
 }
 if(activeTab==='body'||activeTab==='face'){
  if(activeTab==='body')$('#controls').append(renderField('name'),renderField('gender'));
  const toolbar=element('div','face-toolbar'),drag=element('button',directFaceEdit?'selected':'','直接拖拽');drag.id='direct-face';drag.setAttribute('aria-pressed',String(directFaceEdit));drag.onclick=()=>directFaceEdit?finishDirectEdit():beginDirectEdit();
  const undo=element('button',null,'撤销'),redo=element('button',null,'重做');undo.id='face-undo';redo.id='face-redo';undo.onclick=()=>{if(!undoStates.length)return;redoStates.push({...state});state=undoStates.pop();update();renderControls();};redo.onclick=()=>{if(!redoStates.length)return;undoStates.push({...state});state=redoStates.pop();update();renderControls();};toolbar.append(drag,undo,redo);
  $('#controls').append(toolbar,element('p','face-help',activeTab==='face'?'自由范围 −50～150 · 双侧同步调整\n拖动卡片或脸部点位，Shift 微调；瞳孔保持原始比例。':'31 项体型参数 · 自由范围 −50～150\n拖动卡片或身体点位，Shift 微调；关闭直接拖拽可旋转查看。'));
  const groups=activeTab==='face'?faceEditorGroups:bodyEditorGroups,baseline=activeTab==='face'?faceBaseline:bodyBaseline;
  for(const group of groups){const keys=group.keys.filter(k=>fields.includes(k)&&!(k==='expression'&&state.faceSource==='authored'));if(!keys.length)continue;
   const card=element('details','part-card');card.dataset.group=group.id;card.open=openCards.has(group.id);card.classList.toggle('editing',selectedFaceGroup===group.id);const summary=element('summary');summary.append(element('span',null,group.title),element('small',null,keys.length+' 项'));
   const reset=element('button','part-reset','重置');reset.setAttribute('aria-label','重置'+group.title);reset.onclick=e=>{e.preventDefault();e.stopPropagation();remember();for(const key of keys)state[key]=baseline[key]??defaults[key];applyHumanColors(model,state);syncFields();update();renderControls();};summary.append(reset);card.append(summary);
   card.ontoggle=()=>{if(card.open){openCards.add(group.id);selectGroup(group.id);}else openCards.delete(group.id);};const content=element('div','part-content');if(group.axes.length)content.append(makePad(group));keys.forEach(k=>content.append(renderField(k)));card.append(content);$('#controls').append(card);
  }
  syncUndo();syncHandleVisibility();return;
 }
 for(const key of fields.filter(k=>!(state.gender==='male'&&(k==='braid'||k==='braidLength'))&&!(activeTab==='clothes'&&state.clothes==='underwear'&&(wardrobeRanges[k]||(k==='shirt'&&state.gender==='male')))))$('#controls').append(renderField(key));syncHandleVisibility();
}
const handleLayer=element('div','face-handles'),bodyHandleLayer=element('div','face-handles');stage.append(handleLayer,bodyHandleLayer);
const handleButtons=[],bodyHandleButtons=[];
function addHandles(layer,buttons,ids,groups,glyphs){
 for(const id of ids){const group=groups.find(g=>g.id===id),b=element('button','face-handle',glyphs[id]);b.setAttribute('aria-label','拖拽调整'+group.title);b.type='button';layer.append(b);buttons.push(b);
  bindDrag(b,{read:()=>state,axis:()=>group.axes[dragModes.get(group.id)||0],side:()=>Number(b.dataset.side)||1,write:patch,begin:()=>{remember();selectGroup(group.id);beginDirectEdit();const card=document.querySelector('[data-group="'+group.id+'"].part-card');if(card){card.open=true;openCards.add(group.id);card.scrollIntoView({block:'nearest',behavior:'smooth'});}}});
 }
}
addHandles(handleLayer,handleButtons,['eyes','eyes','brows','nose','mouth','contour'],faceEditorGroups,{eyes:'眼',brows:'眉',nose:'鼻',mouth:'嘴',contour:'颌'});
addHandles(bodyHandleLayer,bodyHandleButtons,bodyEditorGroups.filter(g=>g.axes.length).map(g=>g.id),bodyEditorGroups,{proportions:'身',shoulderBody:'肩',chestBody:'胸',waistBody:'腰',pelvisBody:'胯',armsBody:'臂',legsBody:'腿',feetBody:'脚'});
function syncHandleVisibility(){const ready=directFaceEdit&&model&&camera&&renderer&&orbit;handleLayer.hidden=!(ready&&activeTab==='face'&&currentView==='face');bodyHandleLayer.hidden=!(ready&&activeTab==='body'&&currentView==='full');}
function updateFaceHandles(){syncHandleVisibility();if(handleLayer.hidden&&bodyHandleLayer.hidden)return;model.updateMatrixWorld(true);const handles=activeTab==='face'?model.userData.faceHandles:model.userData.bodyHandles,buttons=activeTab==='face'?handleButtons:bodyHandleButtons;
 handles?.forEach((h,i)=>{const p=new THREE.Vector3(...h.position).applyMatrix4(model.matrixWorld).project(camera),b=buttons[i];b.style.left=((p.x+1)*.5*stage.clientWidth)+'px';b.style.top=((-p.y+1)*.5*stage.clientHeight)+'px';b.dataset.side=String(h.side);b.classList.toggle('selected',h.group===selectedFaceGroup);});
}
function material(color){return new THREE.MeshStandardMaterial({color,roughness:.75});}
async function buildCharacter(){
  if(!scene || !humanReady)return;
  const request=++buildRequest,snapshot={...state};let succeeded=false;
  presetLoading.textContent='正在生成角色…';presetLoading.classList.remove('failed');presetLoading.onclick=null;
  const timer=setTimeout(()=>{if(request===buildRequest)stage.append(presetLoading);},150);
  try {
    await ensureHumanPresets(snapshot);
    if(request!==buildRequest)return;
    const next=createHuman(snapshot);applyHumanColors(next,state);
    if(model){scene.remove(model);disposeHuman(model);}
    model=next;scene.add(model);succeeded=true;
    if(currentView==='face' && orbit){orbit.target.y=model.userData.faceY;orbit.update();}else if(currentView==='full'&&directFaceEdit&&activeTab==='body')setView('full');
  }catch(error){if(request===buildRequest){console.error(error);toast('预设加载失败，可点击预览中的提示重试');presetLoading.textContent='预设加载失败，点击重试';presetLoading.classList.add('failed');presetLoading.onclick=()=>buildCharacter();stage.append(presetLoading);}}
  finally{clearTimeout(timer);if(request===buildRequest && succeeded)presetLoading.remove();}
}
let motionMode='relaxed',motionPlaying=true,motionTime=0,motionSpeed=1,lastFrame=null;
function setView(view){currentView=view;if(!camera||!orbit)return;
  if(view==='face'){const y=model?.userData.faceY||2.02;camera.position.set(0,y+.015,.95);orbit.target.set(0,y,.06);}
  else{const h=model?.userData.height||2.2,distance=Math.max(3.8,h/(2*Math.tan(camera.fov*Math.PI/360))*1.22);camera.position.set(directFaceEdit?0:.25,h*.54,distance);orbit.target.set(0,h*.52,0);}
  orbit.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
}

try{scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(36,1,.05,100);renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;stage.append(renderer.domElement);orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=.65;orbit.maxDistance=7;orbit.maxPolarAngle=Math.PI*.52;scene.add(new THREE.HemisphereLight('#e4eeff','#4b4150',1.1));const key=new THREE.DirectionalLight('#ffe6c7',1.4);key.position.set(3,5,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);const rim=new THREE.DirectionalLight('#a6c4ff',.6);rim.position.set(-3,3,-2);scene.add(rim);const floor=new THREE.Mesh(new THREE.CylinderGeometry(.8,.84,.08,64),material('#434b55'));floor.position.y=-.045;floor.receiveShadow=true;scene.add(floor);new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(stage);setView('full');renderer.setAnimationLoop(now=>{const dt=lastFrame===null?0:Math.min(.05,(now-lastFrame)/1000);lastFrame=now;if(motionPlaying)motionTime+=dt*motionSpeed;updateCharacterMotion(model,motionTime,motionMode);orbit.update();renderer.render(scene,camera);updateFaceHandles();});}catch(error){console.error(error);$('#webgl-error').hidden=false;}
const storageKey='charabuilder.characters.v1';
function readArchive(){const raw=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(raw))throw Error('档案格式错误');return raw;}
function showArchive(){try{const rows=readArchive();$('#saved-list').replaceChildren();if(!rows.length)$('#saved-list').append(element('p',null,'还没有角色，点击「保存角色」创建档案。'));for(const row of rows){const div=element('div','save-row'),name=element('span',null,row.character.name);name.append(element('small',null,new Date(row.savedAt).toLocaleString()));const load=element('button',null,'载入'),del=element('button',null,'删除');load.onclick=()=>{state=normalize(row.character);faceBaseline={...state};bodyBaseline={...state};update();renderControls();setView(currentView);$('#archive').close();toast('角色已载入');};del.onclick=()=>{if(!confirm('删除这份角色档案？'))return;try{localStorage.setItem(storageKey,JSON.stringify(readArchive().filter(r=>r.id!==row.id)));showArchive();}catch{toast('无法更新档案');}};div.append(name,load,del);$('#saved-list').append(div);}if(!$('#archive').open)$('#archive').showModal();}catch{toast('无法读取浏览器档案，请检查浏览器存储设置');}}
$('#save').onclick=()=>{try{state=normalize(state);const rows=readArchive();rows.unshift({id:crypto.randomUUID(),savedAt:new Date().toISOString(),character:{...state}});localStorage.setItem(storageKey,JSON.stringify(rows));toast('角色已保存到本机档案');}catch{toast('保存失败，请导出 JSON 文件备份');}};
$('#load').onclick=showArchive;$('#close').onclick=()=>$('#archive').close();
$('#export').onclick=()=>{const data={format:'charabuilder',version:1,character:normalize(state)};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=element('a');a.href=url;a.download=(state.name||'character').replace(/[\\/:*?"<>|]/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('过大');const data=JSON.parse(await file.text());if(data.format!=='charabuilder'||data.version!==1||!data.character)throw Error('格式');state=normalize(data.character);faceBaseline={...state};bodyBaseline={...state};update();renderControls();setView(currentView);$('#archive').close();toast('角色文件已导入，可继续编辑');}catch{toast('导入失败：请选择有效的 CharaBuilder JSON 文件');}finally{e.target.value='';}};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{finishDirectEdit();activeTab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));renderControls();setView(activeTab==='face'?'face':'full');});document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(b.dataset.view==='full')finishDirectEdit();setView(b.dataset.view);});$('#reset-view').onclick=()=>{motionMode='rest';motionTime=0;syncMotionControls();if(orbit){orbit.autoRotate=false;$('#rotate').classList.remove('selected');$('#rotate').setAttribute('aria-pressed','false');}setView(currentView);};$('#rotate').onclick=()=>{if(!orbit)return;if(directFaceEdit)finishDirectEdit();orbit.autoRotate=!orbit.autoRotate;$('#rotate').setAttribute('aria-pressed',String(orbit.autoRotate));$('#rotate').classList.toggle('selected',orbit.autoRotate);};$('#reset').onclick=()=>{if(!confirm('重置当前未保存的调整？'))return;remember();state={...defaults};faceBaseline={...state};bodyBaseline={...state};finishDirectEdit();update();renderControls();setView('full');};$('#random').onclick=()=>{remember();finishDirectEdit();for(const key of Object.keys(ranges))state[key]=Math.round(20+Math.random()*60);for(const key of Object.keys(choices)){const values=choicesFor(key);state[key]=values[Math.floor(Math.random()*values.length)][0];}state=normalize(state);for(const [key,values] of Object.entries(palettes))state[key]=values[Math.floor(Math.random()*values.length)];update();renderControls();setView(currentView);};
update();renderControls();

const loading=element('div','model-loading','正在载入日漫角色…');stage.append(loading);
try{await loadHumanAssets();humanReady=true;await buildCharacter();setView(currentView);loading.remove();}
catch(error){console.error(error);loading.textContent='日漫模型加载失败，请刷新重试。'+error.message;loading.classList.add('failed');}

function syncMotionControls(){const select=$('#motion-select');if(select)select.value=motionMode;$('#motion-pause').textContent=motionPlaying?'暂停动作':'播放动作';$('#motion-pause').setAttribute('aria-pressed',String(!motionPlaying));$('#motion-source').textContent=motionPresets.some(p=>p.id===motionMode)?'CC0 动作 / Quaternius':'项目原有程序动作';}
const motionSelect=$('#motion-select');
for(const preset of [...motionPresets,{id:'idle',label:'轻微呼吸'},{id:'inspect',label:'查看身体'},{id:'rest',label:'静止编辑姿势'}]){const option=element('option',null,preset.label);option.value=preset.id;motionSelect.append(option);}
motionSelect.onchange=()=>{finishDirectEdit();motionMode=motionSelect.value;motionTime=0;motionPlaying=true;syncMotionControls();setView('full');};
$('#motion-speed').onchange=e=>{motionSpeed=Number(e.target.value);};
$('#motion-pause').onclick=()=>{motionPlaying=!motionPlaying;syncMotionControls();};syncMotionControls();


$('#motion-restart').onclick=()=>{motionTime=0;motionPlaying=true;if(model?.userData.motionPlayback)model.userData.motionPlayback.mode=null;syncMotionControls();};
