import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=fileURLToPath(new URL('../dist/',import.meta.url));
const {parameterDefaults,parameterRanges,faceAdjustmentKeys,bodyAdjustmentKeys}=await import(pathToFileURL(dir+'parameters.js').href);
const {wardrobeDefaults,wardrobeRanges}=await import(pathToFileURL(dir+'wardrobe.js').href);
const hairText=await fs.readFile(dir+'hair.js','utf8');
const hairDefinition=hairText.slice(hairText.indexOf('export const hairDefaults'),hairText.indexOf('const skullCache')).replaceAll('export ','');
const {hairDefaults,hairChoices,hairRanges,hairOptionsFor,filterHairForGender}=new Function(hairDefinition+'return {hairDefaults,hairChoices,hairRanges,hairOptionsFor,filterHairForGender};')();
const text=await fs.readFile(dir+'app.js','utf8');const prefix=text.slice(text.indexOf('const defaults ='),text.indexOf('let state='));const choice=text.slice(text.indexOf('function choicesFor('),text.indexOf('let toastTimer;'));const normalize=text.slice(text.indexOf('function normalize('),text.indexOf('function element('));
const normalizeState=new Function('parameterDefaults','parameterRanges','wardrobeDefaults','wardrobeRanges','hairDefaults','hairChoices','hairRanges','hairOptionsFor','filterHairForGender',prefix+'let state={...defaults};'+choice+normalize+'return normalize;')(parameterDefaults,parameterRanges,wardrobeDefaults,wardrobeRanges,hairDefaults,hairChoices,hairRanges,hairOptionsFor,filterHairForGender);
for(const gender of ['male','female'])for(const [frontHair] of hairOptionsFor('frontHair',gender))for(const [backHair] of hairOptionsFor('backHair',gender))for(const [sideHair] of hairOptionsFor('sideHair',gender))for(const [braid] of hairOptionsFor('braid',gender)){
 const expected={name:'分区存档',gender,frontHair,backHair,sideHair,braid,shirtLength:73,pantsWidth:31};
 const actual=normalizeState(JSON.parse(JSON.stringify(expected)));
 for(const [k,v] of Object.entries(expected))if(actual[k]!==v)throw Error('roundtrip '+k);
 if(actual.clothes!=='shirtPants')throw Error('clothes');
}
for(const key of Object.keys({...parameterDefaults,...wardrobeDefaults,...hairRanges})){
 if(normalizeState({})[key]!==(key==='jawWidth'?45:50))throw Error('default '+key);
 if(normalizeState({[key]:999})[key]!==(['craniumWidth','craniumDepth','facePlaneSoftness'].includes(key)?100:bodyAdjustmentKeys.includes(key)?200:faceAdjustmentKeys.includes(key)?150:100))throw Error('upper bound');
 if(normalizeState({[key]:-999})[key]!==(['craniumWidth','craniumDepth','facePlaneSoftness'].includes(key)?0:bodyAdjustmentKeys.includes(key)?-100:faceAdjustmentKeys.includes(key)?-50:0))throw Error('lower bound');
 if(normalizeState({[key]:NaN})[key]!==(key==='jawWidth'?45:50))throw Error('finite guard');
}
for(const gender of ['female','male'])for(const clothes of ['shirtPants','underwear'])for(const shoes of ['shoes','barefoot']){
 const actual=normalizeState(JSON.parse(JSON.stringify({gender,clothes,shoes})));
 if(actual.gender!==gender||actual.clothes!==clothes||actual.shoes!==shoes)throw Error('clothes/footwear roundtrip');
}
const bald=normalizeState({gender:'female',hair:'bald',clothes:'classicPreset',height:70});
if(bald.frontHair!=='none'||bald.backHair!=='none'||bald.sideHair!=='none'||bald.braid!=='none'||bald.height!==70||bald.clothes!=='shirtPants')throw Error('legacy bald');
if(normalizeState({hair:'longPreset'}).backHair!=='long')throw Error('legacy long');
if(normalizeState({hair:'bobPreset'}).backHair!=='bob')throw Error('legacy bob');
const partial=normalizeState({frontHair:'swept',backHair:'long',braid:'double',gender:'female'});
if(normalizeState({...partial,gender:'male'}).braid!=='none')throw Error('male gender switch retained female ponytail');
for(const gender of ['male','female'])for(const key of ['frontHair','backHair','sideHair','braid'])for(const [value] of hairChoices[key]){const result=normalizeState({gender,[key]:value});if(!hairOptionsFor(key,gender).some(([v])=>v===result[key]))throw Error('hidden hairstyle retained '+gender+' '+key);}
for(const value of ['buzz','crew','flattop','crop'])for(const gender of ['male','female'])if(!hairOptionsFor('frontHair',gender).some(([v])=>v===normalizeState({gender,frontHair:value}).frontHair))throw Error('removed experimental style migration');
console.log('PASS all modular hairstyle archive roundtrips, parameter bounds, legacy migration and gender switch');

