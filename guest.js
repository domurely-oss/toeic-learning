/* Isolated public viewer: never reads/writes the original app's tracks, tokens or storage. */
(()=>{'use strict';
const FOLDER='1T7ukANBenmR298EYb2gFcpv1SAWtrMev';
const byId=id=>document.getElementById(id);
const catalog=window.TOEIC_GUEST_CATALOG||{files:[],updated:'未提供'};
const texts=catalog.files.filter(f=>/\.(txt|srt|vtt)$/i.test(f.name));
const lessons=new Map();
function identity(name){const m=name.match(/^(.*?)(?:[._ -](en|eng|english|zh-tw|zh|cn|cht|chinese|中文|英文))?\.(txt|srt|vtt)$/i);return m?{base:m[1],lang:/^(zh|zh-tw|cn|cht|chinese|中文)$/i.test(m[2]||'')?'zh':'en'}:null}
function lesson(base){const key=base.toLowerCase();if(!lessons.has(key))lessons.set(key,{key,title:base});return lessons.get(key)}
for(const f of catalog.files){if(/\.(mp3|m4a|wav|ogg)$/i.test(f.name))lesson(f.name.replace(/\.[^.]+$/,'')).audio=f;else{const x=identity(f.name);if(x)lesson(x.base)[x.lang]=f}}
const all=[...lessons.values()].sort((a,b)=>a.title.localeCompare(b.title,'zh-Hant',{numeric:true}));
const section=document.createElement('section');section.id='guestSection';section.hidden=true;section.setAttribute('aria-label','免登入使用');
section.innerHTML=`<div class="panel guest-top"><div><h2>🌏 免登入使用</h2><p class="muted">自訂音檔播放 · 中英文逐字稿編輯 · 個人草稿與 TXT 下載</p></div><a href="https://drive.google.com/drive/folders/${FOLDER}" target="_blank" rel="noopener noreferrer">開啟公開資料夾 ↗</a></div>
<div class="guest-layout"><aside class="panel"><h2>公開教材</h2><label for="guestSearch">搜尋教材</label><input id="guestSearch" type="search" placeholder="輸入 Day、Sample 或檔名"><p class="muted" id="guestCount"></p><div id="guestList" class="guest-list"></div><p class="muted">快速清單更新日期：<span id="guestUpdated"></span>。新增檔案請使用下方「瀏覽最新資料夾」。</p></aside>
<div class="panel"><h2 id="guestTitle">請選擇教材</h2><p id="guestStatus" class="muted" role="status"></p>
<div id="guestAudio"></div><div class="guest-transcripts"><div><label for="guestEnSelect">英文文字檔</label><select id="guestEnSelect"></select><div id="guestEn"></div></div><div><label for="guestZhSelect">中文文字檔</label><select id="guestZhSelect"></select><div id="guestZh"></div></div></div>
<p class="muted">修改只儲存於此瀏覽器，可下載 TXT。免登入模式不會覆寫 Google Drive 原始檔案。清除瀏覽器資料會清除草稿，重要修改請先下載。</p>
<details><summary>讀取其他公開檔案連結</summary><div class="guest-link-form"><label>檔案類型<select id="guestLinkType"><option value="en">英文文字</option><option value="zh">中文文字</option><option value="audio">音檔</option></select></label><label>Google Drive 檔案分享連結<input id="guestLink" placeholder="https://drive.google.com/file/d/…/view"></label><button id="guestOpenLink" type="button">讀取</button></div><p class="muted" id="guestLinkStatus" role="status"></p></details></div></div>
<details class="panel" id="guestFolder" style="margin-top:18px"><summary>📂 瀏覽最新資料夾（含新檔案與子資料夾）</summary><p class="muted">此區直接顯示 Drive 目前清單。點選檔案會在新視窗開啟；也可複製其分享連結到上方讀取。重新整理此區不會更新上方快速配對清單。</p><button type="button" id="guestRefreshFolder" class="secondary">重新整理資料夾</button><div id="guestFolderHost"></div></details>`;
document.querySelector('main').after(section);
byId('guestUpdated').textContent=catalog.updated;
let current=null,active=false;
const containers={audio:'guestAudio',en:'guestEn',zh:'guestZh'};
const draftMemory=new Map();
const textSource=window.TOEIC_GUEST_TEXTS||{texts:{},updated:'未提供'};
let audioObjectUrl=null;
const playbackPrefs={speed:1,repeat:false,autoNext:false};
const revisions={en:0,zh:0};
function download(name,text){const a=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'}));a.href=url;a.download=name.replace(/[\\/:*?"<>|]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function preview(kind,file){
 const host=byId(containers[kind]);
 if(kind==='audio'){
  host.querySelector('audio')?.pause();if(audioObjectUrl){URL.revokeObjectURL(audioObjectUrl);audioObjectUrl=null}host.replaceChildren();
  host.innerHTML=`<div class="guest-player"><audio id="guestNativeAudio" preload="none" crossorigin="anonymous"></audio><p id="guestAudioStatus" role="status">按播放載入公開音檔；也可選擇本機音檔。</p><label for="guestSeek">播放進度</label><input type="range" id="guestSeek" min="0" max="1000" value="0" disabled><div class="time"><span id="guestTime">00:00 / 00:00</span><span id="guestAB">尚未設定 A–B</span></div><div class="actions"><button id="guestPrev" type="button">上一首</button><button id="guestBack" type="button">−5 秒</button><button id="guestPlay" type="button">▶ 播放</button><button id="guestForward" type="button">+5 秒</button><button id="guestNext" type="button">下一首</button></div><div class="guest-controls"><label>播放速度<select id="guestSpeed"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><button id="guestMarkA" type="button">設 A 點</button><button id="guestMarkB" type="button">設 B 點</button><button id="guestClearAB" type="button">清除區間</button><label class="guest-check"><input type="checkbox" id="guestRepeat">單曲循環</label><label class="guest-check"><input type="checkbox" id="guestAutoNext">自動下一首</label></div><label>選擇本機音檔（不會上傳）<input type="file" id="guestLocalAudio" accept="audio/*"></label><details id="guestFallback"><summary>Drive 預覽／下載音檔</summary><p class="muted">若雲端直連受限，可在 Drive 下載音檔，再選取本機音檔使用自訂播放器。</p><div id="guestFallbackHost"></div></details></div>`;
  const audio=byId('guestNativeAudio'),status=byId('guestAudioStatus');let A=null,B=null;
  byId('guestSpeed').value=String(playbackPrefs.speed);byId('guestRepeat').checked=playbackPrefs.repeat;audio.loop=playbackPrefs.repeat;byId('guestAutoNext').checked=playbackPrefs.autoNext;byId('guestAutoNext').onchange=e=>playbackPrefs.autoNext=e.target.checked;
  const fmt=t=>{t=Number.isFinite(t)?Math.floor(t):0;return Math.floor(t/60).toString().padStart(2,'0')+':'+(t%60).toString().padStart(2,'0')};
  function jump(delta){if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+delta))}
  function ab(){byId('guestAB').textContent=A===null?'尚未設定 A–B':`A ${fmt(A)} · B ${B===null?'未設定':fmt(B)}`}
  function move(delta,autoplay=false){const index=all.findIndex(x=>x.key===current?.key),next=all[index+delta];if(next){choose(next);if(autoplay)byId('guestPlay').click()}}
  byId('guestPrev').disabled=all.findIndex(x=>x.key===current?.key)<=0;byId('guestNext').disabled=all.findIndex(x=>x.key===current?.key)>=all.length-1;
  if(file)audio.src='https://drive.usercontent.google.com/download?export=download&id='+encodeURIComponent(file.id);else status.textContent='此教材沒有配對音檔，請選擇本機音檔。';
  byId('guestPlay').onclick=async()=>{if(!audio.getAttribute('src')){status.textContent='請先選擇音檔。';return}if(!audio.paused){audio.pause();return}try{status.textContent='正在載入音檔…';await audio.play();status.textContent='播放中'}catch(e){status.textContent='音檔無法播放：請改選本機音檔，或展開 Drive 預覽。'}};
  audio.onplay=()=>byId('guestPlay').textContent='⏸ 暫停';audio.onpause=()=>byId('guestPlay').textContent='▶ 播放';
  audio.onerror=()=>status.textContent='雲端音檔無法直接讀取，請改選本機音檔或使用下方 Drive 預覽。';
  audio.onloadedmetadata=()=>{byId('guestSeek').disabled=!Number.isFinite(audio.duration);status.textContent='音檔已載入';audio.playbackRate=Number(byId('guestSpeed').value);update()};
  function update(){if(B!==null&&audio.currentTime>=B)audio.currentTime=A;byId('guestTime').textContent=fmt(audio.currentTime)+' / '+fmt(audio.duration);byId('guestSeek').value=Number.isFinite(audio.duration)&&audio.duration?audio.currentTime/audio.duration*1000:0}
  audio.ontimeupdate=update;audio.onended=()=>{if(byId('guestAutoNext').checked&&!audio.loop)move(1,true)};
  byId('guestSeek').oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number(e.target.value)/1000};
  byId('guestBack').onclick=()=>jump(-5);byId('guestForward').onclick=()=>jump(5);byId('guestPrev').onclick=()=>move(-1);byId('guestNext').onclick=()=>move(1);
  byId('guestSpeed').onchange=e=>{playbackPrefs.speed=Number(e.target.value);audio.playbackRate=playbackPrefs.speed};
  byId('guestMarkA').onclick=()=>{if(!Number.isFinite(audio.duration)){status.textContent='請先載入音檔再設定區間。';return}A=audio.currentTime;B=null;ab()};
  byId('guestMarkB').onclick=()=>{if(A===null||audio.currentTime<=A){status.textContent='請先設定 A 點，再移到較晚的位置設定 B 點。';return}B=audio.currentTime;ab()};
  byId('guestClearAB').onclick=()=>{A=B=null;ab()};byId('guestRepeat').onchange=e=>{playbackPrefs.repeat=e.target.checked;audio.loop=e.target.checked};
  byId('guestLocalAudio').onchange=e=>{const f=e.target.files?.[0];if(!f)return;audio.pause();if(audioObjectUrl)URL.revokeObjectURL(audioObjectUrl);audioObjectUrl=URL.createObjectURL(f);audio.src=audioObjectUrl;A=B=null;ab();audio.load();status.textContent='已選擇本機音檔：'+f.name};
  byId('guestFallback').ontoggle=()=>{if(!byId('guestFallback').open)return;audio.pause();const el=byId('guestFallbackHost');if(el.childNodes.length||!file)return;const a=document.createElement('a');a.href='https://drive.google.com/file/d/'+encodeURIComponent(file.id)+'/view';a.target='_blank';a.rel='noopener noreferrer';a.textContent='開啟 Drive 檔案／下載';const iframe=document.createElement('iframe');iframe.title='備用音檔預覽';iframe.src='https://drive.google.com/file/d/'+encodeURIComponent(file.id)+'/preview';iframe.className='guest-audio-frame';el.append(a,iframe)};
  return;
 }
 const seq=++revisions[kind];host.replaceChildren();const draftKey='toeic_guest_edit_v2:'+current.key+':'+kind+':'+(file?.id||'new');
 let draft=null;try{draft=localStorage.getItem(draftKey)}catch{}if(draftMemory.has(draftKey))draft=draftMemory.get(draftKey);
 const label=document.createElement('label');label.htmlFor='guestEditor-'+kind;label.textContent=kind==='en'?'編輯英文逐字稿':'編輯中文翻譯';
 const textarea=document.createElement('textarea');textarea.id='guestEditor-'+kind;textarea.className='guest-editor';textarea.spellcheck=kind==='en';textarea.placeholder='可以直接輸入、貼上或匯入 TXT 檔案。';
 const hasSnapshot=file&&Object.prototype.hasOwnProperty.call(textSource.texts,file.id);textarea.value=draft??(hasSnapshot?textSource.texts[file.id]:'');
 const note=document.createElement('p');note.className='muted';note.setAttribute('role','status');note.id='guestEditStatus-'+kind;note.textContent=draft!==null?'已載入此瀏覽器的個人草稿。':hasSnapshot?'已載入公開文字副本（'+textSource.updated+'）。可修改並下載 TXT。':'尚無文字內容，可自行輸入或匯入 TXT。';
 function persist(){draftMemory.set(draftKey,textarea.value);try{localStorage.setItem(draftKey,textarea.value);note.textContent='草稿已自動儲存至此瀏覽器，未寫回 Google Drive。'}catch{note.textContent='瀏覽器無法儲存草稿，請下載 TXT 避免遺失。'}}
 textarea.oninput=persist;
 const actions=document.createElement('div');actions.className='guest-edit-actions';
 function button(text,fn){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=text;b.onclick=fn;actions.append(b);return b}
 button('儲存草稿',persist);button('下載 TXT',()=>download(current.title+'.'+kind+'.txt',textarea.value));
 const reload=button('重新讀取雲端',async()=>{if(!file)return;if(!confirm('重新讀取會取代此編輯區內容，確定繼續？'))return;const before=textarea.value;reload.disabled=true;note.textContent='正在讀取雲端文字…';try{const res=await fetch('https://drive.usercontent.google.com/download?export=download&id='+encodeURIComponent(file.id),{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('HTTP '+res.status);const value=await res.text();if(/<!doctype|<html/i.test(value))throw Error('回傳內容不是文字檔');if(seq!==revisions[kind]||!textarea.isConnected)return;if(textarea.value!==before){note.textContent='讀取期間已有修改，已保留目前內容。';return}textarea.value=value;persist()}catch(e){if(seq===revisions[kind])note.textContent='瀏覽器無法直接讀取 Drive 文字。已保留目前內容；請下載最新 TXT 後匯入。'}finally{reload.disabled=false}});reload.disabled=!file;
 const importLabel=document.createElement('label');importLabel.textContent='匯入 TXT（UTF-8）';const input=document.createElement('input');input.type='file';input.accept='.txt,text/plain';input.onchange=async()=>{const f=input.files?.[0];if(!f)return;if(textarea.value&&!confirm('匯入會取代此編輯區內容，確定繼續？'))return;const before=textarea.value;try{const value=await f.text();if(seq!==revisions[kind]||!textarea.isConnected)return;if(textarea.value!==before){note.textContent='匯入期間已有修改，請重新匯入。';return}textarea.value=value;persist()}catch{note.textContent='匯入失敗，原內容已保留。'}finally{input.value=''}};importLabel.append(input);
 host.append(label,textarea,actions,importLabel,note);
 if(file){const a=document.createElement('a');a.href='https://drive.google.com/file/d/'+encodeURIComponent(file.id)+'/view';a.target='_blank';a.rel='noopener noreferrer';a.textContent='查看／下載 Drive 原始文字檔';host.append(a)}
}
for(const [kind,id] of [['en','guestEnSelect'],['zh','guestZhSelect']]){const sel=byId(id);sel.add(new Option('未選擇文字檔',''));for(const f of texts)sel.add(new Option(f.name,f.id));sel.onchange=()=>{if(current)current[kind]=texts.find(f=>f.id===sel.value);preview(kind,current?.[kind])}}
function choose(item){current={...item};byId('guestTitle').textContent=item.title;for(const kind of ['audio','en','zh'])preview(kind,item[kind]);byId('guestEnSelect').value=item.en?.id||'';byId('guestZhSelect').value=item.zh?.id||'';byId('guestStatus').textContent='選擇播放或本機音檔；文字可直接修改，並自動儲存個人草稿。';renderList()}
function renderList(){const q=byId('guestSearch').value.trim().toLowerCase();const shown=all.filter(x=>x.title.toLowerCase().includes(q));byId('guestCount').textContent=`${shown.length} / ${all.length} 份教材`;const list=byId('guestList');list.replaceChildren();for(const item of shown){const b=document.createElement('button');b.type='button';b.className='guest-track';b.setAttribute('aria-pressed',String(current?.key===item.key));b.append(document.createTextNode(item.title));const small=document.createElement('small');small.textContent=[item.audio?'音檔':'',item.en?'英文':'',item.zh?'中文':''].filter(Boolean).join(' · ');b.append(small);b.onclick=()=>choose(item);list.append(b)}if(!shown.length)list.textContent='找不到符合的教材。'}
byId('guestSearch').oninput=renderList;
function showGuest(){active=true;document.body.classList.add('guest-mode');section.hidden=false;document.querySelectorAll('main audio').forEach(a=>a.pause());byId('goGuest').classList.add('active');byId('goGuest').setAttribute('aria-current','page');for(const id of ['goPlayer','goMaterials']){byId(id).classList.remove('active');byId(id).removeAttribute('aria-current')}if(!current&&all.length)choose(all.find(x=>x.en&&x.zh)||all[0]);else if(current)for(const k of ['audio','en','zh'])preview(k,current[k]);renderList()}
function leaveGuest(id){if(!active)return;active=false;byId('guestNativeAudio')?.pause();section.hidden=true;document.body.classList.remove('guest-mode');section.querySelectorAll('iframe').forEach(f=>f.remove());byId('goGuest').classList.remove('active');byId('goGuest').removeAttribute('aria-current');byId(id).classList.add('active');byId(id).setAttribute('aria-current','page');byId('guestFolder').open=false;}
byId('goGuest').onclick=showGuest;
for(const id of ['goPlayer','goMaterials'])byId(id).addEventListener('click',()=>leaveGuest(id),true);
function folderPreview(){const host=byId('guestFolderHost');host.replaceChildren();const f=document.createElement('iframe');f.title='公開 Google Drive 最新資料夾';f.className='guest-folder-frame';f.src='https://drive.google.com/embeddedfolderview?id='+FOLDER+'#list';host.append(f)}
byId('guestFolder').ontoggle=()=>{if(byId('guestFolder').open&&!byId('guestFolderHost').querySelector('iframe'))folderPreview()};byId('guestRefreshFolder').onclick=folderPreview;
byId('guestOpenLink').onclick=()=>{try{const u=new URL(byId('guestLink').value.trim());if(u.protocol!=='https:'||u.hostname!=='drive.google.com')throw Error('請輸入 Google Drive 的 HTTPS 檔案分享連結。');const id=u.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1]||u.searchParams.get('id');if(!id||!/^[-\w]{10,}$/.test(id))throw Error('找不到檔案 ID，請使用檔案連結，不能使用資料夾連結。');const kind=byId('guestLinkType').value;const file={id,name:'指定的公開檔案'};if(!current)current={key:'manual',title:'指定檔案'};current[kind]=file;preview(kind,file);if(kind!=='audio')byId(kind==='en'?'guestEnSelect':'guestZhSelect').value='';byId('guestLinkStatus').textContent='已指定檔案。新文字檔可按「重新讀取雲端」，若讀取受限請下載後匯入。'}catch(e){byId('guestLinkStatus').textContent=e.message}};
if(location.hash==='#guest')showGuest();
})();
