import {renderLook} from './illustration.js';

const GROUPS=['clean','soft','smart','ivy','city','workwear','sport','occasion'];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function photoFor(o){
  if(o.photo){
    const {src,cell,count}=o.photo;
    return typeof src==='string'&&/^(?:\.\/)?assets\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g)$/i.test(src)&&count===4&&Number.isInteger(cell)&&cell>=0&&cell<count
      ? {src,cell,count}:null;
  }
  // Only the original 32 looks share these plates. New looks need their own photo metadata.
  const match=/^([A-H])0([1-4])$/.exec(o.id||'');
  const group=match&&GROUPS[match[1].charCodeAt(0)-65];
  return group&&o.group===group?{src:'./assets/lookbook-'+group+'-v2.webp',cell:Number(match[2])-1,count:4}:null;
}

export function renderPhoto(o,context='card'){
  const photo=photoFor(o);
  if(!photo){
    return '<span class="photo-look photo-look--fallback" role="img" aria-label="'+escape(o.title+'：服装插画示意，尚无摄影示意图')+'">'+renderLook(o,context).replace('<svg ','<svg aria-hidden="true" ')+'<span class="photo-kind">插画示意</span></span>';
  }
  const eager=context==='detail'||context.startsWith('hero');
  return '<span class="photo-look" style="--photo-offset:'+(-photo.cell*100/photo.count)+'%"><img class="photo-sheet" src="'+escape(photo.src)+'" alt="'+escape(o.title+'，AI 生成的摄影风格穿搭示意，非真人试穿')+'" loading="'+(eager?'eager':'lazy')+'" decoding="async"'+(context==='hero0'?' fetchpriority="high"':'')+'></span>';
}
