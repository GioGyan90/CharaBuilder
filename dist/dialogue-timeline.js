export const STORAGE_KEY = 'lucky-break:dialogue-2d:v1';
export const demoLines = [
  {text:'准备好了？',expression:'smile',motion:'tilt',at:0.2,duration:3},
  {text:'别紧张，先看清白球的位置。',expression:'neutral',motion:'nod',at:0.6,duration:5},
  {text:'对，就是这样。来一局吧！',expression:'smile',motion:'nod',at:0.4,duration:5},
];
export const motions = {
  none:{label:'无',duration:0}, blink:{label:'眨眼',duration:.32},
  nod:{label:'点头',duration:1.6}, tilt:{label:'歪头',duration:2.4},
  shake:{label:'摇头拒绝',duration:2.6}, lookAside:{label:'侧目观察',duration:3.6},
  shy:{label:'低头回避',duration:3.8}, recoil:{label:'惊讶后仰',duration:2.8},
  agree:{label:'连续点头',duration:2.7},
};
export const varietyLines = [
  {text:'不行，这一杆可不能这样打。',motion:'shake',expression:'neutral',duration:4,at:.2},
  {text:'嗯？那边好像有人在叫我。',motion:'lookAside',expression:'neutral',duration:4.5,at:.2},
  {text:'也……没有你说的那么厉害。',motion:'shy',expression:'smile',duration:4.5,at:.2},
  {text:'诶？！这球竟然进了！',motion:'recoil',expression:'surprise',duration:3.5,at:.2},
  {text:'嗯嗯！就是这个感觉。',motion:'agree',expression:'smile',duration:3.5,at:.2},
];
// Parameter values use the runtime's -30..30 head range, not physical degrees.
export function motionPose(id,t) {
  const out={x:0,y:0,z:0,gx:0,gy:0,blink:0,lid:1,expression:null};
  const length=motions[id]?.duration || 0;
  if(t<0 || t>=length)return out;
  const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
  const hold=(rise,fall)=>smooth(t/rise)*smooth((length-t)/fall);
  const pulse=(start,duration)=>t>=start && t<=start+duration?Math.sin((t-start)/duration*Math.PI):0;
  if(id==='blink')out.blink=pulse(0,.32);
  if(id==='nod')out.y=-18*pulse(0,1.6);
  if(id==='tilt')out.z=20*pulse(0,2.4);
  if(id==='shake'){const e=hold(.25,.45);out.x=25*Math.sin(t/length*Math.PI*5)*e;out.z=-4*Math.sin(t/length*Math.PI*5)*e;out.gx=-out.x/55;}
  if(id==='lookAside'){const e=hold(.65,.7);out.x=-26*e;out.z=-7*e;out.gx=-.7*e;out.gy=.12*e;}
  if(id==='shy'){const e=hold(.85,.8);out.y=-25*e;out.z=17*e;out.gx=.32*e;out.gy=-.65*e;out.lid=1-.4*e;out.expression='smile';}
  if(id==='recoil'){const e=hold(.18,1.1);out.y=26*e;out.x=8*e;out.z=-14*e;out.gy=.35*e;out.expression='surprise';}
  if(id==='agree'){out.y=-21*(pulse(.05,.65)+pulse(.9,.65)+pulse(1.75,.65));out.z=5*hold(.3,.5);out.expression='smile';}
  return out;
}
export function normalizeLines(lines) {
  return (Array.isArray(lines) && lines.length ? lines : demoLines).slice(0,20).map(line=>({
    text:String(line.text ?? '').slice(0,300),
    expression:['neutral','smile','surprise'].includes(line.expression)?line.expression:'neutral',
    motion:Object.hasOwn(motions,line.motion)?line.motion:'none',
    duration:Math.min(30,Math.max(1,Number(line.duration)||3)),
    at:Math.min(Math.min(30,Math.max(1,Number(line.duration)||3))-.1,Math.max(0,Number(line.at)||0)),
  }));
}
export function lineAt(time,settings,total=settings.duration) {
  const lines=settings.lines || demoLines, sum=lines.reduce((n,l)=>n+l.duration,0);
  const scaled=Math.max(0,time)/total*sum;let start=0;
  for(let index=0;index<lines.length;index++){const line=lines[index];if(scaled<start+line.duration || index===lines.length-1)return {line,index,elapsed:Math.min(line.duration,scaled-start),duration:line.duration,scale:total/sum};start+=line.duration;}
}
export const defaults = {name:'持杆少女', text:'准备好了？别紧张，先看清白球的位置。呼吸放慢一点……对，就是这样。来一局吧！', expression:'neutral', gain:70, duration:13, view:'half', lines:demoLines};
export function normalize(value = {}) {
  const number = (key, min, max) => Number.isFinite(Number(value[key])) ? Math.min(max, Math.max(min, Number(value[key]))) : defaults[key];
  return {
    lines:normalizeLines(value.lines || (typeof value.text==='string' && value.text!==defaults.text ? [{text:value.text,expression:value.expression,motion:'none',duration:value.duration || 15,at:0}] : demoLines)),
    name:typeof value.name === 'string' ? value.name.slice(0,30) : defaults.name,
    text:typeof value.text === 'string' ? value.text.slice(0,300) : defaults.text,
    expression:['neutral','smile','surprise'].includes(value.expression) ? value.expression : 'neutral',
    gain:number('gain',0,100), duration:number('duration',5,30),
    view:['half','full','face'].includes(value.view) ? value.view : 'half',
  };
}
export function performanceAt(time, settings, speaking, voiceLevel = null, trigger = null) {
  const gain = settings.gain / 100;
  const phase = time % 4.3;
  const automaticBlink=phase>3.5 && phase<3.78?Math.sin((phase-3.5)/.28*Math.PI):0;
  const cue=lineAt(time,settings);
  const authored=speaking?motionPose(cue.line.motion,(cue.elapsed-cue.line.at)*cue.scale):motionPose('none',0);
  const preview=trigger?motionPose(trigger.id,trigger.elapsed):motionPose('none',0);
  const blink=Math.max(automaticBlink,authored.blink,preview.blink);
  const eye=(1-blink)*Math.min(authored.lid,preview.lid);
  const chars = Array.from(cue.line.text);
  const char = chars[Math.min(chars.length-1, Math.floor(cue.elapsed/cue.duration*chars.length))];
  const pause = !char || /[，。！？、…\s,.!?]/u.test(char);
  const level = voiceLevel === null ? (pause ? 0 : Math.max(0,Math.sin(time*18))*.75) : voiceLevel;
  const expression = preview.expression || authored.expression || (speaking ? cue.line.expression : settings.expression);
  return {expression, parameters:{
    angleX:(Math.sin(time*.65)*1.6+authored.x+preview.x)*gain, angleY:(Math.sin(time*.9)*1.1+authored.y+preview.y)*gain,
    angleZ:(Math.sin(time*.5)*1.5+authored.z+preview.z)*gain, bodyAngleX:0, bodyAngleZ:0,
    breath:.5+.5*Math.sin(time*1.6), eyeOpen:eye, eyeROpen:eye, eyeLOpen:eye, eyeSmile:0,
    gazeX:(Math.sin(time*.4)*.06+authored.gx+preview.gx)*gain, gazeY:(authored.gy+preview.gy)*gain,
    mouthOpen:speaking && level>.055 ? .2+Math.min(1,level)*.65 : 0,
    mouthForm:0, armAngle:0, handAngle:0, fingerTap:0,
  }};
}
