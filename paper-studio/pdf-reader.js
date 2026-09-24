// PDF.js 5.6.205 (Apache-2.0), bundled locally so private files never leave the browser.
import {getDocument,GlobalWorkerOptions} from './vendor/pdfjs/pdf.min.mjs';
GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
const make=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
export async function mountPdf(root,blob,title,{expanded=false}={}){
 const viewer=make('div','pdf-viewer'),toolbar=make('div','pdf-controls'),prev=make('button','','‹'),next=make('button','','›'),counter=make('span','','正在排版…'),zoom=make('button','pdf-zoom','放大'),scroll=make('div','pdf-page-scroll'),status=make('p','field-hint','正在打开 PDF…');
 prev.setAttribute('aria-label','上一页');next.setAttribute('aria-label','下一页');counter.setAttribute('aria-live','polite');zoom.setAttribute('aria-label','切换整页或适宽阅读');prev.disabled=next.disabled=zoom.disabled=true;
 toolbar.append(prev,counter,next,zoom);scroll.append(status);viewer.append(toolbar,scroll);root.replaceChildren(viewer);
 let alive=true,pdf=null,loading=null,pageNumber=1,fitWidth=expanded,renderTask=null,sequence=0,resizeTimer;
 const controller={destroy(){alive=false;sequence++;clearTimeout(resizeTimer);observer.disconnect();renderTask?.cancel();loading?.destroy().catch(()=>{});}};
 root._pdfController?.destroy();root._pdfController=controller;
 async function render(){
  if(!alive||!pdf)return;const current=++sequence;renderTask?.cancel();prev.disabled=pageNumber<=1;next.disabled=pageNumber>=pdf.numPages;zoom.disabled=false;zoom.textContent=fitWidth?'整页':'放大';counter.textContent=`${pageNumber} / ${pdf.numPages}`;
  try{const page=await pdf.getPage(pageNumber);if(!alive||current!==sequence)return;const base=page.getViewport({scale:1}),availableWidth=Math.max(180,scroll.clientWidth-16),height=Math.max(280,Math.min(window.innerHeight*.61,expanded?760:590)),scale=fitWidth?availableWidth/base.width:Math.min(availableWidth/base.width,height/base.height),viewport=page.getViewport({scale}),ratio=Math.min(window.devicePixelRatio||1,2),canvas=make('canvas','pdf-page-canvas');
   canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${title}，第 ${pageNumber} 页，共 ${pdf.numPages} 页。可下载 PDF 使用阅读器查阅文字。`);
   scroll.replaceChildren(canvas);scroll.scrollTop=0;renderTask=page.render({canvas,canvasContext:canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});await renderTask.promise;
  }catch(e){if(e.name!=='RenderingCancelledException'&&alive&&current===sequence){scroll.replaceChildren(make('p','field-hint','这一页未能显示，可以下载原始 PDF 阅读。'));}}
 }
 prev.onclick=()=>{if(pageNumber>1){pageNumber--;render();}};next.onclick=()=>{if(pdf&&pageNumber<pdf.numPages){pageNumber++;render();}};zoom.onclick=()=>{fitWidth=!fitWidth;render();};
 let observedWidth=0;const observer=new ResizeObserver(entries=>{const width=Math.round(entries[0].contentRect.width);if(width&&width!==observedWidth){observedWidth=width;clearTimeout(resizeTimer);resizeTimer=setTimeout(render,120);}});observer.observe(root);
 try{const bytes=new Uint8Array(await blob.arrayBuffer());if(!alive)return controller;loading=getDocument({data:bytes,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href,isEvalSupported:false,enableXfa:false});pdf=await loading.promise;if(alive)await render();}catch(e){if(alive){counter.textContent='PDF';scroll.replaceChildren(make('p','field-hint','预览暂时不可用，请下载 PDF 阅读。'));}}
 return controller;
}
