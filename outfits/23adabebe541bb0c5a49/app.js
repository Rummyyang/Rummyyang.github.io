import {renderPhoto} from './photo.js';
import {STORAGE_KEY,FEATURE_LABELS,emptyState,sanitizeState,profile,recommend,shanghaiDate,preferenceSummary} from './core.mjs';

const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog,state=emptyState(),daily={entries:[]},view='explore',groupFilter='all',occasionFilter='all',onlyLikes=false,variant=0,saveWorks=true,toastTimer;
const content=$('#content');
const storage={get(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{return null;}},set(s){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s));saveWorks=true;}catch{saveWorks=false;toast('浏览器暂时无法保存，请导出选择，避免丢失。');}}};
function toast(message){const notice=$('#toast');(document.querySelector('dialog[open]')||document.body).appendChild(notice);notice.textContent=message;notice.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>notice.classList.remove('visible'),3500);}
function persist(){storage.set(state);updateCounts();}
function updateCounts(){const p=profile(catalog,state);$('#progress-count').textContent=state.visited.length+' / '+catalog.groups.length;$('#likes-count').textContent=p.liked.length;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
function ratingRow(o){return '<div class="rating-row" aria-label="'+escape(o.title)+'的偏好">'+[[2,'♡ 想穿'],[1,'欣赏'],[-1,'暂不适合']].map(([n,label])=>'<button class="rate '+(state.ratings[o.id]===n?'selected':'')+'" data-rate="'+o.id+'" data-rating="'+n+'" aria-pressed="'+(state.ratings[o.id]===n)+'" aria-label="'+escape(o.id+' '+o.title+'：'+label)+'">'+label+'</button>').join('')+'</div>';}
function reasonSelect(o){if(state.ratings[o.id]!==-1)return '';return '<select class="reason-select" data-reason="'+o.id+'" aria-label="'+escape(o.title)+'不适合的原因"><option value="">原因（可选）</option>'+['太正式','太休闲','太宽松','太贴身','不喜欢配色','不适合我的生活','不想费心打理'].map(x=>'<option '+(state.reasons[o.id]===x?'selected':'')+'>'+x+'</option>').join('')+'</select>';}
function lookCard(o,context){return '<article class="look-card '+(state.ratings[o.id]===2?'liked':'')+'" data-card="'+o.id+'"><button class="look-image" data-detail="'+o.id+'" aria-label="查看 '+escape(o.id+' '+o.title)+' 搭配详情"><span class="look-id">'+o.id+'</span>'+renderPhoto(o,context)+'<span class="look-zoom">看搭配 ↗</span>'+(o.recommendation?'<span class="look-label">'+escape(o.recommendation)+'</span>':'')+'</button><div class="look-body"><div class="look-title-row"><h3>'+escape(o.title)+'</h3><span class="swatches" aria-label="'+escape(o.palette.map(x=>x.name).join('、'))+'">'+o.palette.map(c=>'<span class="swatch" style="background:'+c.hex+'" title="'+escape(c.name)+'"></span>').join('')+'</span></div><p class="look-subtitle">'+escape(o.subtitle)+'</p>'+ratingRow(o)+reasonSelect(o)+'</div></article>';}
function grid(outfits,context,extra=''){return '<div class="looks-grid '+extra+'">'+outfits.map(o=>lookCard(o,context)).join('')+'</div>';}
function heading(kicker,title,sub,aside=''){return '<div class="section-heading"><div><p class="eyebrow">'+escape(kicker)+'</p><h2>'+escape(title)+'</h2><p>'+escape(sub)+'</p></div>'+(aside?'<div class="aside-note">'+aside+'</div>':'')+'</div>';}
function explore(){
 const g=catalog.groups[state.groupIndex],looks=catalog.outfits.filter(o=>o.group===g.id).slice(0,4);
 const choices=looks.filter(o=>state.ratings[o.id]===2).length,done=state.visited.includes(g.id);
 content.innerHTML='<div class="group-steps" aria-label="风格章节">'+catalog.groups.map((x,i)=>'<button class="group-step '+(i===state.groupIndex?'active ':'')+(state.visited.includes(x.id)?'done':'')+'" data-group="'+i+'" '+(i===state.groupIndex?'aria-current="step"':'')+'><span>'+String(i+1).padStart(2,'0')+'</span>'+escape(x.name)+'</button>').join('')+'</div>'+
 heading('CHAPTER '+String(state.groupIndex+1).padStart(2,'0')+' / '+String(catalog.groups.length).padStart(2,'0'),g.name,g.subtitle,'每组可选 1–2 套，也可以全选或跳过。<br>先看感觉，再打开详情看版型。')+
 grid(looks,'explore')+
 '<div class="chapter-bottom"><p>'+escape(g.description)+'<br><strong>'+(choices?'本组 '+choices+' 套想穿':done?'这组已浏览，可随时修改选择':'不必为了完成进度而选喜欢')+'</strong></p><div class="button-row"><button class="secondary" id="previous-group" '+(state.groupIndex===0?'disabled':'')+'>← 上一组</button><button class="primary" id="next-group">'+(state.groupIndex===catalog.groups.length-1?'看我的方向 ↗':'保存并看下一组 →')+'</button></div></div><div class="help-strip">用“想穿”表达自己的生活选择，用“欣赏”收藏好看的灵感。图片为 AI 生成的摄影风格示意；服装细节以搭配清单为准，合身度仍需试穿。</div>';
}
function dailyView(){
 const date=shanghaiDate(),entry=(daily.entries||[]).find(e=>e.date===date),fallback=recommend(catalog,state,date,variant);
 let looks=fallback;
 if(entry&&variant===0){
   const curated=entry.outfitIds.map(id=>catalog.outfits.find(o=>o.id===id)).filter(o=>o&&state.ratings[o.id]!==-1).map(o=>({...o,recommendation:'今日编辑提案'}));
   const p=profile(catalog,state);
   looks=[];
   if(p.liked.length)looks.push(...fallback.slice(0,2));
   for(const o of curated.concat(fallback))if(looks.length<4&&!looks.some(x=>x.id===o.id))looks.push(o);
 }
 content.innerHTML=heading('A LITTLE INSPIRATION, EVERY DAY','今天，试试这些。','按北京时间更新 · 当前搭配库的每日精选','<span class="daily-date">'+date.replace(/-/g,'.')+'</span>')+
 (entry?'<div class="daily-editorial"><strong>'+escape(entry.headline)+'</strong><p>'+escape(entry.note)+'</p></div>':'<div class="daily-editorial"><strong>沿着喜欢的方向，留一点新鲜感。</strong><p>从现有搭配库按日期和本地偏好挑选。未评价时均衡探索；已标记“不适合”的搭配不会出现在这里。</p></div>')+
 (looks.length?grid(looks,'daily'):'<div class="empty-state"><h3>这批暂时没有合适的。</h3><p>你已经将所有搭配标记为不适合。可以去偏好页修改，或把摘要发回对话，让下一批换一个方向。</p><button class="primary" data-view="profile">查看我的偏好</button></div>')+
 '<div class="chapter-bottom"><p>网站根据本地选择挑选；对话中的每日推荐需要你分享偏好摘要。<br>这里不会自动读取天气、所在城市或博主实时更新。</p><div class="button-row"><button class="secondary" id="reroll">再看一组 ↻</button><button class="primary" data-export>把偏好发回对话 ↗</button></div></div>';
}
function library(){
 const filtered=catalog.outfits.filter(o=>(groupFilter==='all'||o.group===groupFilter)&&(occasionFilter==='all'||o.occasion.includes(occasionFilter))&&(!onlyLikes||state.ratings[o.id]===2));
 const occasions=Array.from(new Set(catalog.outfits.flatMap(o=>o.occasion)));
 content.innerHTML=heading('THE COMPLETE EDIT','慢慢看，随时改。',catalog.outfits.length+' 套原创提案 · 点击图片看组成、试穿重点和参考账号')+
 '<div class="filter-row"><label>风格<select id="group-filter"><option value="all">全部风格</option>'+catalog.groups.map(g=>'<option value="'+g.id+'" '+(g.id===groupFilter?'selected':'')+'>'+escape(g.name)+'</option>').join('')+'</select></label><label>场景<select id="occasion-filter"><option value="all">全部场景</option>'+occasions.map(x=>'<option '+(x===occasionFilter?'selected':'')+'>'+escape(x)+'</option>').join('')+'</select></label><label><input type="checkbox" id="only-likes" '+(onlyLikes?'checked':'')+'> 只看想穿</label><span class="eyebrow" style="margin:0 0 0 auto">'+filtered.length+' LOOKS</span></div>'+
 (filtered.length?grid(filtered,'library','library-grid'):'<div class="empty-state"><h3>这里还没有搭配。</h3><p>换个筛选，或先收藏几套想穿的。</p><button class="secondary" id="clear-filters">清除筛选</button></div>');
}
function profileView(){
 const p=profile(catalog,state);
 let body='';
 if(!p.liked.length&&!p.admired.length)body='<div class="empty-state"><h3>风格，从一次心动开始。</h3><p>目前还没有“想穿”或“欣赏”的选择。可以继续探索，也可以导出“不适合”的反馈，让下一批换个方向。</p><div class="button-row" style="justify-content:center"><button class="primary" data-view="explore">继续挑选 →</button><button class="secondary" data-export>导出已有反馈</button></div></div>';
 else body='<div class="profile-layout"><div class="profile-panel"><p class="eyebrow">YOUR EARLY DIRECTION</p><h3>'+escape(p.byGroup.slice(0,2).map(g=>g.name).join(' × '))+'</h3><p>'+(p.tentative?'选择还少，这只是暂时倾向。多看几组后再决定。':'这是当前选择形成的方向，仍可随时变化。')+'</p>'+p.byGroup.map(g=>'<div class="preference-item"><span>'+escape(g.name)+'</span><div class="meter"><span style="width:'+Math.min(100,(g.likes*2+g.admired)/8*100)+'%"></span></div><span>'+g.likes+'想穿 '+g.admired+'欣赏</span></div>').join('')+'</div><div><div class="metric"><span>想穿 / 欣赏 / 暂不适合</span><strong>'+p.liked.length+' / '+p.admired.length+' / '+p.negatives.length+'</strong></div>'+
 Object.keys(FEATURE_LABELS).map(k=>'<div class="metric"><span>'+FEATURE_LABELS[k]+'</span><strong>'+(p.liked.length?featureWord(k,p.averages[k]):'先选几套想穿的')+'</strong></div>').join('')+'<p style="font-size:11px;color:var(--muted)">根据搭配的编辑标签粗略归纳，不是身体诊断、精确评分或固定人格。</p><div class="button-row"><button class="primary" data-export>复制偏好摘要 ↗</button><button class="secondary" data-view="daily">看今日提案</button></div></div></div>'+
 (p.liked.length?heading('YOUR SAVED LOOKS','这些，你愿意穿出门。','随时可以撤销或更改。')+grid(p.liked,'saved','library-grid'):'');
 content.innerHTML=heading('A STYLE THAT FEELS LIKE YOU','你的选择，正在说话。','已浏览 '+state.visited.length+'/'+catalog.groups.length+' 组 · '+(saveWorks?'偏好保存在本浏览器':'本地保存不可用，请导出备份'))+body+
 heading('PEOPLE TO LEARN FROM','把参考，变成自己的。','下面是风格学习入口；展台方案均为原创，不是这些博主的原图或指定同款。')+
 '<div class="creator-list">'+catalog.creators.map(c=>'<article class="creator"><a href="'+escape(c.url)+'" target="_blank" rel="noopener noreferrer">'+escape(c.name)+' ↗</a><p>'+escape(c.focus)+'</p><p>'+escape(c.caveat)+'</p><small>'+escape(c.verification)+' · '+escape(c.handle)+'</small></article>').join('')+'</div><div class="chapter-bottom"><p>选择不会自动同步到对话。复制摘要后发给我，下一批才能结合你的反馈。</p><button class="text-button" id="reset-open">清除本地选择</button></div>';
}
function featureWord(k,n){const low=n<2.4,high=n>3.6;return ({formality:low?'日常休闲':high?'偏正式':'轻松得体',relax:low?'偏合体':high?'舒展宽松':'适度余量',contrast:low?'低对比、近色':high?'明暗分明':'适度对比',warmth:low?'冷色倾向':high?'暖色倾向':'冷暖均衡'})[k];}
function render(focus=false){updateCounts();({explore,daily:dailyView,library,profile:profileView})[view]();if(focus){content.focus({preventScroll:true});content.scrollIntoView({behavior:'auto',block:'start'});}}
function navigate(target){if(!['explore','daily','library','profile'].includes(target))return;view=target;render(true);}
function updateRating(id,rating){
 if(!catalog.outfits.some(o=>o.id===id))return;
 const restoreFocus=document.activeElement?.dataset.rate===id;
 const previous=state.ratings[id];
 if(previous===rating){delete state.ratings[id];delete state.reasons[id];}else{state.ratings[id]=rating;if(rating!==-1)delete state.reasons[id];}
 persist();
 if(view==='daily'){
   document.querySelectorAll('[data-card="'+id+'"]').forEach(card=>{const o=catalog.outfits.find(o=>o.id===id);card.classList.toggle('liked',state.ratings[id]===2);card.querySelector('.rating-row').outerHTML=ratingRow(o);card.querySelector('.reason-select')?.remove();if(state.ratings[id]===-1)card.querySelector('.look-body').insertAdjacentHTML('beforeend',reasonSelect(o));});
 }else render();
 if($('#detail-dialog').open)detail(id,false);
 if(restoreFocus){const root=$('#detail-dialog').open?$('#detail-dialog'):content;root.querySelector('[data-rate="'+id+'"][data-rating="'+rating+'"]')?.focus({preventScroll:true});}
 toast(previous===rating?'已撤销选择':rating===2?'已记下：这套想穿。':rating===1?'已收藏为灵感，不会当作一定想穿。':'已记下，下次推荐会避开这套。');
}
function detail(id,open=true){
 const o=catalog.outfits.find(x=>x.id===id);if(!o)return;
 const creators=o.creatorIds.map(id=>catalog.creators.find(c=>c.id===id)).filter(Boolean);
 $('#detail-content').innerHTML='<div class="detail-layout"><div class="detail-art">'+renderPhoto(o,'detail')+'</div><div class="detail-copy"><p class="eyebrow">'+o.id+' · '+escape(o.season)+' · '+escape(o.occasion.join(' / '))+'</p><h2 id="detail-title">'+escape(o.title)+'</h2><p>'+escape(o.subtitle)+'</p><ul>'+o.items.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul><h4>这套的感觉</h4><p>'+escape(o.why)+'</p><h4>试穿时，留意这里</h4><p>'+escape(o.fitNote)+'</p><h4>先用衣柜试一次</h4><p>'+escape(o.tryFirst)+'</p><h4>相关风格参考 · 非同款出处</h4>'+creators.map(c=>'<a href="'+escape(c.url)+'" target="_blank" rel="noopener noreferrer">'+escape(c.name)+' ↗</a>').join(' · ')+ratingRow(o)+reasonSelect(o)+'<p style="font-size:10px">AI 生成的摄影风格示意，非真人试穿；服装细节可能与清单略有差异。</p></div></div>';
 if(open)$('#detail-dialog').showModal();
}
function exportOpen(){$('#summary-text').value=preferenceSummary(catalog,state);$('#export-dialog').showModal();}
async function init(){
 try{
   const response=await fetch('./catalog.json',{cache:'no-cache'});if(!response.ok)throw new Error('catalog');catalog=await response.json();
   if(!Array.isArray(catalog.groups)||!catalog.groups.length||!Array.isArray(catalog.outfits)||!catalog.outfits.length)throw new Error('catalog');
   try{const r=await fetch('./daily.json',{cache:'no-cache'});if(r.ok)daily=await r.json();}catch{}
   state=sanitizeState(storage.get(),catalog);
   $('#group-total').textContent=String(catalog.groups.length).padStart(2,'0');
   $('#look-total').textContent=catalog.outfits.length;
   const hero=[catalog.outfits[4]||catalog.outfits[0],catalog.outfits[8]||catalog.outfits[1]];
   $('#hero-art').insertAdjacentHTML('afterbegin',hero.map((o,i)=>renderPhoto(o,'hero'+i)).join(''));
   render();
 }catch{content.innerHTML='<div class="empty-state"><h3>展台暂时没有加载成功。</h3><p>请检查连接后刷新页面。已有选择仍保留在本浏览器，不会因加载失败而清除。</p><button class="primary" id="reload">重新加载</button></div>';}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('button,[data-view]');if(!b)return;
 if(b.hasAttribute('data-close')){b.closest('dialog').close();return;}
 if(b.id==='reload'){location.reload();return;}
 if(!catalog)return;
 if(b.dataset.view){navigate(b.dataset.view);return;}
 if(b.dataset.group!==undefined){state.groupIndex=Number(b.dataset.group);persist();render(true);return;}
 if(b.dataset.detail){detail(b.dataset.detail);return;}
 if(b.dataset.rate){updateRating(b.dataset.rate,Number(b.dataset.rating));return;}
 if(b.hasAttribute('data-export')||b.id==='footer-export'){exportOpen();return;}
 if(b.id==='about-open'){$('#about-dialog').showModal();return;}
 if(b.id==='next-group'){
   const g=catalog.groups[state.groupIndex];if(!state.visited.includes(g.id))state.visited.push(g.id);
   if(state.groupIndex<catalog.groups.length-1)state.groupIndex++;else view='profile';persist();render(true);return;
 }
 if(b.id==='previous-group'){state.groupIndex=Math.max(0,state.groupIndex-1);persist();render(true);return;}
 if(b.id==='reroll'){variant++;render();return;}
 if(b.id==='clear-filters'){groupFilter='all';occasionFilter='all';onlyLikes=false;render();return;}
 if(b.id==='reset-open'){$('#reset-dialog').showModal();return;}
 if(b.id==='confirm-reset'){state=emptyState();persist();$('#reset-dialog').close();view='explore';render(true);toast('已重新开始。');return;}
 if(b.id==='copy-summary'){
   const value=$('#summary-text').value;
   if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(value).then(()=>toast('已复制，粘贴到对话即可。')).catch(()=>{ $('#summary-text').focus();$('#summary-text').select();toast('请手动复制已选中的摘要。'); });
   else{$('#summary-text').focus();$('#summary-text').select();toast('请手动复制已选中的摘要。');}return;
 }
 if(b.id==='download-data'){
   const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='衣间偏好-'+shanghaiDate()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
});
document.addEventListener('change',async event=>{
 const el=event.target;
 if(el.dataset.reason){state.reasons[el.dataset.reason]=el.value;persist();return;}
 if(el.id==='group-filter'){groupFilter=el.value;render();return;}
 if(el.id==='occasion-filter'){occasionFilter=el.value;render();return;}
 if(el.id==='only-likes'){onlyLikes=el.checked;render();return;}
 if(el.id==='import-data'){
   const file=el.files[0];if(!file)return;
   if(file.size>200000){toast('备份文件过大，请选择衣间导出的 JSON。');el.value='';return;}
   try{
     const raw=JSON.parse(await file.text());if(raw.version!==1||typeof raw.ratings!=='object'||!Array.isArray(raw.visited))throw new Error('invalid');
     const incoming=sanitizeState(raw,catalog);
     state=sanitizeState({...state,ratings:{...state.ratings,...incoming.ratings},reasons:{...state.reasons,...incoming.reasons},visited:[...state.visited,...incoming.visited]},catalog);
     persist();$('#export-dialog').close();view='profile';render(true);toast('已合并备份，原有选择保留。');
   }catch{toast('无法读取备份，请选择衣间导出的 JSON 文件。');}el.value='';
 }
});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&view==='daily'&&catalog)render();});
let displayedDate=shanghaiDate();
setInterval(()=>{const date=shanghaiDate();if(date!==displayedDate){displayedDate=date;variant=0;if(view==='daily'&&catalog&&!document.hidden)render();}},60000);
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY&&catalog){state=sanitizeState(storage.get(),catalog);render();}});
init();
