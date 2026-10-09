import fs from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=fileURLToPath(new URL('../dist/',import.meta.url));
const {parameterDefaults,parameterRanges}=await import(pathToFileURL(dir+'parameters.js').href);
const {wardrobeDefaults,wardrobeRanges}=await import(pathToFileURL(dir+'wardrobe.js').href);
const hairText=await fs.readFile(dir+'hair.js','utf8');
const hairDefinition=hairText.slice(hairText.indexOf('export const hairDefaults'),hairText.indexOf('const skullCache')).replaceAll('export ','');
const {hairDefaults,hairChoices,hairRanges}=new Function(hairDefinition+'return {hairDefaults,hairChoices,hairRanges};')();
const text=await fs.readFile(dir+'app.js','utf8');const prefix=text.slice(text.indexOf('const defaults ='),text.indexOf('let state='));const choice=text.slice(text.indexOf('function choicesFor('),text.indexOf('let toastTimer;'));const normalize=text.slice(text.indexOf('function normalize('),text.indexOf('function element('));
const normalizeState=new Function('parameterDefaults','parameterRanges','wardrobeDefaults','wardrobeRanges','hairDefaults','hairChoices','hairRanges',prefix+'let state={...defaults};'+choice+normalize+'return normalize;')(parameterDefaults,parameterRanges,wardrobeDefaults,wardrobeRanges,hairDefaults,hairChoices,hairRanges);
for(const [frontHair] of hairChoices.frontHair)for(const [backHair] of hairChoices.backHair)for(const [sideHair] of hairChoices.sideHair)for(const [braid] of hairChoices.braid){
 const expected={name:'分区存档',gender:'male',frontHair,backHair,sideHair,braid,shirtLength:73,pantsWidth:31};
 const actual=normalizeState(JSON.parse(JSON.stringify(expected)));
 for(const [k,v] of Object.entries(expected))if(actual[k]!==v)throw Error('roundtrip '+k);
 if(actual.clothes!=='shirtPants')throw Error('clothes');
}
for(const key of Object.keys({...parameterDefaults,...wardrobeDefaults,...hairRanges})){
 if(normalizeState({})[key]!==50)throw Error('default '+key);
 if(normalizeState({[key]:123})[key]!==100)throw Error('upper bound');
 if(normalizeState({[key]:-123})[key]!==0)throw Error('lower bound');
 if(normalizeState({[key]:NaN})[key]!==50)throw Error('finite guard');
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
if(normalizeState({...partial,gender:'male'}).braid!=='double')throw Error('gender switch discarded hair sections');
console.log('PASS all modular hairstyle archive roundtrips, parameter bounds, legacy migration and gender switch');