for(const key of ['skin','hairColor','eyeColor','shirt','pants','shoeColor'])for(const color of ['#14a3ef','#7A225D','#ffffff','#000000'])if(normalizeState({[key]:color})[key]!==color)throw Error('custom color archive '+key);
if(normalizeState({}).eyeColor!=='#806449')throw Error('legacy iris default');
console.log('PASS all six custom color archive fields and legacy iris default');

if(normalizeState({pants:'#14a3ef'}).shoeColor!=='#14a3ef')throw Error('legacy shoe color migration');
const independent=normalizeState({pants:'#14a3ef',shoeColor:'#aabbcc'});if(independent.pants!=='#14a3ef'||independent.shoeColor!=='#aabbcc')throw Error('independent footwear color archive');

for(const jaw of [-50,22,45,50,150]){
 const old=normalizeState({jaw});if(old.jawWidth!==jaw||Object.hasOwn(old,'jaw'))throw Error('legacy jaw migration');
 for(const key of ['jawDepth','jawHeight','jawAngle','cheekboneWidth','cheekboneHeight','cheekboneDepth','chinProjection'])if(old[key]!==50)throw Error('legacy structural default '+key);
 const roundtrip=normalizeState(JSON.parse(JSON.stringify({...old,jawDepth:81,cheekboneDepth:19,chinProjection:72})));
 if(roundtrip.jawWidth!==jaw||roundtrip.jawDepth!==81||roundtrip.cheekboneDepth!==19||roundtrip.chinProjection!==72)throw Error('structure archive');
}
if(normalizeState({jaw:22,jawWidth:83}).jawWidth!==83)throw Error('new jaw width must take precedence');
console.log('PASS legacy jaw migration, new-key precedence and independent face structure archive');

for(const stoneView of ['clay','skin'])if(normalizeState(JSON.parse(JSON.stringify({gender:'male',faceSource:'stone',stoneView}))).stoneView!==stoneView)throw Error('Stone surface view archive');
if(normalizeState({stoneView:'invalid'}).stoneView!=='skin')throw Error('Stone surface view fallback');
console.log('PASS Stone clay/skin view archive and invalid-value fallback');

for(const bodySource of ['vroid','stone'])for(const faceSource of ['vroid','authored','stone']){
 const value={gender:'male',bodySource,faceSource};const result=normalizeState(JSON.parse(JSON.stringify(value)));
 for(const key of Object.keys(value))if(result[key]!==value[key])throw Error('independent head/body archive '+key);
}
if(normalizeState({gender:'male',faceSource:'stone'}).bodySource!=='stone')throw Error('legacy Stone foundation migration');
if(normalizeState({gender:'female',bodySource:'stone',faceSource:'stone'}).bodySource!=='vroid'||normalizeState({gender:'female',faceSource:'stone'}).faceSource!=='vroid')throw Error('female foundation guard');
console.log('PASS independent foundations, legacy Stone migration and gender switch');

for(const key of ['frontHair','backHair','sideHair'])if(normalizeState({gender:'male',faceSource:'stone',[key]:'stoneRef'})[key]!=='none')throw Error('legacy placeholder hair migration');

