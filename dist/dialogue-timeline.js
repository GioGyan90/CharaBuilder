export const STORAGE_KEY = 'lucky-break:dialogue-2d:v1';
export const defaults = {name:'持杆少女', text:'准备好了？别紧张，先看清白球的位置。呼吸放慢一点……对，就是这样。来一局吧！', expression:'neutral', gain:45, duration:15, view:'half'};
export function normalize(value = {}) {
  const number = (key, min, max) => Number.isFinite(Number(value[key])) ? Math.min(max, Math.max(min, Number(value[key]))) : defaults[key];
  return {
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
  let nod = speaking ? pulse(time/settings.duration*15,1,1.6,-10) : 0;
  let tilt = speaking ? pulse(time/settings.duration*15,6,2.4,10) : 0;
  if (trigger) {
    blink = Math.max(blink, trigger.id==='blink' ? pulse(trigger.elapsed,0,.32,1) : 0);
    nod += trigger.id==='nod' ? pulse(trigger.elapsed,0,1.6,-12) : 0;
    tilt += trigger.id==='tilt' ? pulse(trigger.elapsed,0,2.4,12) : 0;
  }
  const chars = Array.from(settings.text);
  const char = chars[Math.min(chars.length-1, Math.floor(time/settings.duration*chars.length))];
  const pause = !char || /[，。！？、…\s,.!?]/u.test(char);
  const level = voiceLevel === null ? (pause ? 0 : Math.max(0,Math.sin(time*18))*.75) : voiceLevel;
  const expression = speaking && time/settings.duration > .73 && settings.expression==='neutral' ? 'smile' : settings.expression;
  return {expression, parameters:{
    angleX:Math.sin(time*.65)*1.6*gain, angleY:(Math.sin(time*.9)*1.1+nod)*gain,
    angleZ:(Math.sin(time*.5)*1.5+tilt)*gain, bodyAngleX:0, bodyAngleZ:0,
    breath:.5+.5*Math.sin(time*1.6), eyeOpen:1-blink, eyeROpen:1-blink, eyeLOpen:1-blink, eyeSmile:0,
    gazeX:Math.sin(time*.4)*.06*gain, gazeY:0,
    mouthOpen:speaking && level>.055 ? .2+Math.min(1,level)*.65 : 0,
    mouthForm:0, armAngle:0, handAngle:0, fingerTap:0,
  }};
}
