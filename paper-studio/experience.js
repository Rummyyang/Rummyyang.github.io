(() => {
 'use strict';
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const editions={orbit:{name:'双黑洞 · 引力书房',asset:'assets/hei-orbit.svg',alt:'两个黑洞相互环绕，黑哥与小小黑的共同引力',companion:'assets/orbit-fellows.svg?v=20260924-fellows05',companionAlt:'两位以黑洞为头部的抽象科研搭档，拿着手稿与观测笔并肩研究波形',deskLabel:'TWO MINDS, ONE DISCOVERY',deskTitle:['小小黑，','一起把这篇做扎实。'],welcomeLines:['黑哥 × 小小黑，科研搭档就位。','从好想法到好论文，Codex 接着把细节做好。']},folio:{name:'双墨印 · 私人藏书',asset:'assets/hei-seal.svg?v=20260924-rose04',alt:'两枚相叠的黑字藏书印，黑哥与小小黑的共同落款',companion:'assets/study-companion.png',companionAlt:'田曦薇甜美气质灵感的学习伙伴与黑猫插画',deskLabel:'YOUR EDITORIAL DESK',deskTitle:['小小黑，','这篇我来跟进。'],welcomeLines:['黑哥 × 小小黑，刚好黑的平方。','你安心读稿，细节交给 Codex 逐一打磨。']}};
 function setLines(node,lines){node.replaceChildren();lines.forEach((line,index)=>{if(index)node.append(document.createElement('br'));node.append(document.createTextNode(line));});}
 function applyEdition(name,persist=true){
  if(!Object.hasOwn(editions,name))name='orbit';const design=editions[name];document.body.dataset.edition=name;
  $$('.edition-mark').forEach(img=>{img.src=design.asset;if(img.alt)img.alt=design.alt;});$('#edition-caption').textContent=design.name;
  $$('.edition-companion').forEach(img=>{img.src=design.companion;img.alt=design.companionAlt;});$('#companion-label').textContent=design.deskLabel;setLines($('#companion-title'),design.deskTitle);setLines($('#welcome-message'),design.welcomeLines);
  $$('[data-edition-choice]').forEach(button=>{const selected=button.dataset.editionChoice===name;button.setAttribute('aria-pressed',String(selected));button.querySelector('.edition-choice-label').textContent=selected?'正在使用 ✓':'使用这个风格 ↗';});
  if(persist)try{localStorage.setItem('hei2:edition',name);}catch{}
 }
 function selectEdition(name){applyEdition(name);const url=new URL(location.href);if(url.searchParams.has('edition')){url.searchParams.set('edition',name);history.replaceState(null,'',url.pathname+url.search+url.hash);}}
 let edition=new URLSearchParams(location.search).get('edition');if(!edition)try{edition=localStorage.getItem('hei2:edition');}catch{}applyEdition(edition||'orbit');
 $('#edition-button').onclick=()=>$('#edition-dialog').showModal();
 $$('[data-edition-choice]').forEach(button=>button.onclick=()=>{selectEdition(button.dataset.editionChoice);$('#edition-dialog').close();$('#edition-button').focus({preventScroll:true});});
 $('#access-visibility').onclick=()=>{const input=$('#access-key'),masked=input.classList.toggle('concealed');$('#access-visibility').textContent=masked?'显示':'隐藏';$('#access-visibility').setAttribute('aria-pressed',String(masked));input.focus();};
 function showEntry(cue){
  if(!['hei','kiss'].includes(cue))return;
  if($('#welcome-dialog').open)$('#welcome-dialog').close();
  try{localStorage.setItem('hei2:welcomed','yes');}catch{}
  $('#entry-hei').hidden=cue!=='hei';$('#entry-kiss').hidden=cue!=='kiss';
  $('#entry-title').textContent=cue==='hei'?'帅，实至名归。':'飞吻收好，灵感开场。';
  $('#entry-copy').textContent=cue==='hei'?'黑哥的这份气场，黑² 认证。\n论文已备好，请入座。':'小田学习伙伴的开篇彩蛋。\n今天的好想法，也有人认真接住。';
  $('#entry-dialog').dataset.cue=cue;$('#entry-dialog').showModal();
 }
 $('#entry-continue').onclick=()=>{$('#entry-dialog').close();$('#paper-title').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
 $('#entry-dialog').addEventListener('close',()=>$('#entry-continue').blur());
 function onAuthenticated(cue,{celebrate=false}={}){
  const name=cue==='hei'?'orbit':cue==='kiss'?'folio':null;if(!name)return;
  selectEdition(name);if(celebrate)showEntry(cue);
 }
 window.HeiExperience={onAuthenticated};
})();
