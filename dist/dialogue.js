import {loadMeshAvatar} from './vendor/mesh-avatar/index.js?v=props1';
import {STORAGE_KEY, defaults, normalize, performanceAt, lineAt, demoLines, motions, varietyLines} from './dialogue-timeline.js?v=6';

const $ = s => document.querySelector(s);
const base = './dist/assets/dialogue/lucky-npc/';
let settings = {...defaults};
try { settings = normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaults); } catch { /* Storage can be unavailable. */ }
let avatar, playing=false, paused=false, elapsed=0, idleTime=0, previous=0, trigger=null, triggerTime=0;
let audio=null, audioUrl=null, audioContext=null, analyser=null, samples=null, raf=0, audioStarting=false, generation=0;
const labels={neutral:'自然',smile:'微笑',surprise:'惊讶'};
const propLayers=()=>avatar?.setOverlays($('#show-prop')?.checked?['cue','grip']:['grip']);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) settings.gain=0;

function applySettings() {
  $('#name').value=settings.name;
  $('#expression').value=settings.expression; $('#gain').value=settings.gain; $('#duration').value=settings.duration;
  $('#gain-value').textContent=`${settings.gain}%`; $('#duration-value').textContent=`${settings.duration} 秒`;
  $('.preview').dataset.view=settings.view;
  document.querySelectorAll('[data-view]').forEach(b=>{if(b.tagName==='BUTTON') b.classList.toggle('selected',b.dataset.view===settings.view);});
  $('#speaker').textContent=settings.name || '未命名角色';
}
applySettings();
renderCues();
function renderCues() {
  const list=$('#cue-list');list.replaceChildren();
  settings.lines.forEach((line,index)=>{
    const card=document.createElement('fieldset');card.className='cue';
    const legend=document.createElement('legend');legend.textContent=`第 ${index+1} 句`;card.append(legend);
    function field(label,key,type,options){
      const wrap=document.createElement('label');wrap.textContent=label;
      const input=document.createElement(type);input.dataset.key=key;input.dataset.index=index;
      if(options)for(const [value,text] of options){const o=new Option(text,value);input.add(o);}
      if(type==='input'){input.type='number';input.min=key==='duration'?1:0;input.max=key==='duration'?30:line.duration-.1;input.step=.1;}
      if(type==='textarea'){input.rows=2;input.maxLength=300;}
      input.value=line[key];input.onchange=()=>{stop();settings.lines[index][key]=input.value;settings=normalize(settings);settings.duration=Math.min(30,Math.max(5,settings.lines.reduce((n,l)=>n+l.duration,0)));renderCues();applySettings();updateUI();};
      wrap.append(input);card.append(wrap);
    }
    field('台词','text','textarea');
    field('表情','expression','select',Object.entries(labels));
    field('动作','motion','select',Object.entries(motions).map(([id,m])=>[id,m.label]));
    field('动作触发（句内秒）','at','input');field('句子时长（秒）','duration','input');
    const actions=document.createElement('div');actions.className='save-actions';
    for(const [text,action,disabled]of [['上移',()=>{[settings.lines[index-1],settings.lines[index]]=[settings.lines[index],settings.lines[index-1]];},index===0],['删除',()=>settings.lines.splice(index,1),settings.lines.length===1]]){const b=document.createElement('button');b.textContent=text;b.disabled=disabled;b.onclick=()=>{stop();action();renderCues();updateUI();};actions.append(b);}
    card.append(actions);list.append(card);
  });
  $('#line-count').textContent=`${settings.lines.length} / 20`;
  $('#add-line').disabled=settings.lines.length>=20;
}
$('#add-line').onclick=()=>{stop();settings.lines.push({text:'新的台词。',expression:'neutral',motion:'none',at:0,duration:3});renderCues();};
$('#demo').onclick=()=>{stop();settings.lines=demoLines.map(l=>({...l}));settings.duration=13;renderCues();applySettings();updateUI();};
function readSettings() {
  settings=normalize({...settings,name:$('#name').value,expression:$('#expression').value,gain:$('#gain').value,duration:$('#duration').value});
  applySettings();
}
function duration() { return audio && Number.isFinite(audio.duration) && audio.duration>0 ? audio.duration : settings.duration; }
function updateUI() {
  const length=duration();
  const t=Math.min(elapsed,length), progress=t/length;
  const cue=lineAt(t,settings,length);
  const chars=Array.from(cue.line.text);
  $('#line').textContent=playing || paused ? chars.slice(0,Math.max(1,Math.ceil(cue.elapsed/cue.duration*chars.length))).join('') : settings.lines.map(l=>l.text).join('\n');
  document.querySelectorAll('.cue').forEach((card,i)=>card.classList.toggle('active', (playing || paused) && i===cue.index));
  const fmt=n=>`00:${String(Math.floor(n)).padStart(2,'0')}`;
  $('#time').textContent=`${fmt(t)} / ${fmt(length)}`;
  $('#progress').style.width=`${progress*100}%`;
  $('#play').textContent=playing?'Ⅱ 暂停':paused?'▶ 继续播放':'▶ 播放对话';
  $('#status').textContent=playing?'对话表演中':paused?'表演已暂停':'角色已就绪';
  $('#motion-label').textContent=trigger?`预览 · ${motions[trigger.id].label}`:playing||paused?`第 ${cue.index+1} 句 · ${motions[cue.line.motion]?.label || '无'}`:'动作待机';
  $('#playback-label').textContent=audio?'本地配音 · 音量驱动嘴型':'无配音 · 文字节奏嘴型预览';
}
function pause() { generation++; audioStarting=false; if(playing){playing=false;paused=true;} audio?.pause(); updateUI(); }
function stop(reset=true) {
  generation++; audioStarting=false; playing=false; paused=false; trigger=null; audio?.pause();
  if(audio) audio.currentTime=0;
  if(reset) elapsed=0;
  avatar?.setParameters({mouthOpen:0}); updateUI();
}
async function play() {
  if(!avatar || audioStarting) return;
  if($('#inspect').checked) {
    $('#inspect').checked=false; $('#layer-list').hidden=true;
    $('#layer-preview').hidden=true; $('#canvas-wrap').hidden=false;
  }
  if(playing) { pause(); return; }
  if(!paused) elapsed=0;
  const token=++generation;
  try {
    if(audio) {
      audioStarting=true;
      if(!audioContext) {
        audioContext=new AudioContext(); analyser=audioContext.createAnalyser(); analyser.fftSize=1024;
        audioContext.createMediaElementSource(audio).connect(analyser); analyser.connect(audioContext.destination);
        samples=new Float32Array(analyser.fftSize);
      }
      await audioContext.resume();
      if(token!==generation) return;
      audio.currentTime=elapsed; await audio.play();
      if(token!==generation){audio.pause();return;}
    }
    audioStarting=false; playing=true; paused=false; updateUI();
  } catch(error) { audioStarting=false; stop(); $('#save-status').textContent=`配音无法播放：${error.message}`; }
}
function voiceLevel() {
  if(!audio || !analyser || !samples) return null;
  analyser.getFloatTimeDomainData(samples);
  return Math.min(1,Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length)*7);
}
function frame(now) {
  const dt=previous?Math.min((now-previous)/1000,.05):0; previous=now;
  if(!document.hidden && !$('#inspect').checked && avatar) {
    if(!paused) idleTime+=dt;
    if(playing) {
      elapsed=audio?audio.currentTime:elapsed+dt;
      if(elapsed>=duration()) {elapsed=duration();stop(false);}
    }
    if(!paused) {
      if(trigger) {trigger.elapsed=idleTime-triggerTime;if(trigger.elapsed>(motions[trigger.id]?.duration || 0))trigger=null;}
      const state=performanceAt(playing?elapsed:idleTime,{...settings,duration:duration()},playing,playing?voiceLevel():null,trigger);
      avatar.setExpression(state.expression); avatar.setParameters(state.parameters);
      // advance() rounds seconds * fps; passing the frame rate avoids zero ticks on 120/144/240 Hz displays.
      avatar.advance(dt, dt > 0 ? 1 / dt : 60);
      $('#emotion-label').textContent=labels[state.expression];
    }
    updateUI();
  }
  raf=requestAnimationFrame(frame);
}

