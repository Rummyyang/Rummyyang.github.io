// PDF.js 5.6.205 (Apache-2.0), bundled locally so private files never leave the browser.
import {getDocument,GlobalWorkerOptions} from './vendor/pdfjs/pdf.min.mjs';
GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
// Keep page-sized placeholders, but bound both raster memory and simultaneous PDF.js work.
const PAGE_GAP=16,MAX_CANVASES=6,MAX_JOBS=2,MAX_CANVAS_PIXELS=2000000;

export async function mountPdf(root,blob,title,{expanded=false}={}){
 root._pdfController?.destroy();
 const viewer=make('div',`pdf-viewer pdf-continuous${expanded?' pdf-expanded':''}`),toolbar=make('div','pdf-controls'),prev=make('button','','‹'),next=make('button','','›'),counter=make('span','pdf-page-count','正在打开…'),zoom=make('button','pdf-zoom','放大'),scroll=make('div','pdf-page-scroll'),stack=make('div','pdf-page-stack'),status=make('p','pdf-loading','正在打开 PDF…');
 for(const button of [prev,next,zoom]){button.type='button';button.disabled=true;}
 prev.setAttribute('aria-label','上一页');next.setAttribute('aria-label','下一页');zoom.setAttribute('aria-label','放大页面或恢复适宽阅读');counter.setAttribute('aria-live','polite');counter.setAttribute('aria-atomic','true');
 scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',`${title}，连续阅读。方向键滚动，Page Up 和 Page Down 翻屏，Home 和 End 跳到首尾，加减号缩放。`);
 toolbar.append(prev,counter,next,zoom);scroll.append(status);viewer.append(toolbar,scroll);root.replaceChildren(viewer);
 let alive=true,pdf=null,loading=null,pages=[],currentPage=1,zoomFactor=1,layoutVersion=0,jobs=0,frame=0,resizeTimer=0,paddingTop=12,observedWidth=0,observedHeight=0;
 let observer=null;
 const controller={
  destroy(){
   if(!alive)return;alive=false;layoutVersion++;cancelAnimationFrame(frame);clearTimeout(resizeTimer);observer?.disconnect();
   scroll.removeEventListener('scroll',scheduleUpdate);scroll.removeEventListener('keydown',onKeyDown);
   prev.onclick=next.onclick=zoom.onclick=null;for(const page of pages){page.wanted=false;release(page);}
   if(loading)Promise.resolve(loading.destroy()).catch(()=>{});if(root._pdfController===controller)delete root._pdfController;
  },
  goToPage(number){goToPage(number);}
 };
 root._pdfController=controller;

 function controls(){
  if(!alive||!pdf)return;prev.disabled=currentPage<=1;next.disabled=currentPage>=pages.length;zoom.disabled=false;
  const text=`${currentPage} / ${pages.length}`;if(counter.textContent!==text)counter.textContent=text;
  zoom.textContent=zoomFactor===1?'放大':'适宽';zoom.setAttribute('aria-pressed',String(zoomFactor!==1));
 }
 function pageAt(y){
  let low=0,high=pages.length-1;const position=Math.max(0,y-paddingTop);
  while(low<high){const middle=Math.ceil((low+high)/2);if(pages[middle].top<=position)low=middle;else high=middle-1;}
  return low;
 }
 function anchor(){
  if(!pages.length||!pages[0].height)return null;const page=pages[pageAt(scroll.scrollTop)];return{page,offset:(scroll.scrollTop-paddingTop-page.top)/(page.height||1)};
 }
 function release(page){
  page.version++;page.task?.cancel();page.task=null;
  if(page.canvas){page.canvas.width=0;page.canvas.height=0;page.canvas.remove();page.canvas=null;}
  page.proxy?.cleanup();page.proxy=null;page.state='idle';page.element.setAttribute('aria-busy','false');page.placeholder.hidden=false;page.placeholder.textContent=`第 ${page.number} 页`;
 }
 function layout(invalidate=false){
  if(!alive||!pages.length||scroll.clientWidth<=0)return;
  const position=anchor(),style=getComputedStyle(scroll),inset=(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0),width=Math.max(120,Math.floor((scroll.clientWidth-inset)*zoomFactor));paddingTop=parseFloat(style.paddingTop)||0;
  if(invalidate){layoutVersion++;for(const page of pages)release(page);}
  let top=0;for(const page of pages){page.width=width;page.height=Math.ceil(width*page.baseHeight/page.baseWidth);page.top=top;page.element.style.width=`${width}px`;page.element.style.height=`${page.height}px`;top+=page.height+PAGE_GAP;}
  stack.style.width=`${width}px`;
  if(position)scroll.scrollTop=Math.max(0,paddingTop+position.page.top+position.offset*position.page.height);
  if(zoomFactor===1)scroll.scrollLeft=0;scheduleUpdate();
 }
 function scheduleUpdate(){if(alive&&!frame)frame=requestAnimationFrame(()=>{frame=0;updateVisible();});}
 function updateVisible(){
  if(!alive||!pdf||!pages.length||scroll.clientWidth<=0)return;
  const height=Math.max(1,scroll.clientHeight),first=pageAt(scroll.scrollTop),last=pageAt(scroll.scrollTop+height-1),focus=pageAt(scroll.scrollTop+Math.min(height*.35,160));currentPage=focus+1;controls();
  const nearby=[];for(let i=Math.max(0,first-1);i<=Math.min(pages.length-1,last+1);i++)nearby.push(i);
  nearby.sort((a,b)=>{
   const visible=index=>Math.max(0,Math.min(paddingTop+pages[index].top+pages[index].height,scroll.scrollTop+height)-Math.max(paddingTop+pages[index].top,scroll.scrollTop));
   return visible(b)-visible(a)||Math.abs(a-focus)-Math.abs(b-focus);
  });
  const wanted=new Set(nearby.slice(0,MAX_CANVASES));
  for(let i=0;i<pages.length;i++){const page=pages[i];page.wanted=wanted.has(i);if(!page.wanted&&(page.state!=='idle'||page.canvas||page.proxy))release(page);}
  pump();
 }
 function pump(){
  if(!alive||!pdf)return;
  const waiting=pages.filter(page=>page.wanted&&!page.job&&page.state==='idle').sort((a,b)=>Math.abs(a.number-currentPage)-Math.abs(b.number-currentPage));
  while(jobs<MAX_JOBS&&waiting.length)renderPage(waiting.shift());
 }
 async function renderPage(page){
  const version=++page.version,layoutAtStart=layoutVersion,current=()=>alive&&page.wanted&&page.version===version&&layoutVersion===layoutAtStart;
  page.job=true;page.state='loading';page.element.setAttribute('aria-busy','true');page.placeholder.textContent=`正在显示第 ${page.number} 页…`;jobs++;
  let proxy=null,canvas=null,task=null;
  try{
   proxy=await pdf.getPage(page.number);if(!current())return;page.proxy=proxy;
   const base=proxy.getViewport({scale:1});if(base.width!==page.baseWidth||base.height!==page.baseHeight){page.baseWidth=base.width;page.baseHeight=base.height;layout();}
   if(!current())return;
   const viewport=proxy.getViewport({scale:page.width/base.width}),ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(MAX_CANVAS_PIXELS/(viewport.width*viewport.height)));
   canvas=make('canvas','pdf-page-canvas');canvas.width=Math.max(1,Math.floor(viewport.width*ratio));canvas.height=Math.max(1,Math.floor(viewport.height*ratio));canvas.style.width=`${page.width}px`;canvas.style.height=`${page.height}px`;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${title}，第 ${page.number} 页，共 ${pages.length} 页。可下载 PDF 使用阅读器查阅文字。`);
   page.canvas=canvas;page.element.append(canvas);task=proxy.render({canvas,canvasContext:canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});page.task=task;await task.promise;
   if(current()){page.state='ready';page.placeholder.hidden=true;page.element.setAttribute('aria-busy','false');}
  }catch(error){
   if(current()&&error?.name!=='RenderingCancelledException'){
    if(canvas){canvas.width=0;canvas.height=0;canvas.remove();if(page.canvas===canvas)page.canvas=null;}
    page.state='error';page.element.setAttribute('aria-busy','false');page.placeholder.textContent='这一页暂时未能显示。';const retry=make('button','pdf-page-retry','重试本页');retry.type='button';retry.onclick=()=>{if(alive){release(page);scheduleUpdate();}};page.placeholder.append(retry);
   }
  }finally{
   if(page.task===task)page.task=null;
   if(!current()){if(canvas){canvas.width=0;canvas.height=0;canvas.remove();if(page.canvas===canvas)page.canvas=null;}if(page.proxy===proxy)page.proxy=null;proxy?.cleanup();}
   page.job=false;jobs--;if(alive)pump();
  }
 }
 function goToPage(number){
  if(!alive||!pages.length)return;const target=Math.min(pages.length,Math.max(1,Math.floor(Number(number)||1)));currentPage=target;controls();scroll.scrollTo({top:Math.max(0,paddingTop+pages[target-1].top),behavior:'auto'});scheduleUpdate();
 }
 function setZoom(value){
  if(!alive||!pdf)return;const nextValue=Math.max(1,Math.min(2,value));if(nextValue===zoomFactor)return;zoomFactor=nextValue;layout(true);controls();
 }
 function onKeyDown(event){
  if(event.target!==scroll||event.altKey||event.ctrlKey||event.metaKey)return;
  let handled=true;
  switch(event.key){
   case 'ArrowDown':scroll.scrollBy({top:64,behavior:'auto'});break;
   case 'ArrowUp':scroll.scrollBy({top:-64,behavior:'auto'});break;
   case 'PageDown':case ' ':scroll.scrollBy({top:Math.max(120,scroll.clientHeight*.85)*(event.shiftKey?-1:1),behavior:'auto'});break;
   case 'PageUp':scroll.scrollBy({top:-Math.max(120,scroll.clientHeight*.85),behavior:'auto'});break;
   case 'Home':goToPage(1);break;
   case 'End':goToPage(pages.length);break;
   case '+':case '=':setZoom(zoomFactor+.25);break;
   case '-':setZoom(zoomFactor-.25);break;
   case '0':setZoom(1);break;
   default:handled=false;
  }
  if(handled){event.preventDefault();scheduleUpdate();}
 }
 prev.onclick=()=>goToPage(currentPage-1);next.onclick=()=>goToPage(currentPage+1);zoom.onclick=()=>setZoom(zoomFactor===1?1.5:1);
 scroll.addEventListener('scroll',scheduleUpdate,{passive:true});scroll.addEventListener('keydown',onKeyDown);
 observer=new ResizeObserver(entries=>{
  const {width,height}=entries[0].contentRect,nextWidth=Math.round(width),nextHeight=Math.round(height);if(!nextWidth||nextWidth===observedWidth&&nextHeight===observedHeight)return;
  observedWidth=nextWidth;observedHeight=nextHeight;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>layout(true),120);
 });observer.observe(scroll);
 try{
  const bytes=new Uint8Array(await blob.arrayBuffer());if(!alive)return controller;
  loading=getDocument({data:bytes,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href,isEvalSupported:false,enableXfa:false});pdf=await loading.promise;if(!alive)return controller;
  const first=await pdf.getPage(1);if(!alive)return controller;const base=first.getViewport({scale:1});
  for(let number=1;number<=pdf.numPages;number++){
   const element=make('section','pdf-page-slot'),placeholder=make('div','pdf-page-placeholder',`第 ${number} 页`);element.setAttribute('aria-label',`第 ${number} 页`);element.setAttribute('aria-busy','false');element.append(placeholder);stack.append(element);pages.push({number,element,placeholder,baseWidth:base.width,baseHeight:base.height,width:0,height:0,top:0,version:0,state:'idle',wanted:false,job:false,task:null,proxy:null,canvas:null});
  }
  scroll.replaceChildren(stack);layout();controls();updateVisible();
 }catch(error){if(alive){prev.disabled=next.disabled=zoom.disabled=true;counter.textContent='PDF';scroll.replaceChildren(make('p','pdf-loading','预览暂时不可用，请下载 PDF 阅读。'));}}
 return controller;
}
