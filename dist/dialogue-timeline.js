export const STORAGE_KEY = 'lucky-break:dialogue-2d:v1';
export const demoLines = [
  {text:'准备好了？',expression:'smile',motion:'tilt',at:0.2,duration:3},
  {text:'别紧张，先看清白球的位置。',expression:'neutral',motion:'nod',at:0.6,duration:5},
  {text:'对，就是这样。来一局吧！',expression:'smile',motion:'nod',at:0.4,duration:5},
];
export function normalizeLines(lines) {
  return (Array.isArray(lines) && lines.length ? lines : demoLines).slice(0,20).map(line=>({
    text:String(line.text ?? '').slice(0,300),
    expression:['neutral','smile','surprise'].includes(line.expression)?line.expression:'neutral',
    motion:['none','blink','nod','tilt','shake'].includes(line.motion)?line.motion:'none',
    duration:Math.min(30,Math.max(1,Number(line.duration)||3)),
    at:Math.min(Math.min(30,Math.max(1,Number(line.duration)||3))-.1,Math.max(0,Number(line.at)||0)),
  }));
}
export function lineAt(time,settings,total=settings.duration) {
  const lines=settings.lines || demoLines, sum=lines.reduce((n,l)=>n+l.duration,0);
  const scaled=Math.max(0,time)/total*sum;let start=0;
  for(let index=0;index<lines.length;index++){const line=lines[index];if(scaled<start+line.duration || index===lines.length-1)return {line,index,elapsed:Math.min(line.duration,scaled-start),duration:line.duration,scale:total/sum};start+=line.duration;}
}
export const defaults = {name:'持杆少女', text:'准备好了？别紧张，先看清白球的位置。呼吸放慢一点……对，就是这样。来一局吧！', expression:'neutral', gain:45, duration:13, view:'half', lines:demoLines};
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
  const pulse = (t, start, length, amplitude) => t >= start && t <= start+length ? Math.sin((t-start)/length*Math.PI)*amplitude : 0;
  const phase = time % 4.3;
  let blink = phase > 3.5 && phase < 3.78 ? Math.sin((phase-3.5)/.28*Math.PI) : 0;
  const cue=lineAt(time,settings);
  let nod=0,tilt=0,shake=0;
  if(speaking){
    const t=(cue.elapsed-cue.line.at)*cue.scale;
    if(cue.line.motion==='nod')nod=pulse(t,0,1.6,-12);
    if(cue.line.motion==='tilt')tilt=pulse(t,0,2.4,12);
    if(cue.line.motion==='blink')blink=Math.max(blink,pulse(t,0,.32,1));
    if(cue.line.motion==='shake' && t>=0 && t<=1.8)shake=Math.sin(t/1.8*Math.PI*4)*Math.sin(t/1.8*Math.PI)*10;
  }
  if (trigger) {
    blink = Math.max(blink, trigger.id==='blink' ? pulse(trigger.elapsed,0,.32,1) : 0);
    nod += trigger.id==='nod' ? pulse(trigger.elapsed,0,1.6,-12) : 0;
    tilt += trigger.id==='tilt' ? pulse(trigger.elapsed,0,2.4,12) : 0;
  }
  const chars = Array.from(cue.line.text);
  const char = chars[Math.min(chars.length-1, Math.floor(cue.elapsed/cue.duration*chars.length))];
  const pause = !char || /[，。！？、…\s,.!?]/u.test(char);
  const level = voiceLevel === null ? (pause ? 0 : Math.max(0,Math.sin(time*18))*.75) : voiceLevel;
  const expression = speaking ? cue.line.expression : settings.expression;
  return {expression, parameters:{
    angleX:(Math.sin(time*.65)*1.6+shake)*gain, angleY:(Math.sin(time*.9)*1.1+nod)*gain,
    angleZ:(Math.sin(time*.5)*1.5+tilt)*gain, bodyAngleX:0, bodyAngleZ:0,
    breath:.5+.5*Math.sin(time*1.6), eyeOpen:1-blink, eyeROpen:1-blink, eyeLOpen:1-blink, eyeSmile:0,
    gazeX:Math.sin(time*.4)*.06*gain, gazeY:0,
    mouthOpen:speaking && level>.055 ? .2+Math.min(1,level)*.65 : 0,
    mouthForm:0, armAngle:0, handAngle:0, fingerTap:0,
  }};
}