$('#motion-demo').onclick=()=>{stop();settings.lines=demoLines.map(l=>({...l}));settings.duration=13;settings.gain=reducedMotion?0:85;settings.view='face';renderCues();applySettings();void play();if(reducedMotion)$('#save-status').textContent='系统已启用减少动态效果；如需预览头部动作，请手动调高动作幅度。';};
$('#show-prop').onchange=propLayers;
$('#play').onclick=play;
$('#restart').onclick=()=>{stop();void play();};
$('#idle').onclick=()=>{stop();trigger=null;};
for(const id of ['name','expression','gain','duration']) $('#'+id).addEventListener('input',()=>{stop();readSettings();});
document.querySelectorAll('button[data-view]').forEach(button=>button.onclick=()=>{settings.view=button.dataset.view;applySettings();});
const motionButtons=$('#motion-buttons');
for(const [id,m]of Object.entries(motions)){
  if(id==='none')continue;
  const b=document.createElement('button');b.textContent=m.label;b.dataset.motion=id;b.disabled=!avatar;
  b.onclick=()=>{stop();$('#inspect').checked=false;$('#layer-list').hidden=true;$('#layer-preview').hidden=true;$('#canvas-wrap').hidden=false;settings.view='face';applySettings();trigger={id,elapsed:0};triggerTime=idleTime;$('#motion-label').textContent=`预览 · ${m.label}`;};motionButtons.append(b);
}
$('#variety-demo').onclick=()=>{stop();settings.lines=varietyLines.map(l=>({...l}));settings.duration=20;settings.gain=reducedMotion?0:85;settings.view='face';renderCues();applySettings();void play();};
$('#inspect').onchange=()=>{
  pause(); const inspect=$('#inspect').checked;
  $('#layer-list').hidden=!inspect; $('#layer-preview').hidden=!inspect; $('#canvas-wrap').hidden=inspect;
  if(!inspect) paused=false;
};
$('#layer').onchange=()=>{$('#layer-image').src=base+$('#layer').value;};
$('#layer').dispatchEvent(new Event('change'));
$('#save').onclick=()=>{readSettings();try {localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));$('#save-status').textContent='二维编排已保存。配音文件需下次重新选择。';}catch{$('#save-status').textContent='浏览器无法保存，请使用导出编排。';}};
$('#export').onclick=()=>{
  readSettings();const blob=new Blob([JSON.stringify({format:'lucky-break-dialogue-2d',version:2,avatar:'lucky-npc',...settings},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dialogue-2d.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
async function clearAudio() {
  stop(); audio?.removeAttribute('src'); audio?.load(); audio=null;
  if(audioUrl) URL.revokeObjectURL(audioUrl); audioUrl=null;
  const context=audioContext; audioContext=null; analyser=null; samples=null;
  if(context) void context.close().catch(()=>{});
  $('#voice').value='';$('#audio-label').textContent='可选 · 有配音时按声音强弱开合嘴';$('#clear-voice').hidden=true;updateUI();
}
$('#clear-voice').onclick=clearAudio;
$('#voice').onchange=async()=>{
  const file=$('#voice').files[0];if(!file)return;
  await clearAudio();audioUrl=URL.createObjectURL(file);audio=new Audio(audioUrl);
  const current=audio;
  audio.onloadedmetadata=()=>{if(audio===current){$('#audio-label').textContent=`${file.name} · ${Number.isFinite(audio.duration)?audio.duration.toFixed(1):'?'} 秒`;updateUI();}};
  audio.onended=()=>{if(audio===current){elapsed=duration();stop(false);}};
  audio.onerror=()=>{if(audio===current){stop();$('#audio-label').textContent='无法读取此音频，请换一个文件。';}};
  $('#clear-voice').hidden=false;
};
document.addEventListener('visibilitychange',()=>{if(document.hidden && playing)pause();previous=0;});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);stop();avatar?.destroy();void clearAudio();});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});

try {
  avatar=await loadMeshAvatar($('#avatar'),base,{manual:true,padTop:0,padSide:.03,version:'props1'});
  avatar.setOverlays(['cue','grip']);avatar.setAutoIdle(false);avatar.setAutoMotion(false);avatar.setSwayGain(reducedMotion?0:.25);
  for(const b of document.querySelectorAll('#play,#restart,#idle,#motion-demo,#variety-demo,[data-motion]'))b.disabled=false;
  document.documentElement.dataset.avatarReady='true';
  updateUI();raf=requestAnimationFrame(frame);
} catch(error) {
  $('#status').textContent='预览未启动';$('#error').hidden=false;
  $('#error').textContent=`无法加载动态立绘：${error.message}。请通过本地 HTTP 服务打开，并确认浏览器支持 WebGL2。仍可使用拆层检查查看原画与补图。`;
  document.documentElement.dataset.avatarReady='error';console.error(error);
}