if(normalizeState({sideHairColor:'#b8c0bd'}).sideHairColor!=='#b8c0bd')throw Error('temple color archive lost');
console.log('PASS independent temple hair color archive');

for(const key of ['cheekboneAngle','jawTilt','chinAngle'])for(const value of [-50,50,150])if(normalizeState({[key]:value})[key]!==value)throw Error('angle archive lost '+key);
console.log('PASS independent regional angle export/import values');

const imported=normalizeState({gender:'male',bodySource:'vroid',faceSource:'imported00003',frontHair:'imported00003',sideHair:'none',backHair:'imported00003'});
assert.equal(imported.faceSource,'imported00003');assert.equal(imported.bodySource,'vroid');
for(const key of ['frontHair','sideHair','backHair'])assert.equal(normalizeState(JSON.parse(JSON.stringify(imported)))[key],imported[key]);
assert.equal(normalizeState({...imported,gender:'female'}).faceSource,'vroid');
console.log('PASS imported head and independent extracted hair archive roundtrip, with female fallback');

for(const key of ['maxillaDepth','templeWidth','jawWidth']){
 assert.equal(normalizeState({gender:'male',faceSource:'imported00003',[key]:150})[key],100);
 assert.equal(normalizeState({gender:'male',faceSource:'imported00003',[key]:-50})[key],0);
}
for(const faceStructureView of ['skin','regions','wire'])assert.equal(normalizeState({gender:'male',faceSource:'imported00003',faceStructureView}).faceStructureView,faceStructureView);
console.log('PASS imported structural edit bounds and inspection view archive roundtrip');

for(const key of ['eyeballDepth','pupilSize','gazeX','gazeY','browWidth','upperLipThickness','lowerLipThickness','upperLipProjection','lowerLipProjection']){
 const state=normalizeState({gender:'male',faceSource:'imported00003',[key]:73});assert.equal(state[key],73);assert.equal(normalizeState(JSON.parse(JSON.stringify(state)))[key],73);
}
console.log('PASS eye, brow and independent lip parameter archive roundtrips');

const foundation=normalizeState({gender:'male',faceSource:'foundation',bodySource:'stone',stoneView:'clay',faceStructureView:'wire'});
assert.equal(foundation.faceSource,'foundation');
assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(foundation))),foundation);
assert.equal(normalizeState({...foundation,gender:'female'}).faceSource,'vroid');
console.log('PASS continuous foundation archive roundtrip and female fallback');

const painted=normalizeState({...foundation,stoneView:'painted'});
assert.equal(painted.stoneView,'painted');
assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(painted))),painted);
console.log('PASS painted face archive roundtrip');

for(const key of ['jawRamus','jawBase','masseter','neckForward','neckTendon','browSurfaceOffset']){const s=normalizeState({...foundation,[key]:78});assert.equal(normalizeState(JSON.parse(JSON.stringify(s)))[key],78);}

for(const key of ['muzzleDepth','philtrumDepth','philtrumLength']){const s=normalizeState({...foundation,[key]:78});assert.equal(normalizeState(JSON.parse(JSON.stringify(s)))[key],78);}

for(const key of ['midfaceSupport','jawBodySupport']){const s=normalizeState({...foundation,[key]:78});assert.equal(normalizeState(JSON.parse(JSON.stringify(s)))[key],78);}

for(const [characterType,gender,faceSource,bodySource] of [['boy','male','vroid','vroid'],['girl','female','vroid','vroid'],['man','male','imported00003','stone']]){
 const a=normalizeState({characterType,foundationRevision:1,jawWidth:67,stoneView:'clay'});
 assert.equal(a.gender,gender);assert.equal(a.faceSource,faceSource);assert.equal(a.bodySource,bodySource);
 assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(a))),a);
}
assert.throws(()=>normalizeState({characterType:'woman',foundationRevision:1}),/尚未建立/);
assert.equal(normalizeState({characterType:'man',foundationRevision:1,faceSource:'foundation'}).faceSource,'imported00003');
console.log('PASS explicit foundation identities, adult source isolation and pending adult-female guard');

for(const key of ['lowerTrapezius', 'scapulaSpine', 'scapulaAngle', 'rearAxillary', 'latTaper', 'erectorSpinae']){const state=normalizeState({characterType:"man",foundationRevision:1,[key]:78});assert.equal(state[key],78);assert.equal(normalizeState(JSON.parse(JSON.stringify(state)))[key],78);assert.equal(normalizeState({characterType:"man",foundationRevision:1})[key],50);}
console.log("PASS six adult back structure archive fields and neutral defaults");

for(const key of ["scmSternal","scmClavicular","clavicleContour","supraclavicularFossa","napeTransition","throatVolume","neckTendon"]){const state=normalizeState({characterType:"man",foundationRevision:1,[key]:77});assert.equal(state[key],77);assert.equal(normalizeState(JSON.parse(JSON.stringify(state)))[key],77);assert.equal(normalizeState({characterType:"man",foundationRevision:1})[key],50);}
console.log("PASS neck attachment structure archive values and neutral defaults");

for(const key of ['craniumWidth','craniumDepth','facePlaneSoftness']){for(const value of [0,50,100]){const saved=normalizeState({characterType:'man',foundationRevision:1,[key]:value});assert.equal(saved[key],value);assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(saved))),saved);}assert.equal(normalizeState({[key]:-999})[key],0);assert.equal(normalizeState({[key]:999})[key],100);}
console.log('PASS adult cranium and surface controls bounded archive roundtrip');

for(const key of ['craniumWidth','eyeWidth','jawWidth','mouthHeight','upperLipThickness','scmSternal','clavicleContour'])for(const value of [0,50,100]){
 const c=normalizeState({characterType:'man',foundationRevision:2,faceSource:'foundation',[key]:value,stoneView:'painted'});
 assert.equal(c.faceSource,'stoneC');assert.equal(c.bodySource,'stone');assert.equal(c.foundationRevision,2);assert.equal(c[key],value);assert.equal(c.stoneView,'skin');assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(c))),c);
}
assert.equal(normalizeState({characterType:'boy',foundationRevision:2}).foundationRevision,1);
assert.equal(normalizeState({characterType:'girl',foundationRevision:2,faceSource:'stoneC'}).faceSource,'vroid');
assert.ok(!text.includes('载入完整 Stone 预设')&&!text.includes('试用 Stone 面部贴图')&&!text.includes('载入连续素体验证'));
assert.ok(!text.includes('const paintedFacePreset=')&&!text.includes("label:'Stone · 硬朗熟男脸'"));
console.log('PASS C foundation v2 archive, old revisions, independent groups and removed Stone trial entries');

const switchCode=text.slice(text.indexOf('function switchFoundation('),text.indexOf('function patch('));
const manFactory=new Function('parameterDefaults','parameterRanges','wardrobeDefaults','wardrobeRanges','hairDefaults','hairChoices','hairRanges','hairOptionsFor','filterHairForGender',prefix+`let state={...defaults},faceBaseline,bodyBaseline,motionMode,motionTime;const foundationDrafts=new Map();function finishDirectEdit(){}function syncMotionControls(){}function update(){}function renderControls(){}function setView(){}`+normalize+switchCode+`switchFoundation('man',{fresh:true});return state;`);
const man=manFactory(parameterDefaults,parameterRanges,wardrobeDefaults,wardrobeRanges,hairDefaults,hairChoices,hairRanges,hairOptionsFor,filterHairForGender);
const calibrated=JSON.parse(await fs.readFile(dir+'assets/anime/stone-c-defaults.json','utf8'));
for(const [key,v] of Object.entries(calibrated))if(typeof v==='number'&&Object.hasOwn(man,key))assert.equal(man[key],v,'new man differs from selected C: '+key);
for(const key of ['faceSource','skin','clothes','shoes','pants'])assert.equal(man[key],calibrated[key]);
console.log('PASS actual new-man UI action matches calibrated C defaults');

assert.ok(text.includes("'./motion.js?v=101'"),'motion must load the C-safe normal updater after a cached old session');
