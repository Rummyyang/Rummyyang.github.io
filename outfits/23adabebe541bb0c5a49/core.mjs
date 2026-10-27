export const STORAGE_KEY = 'style-atelier-v1';
export const FEATURE_LABELS = {formality:'正式度',relax:'宽松度',contrast:'色彩对比',warmth:'配色暖度'};
export function emptyState(){return {version:1,ratings:{},reasons:{},visited:[],groupIndex:0,dayOffset:0};}
export function sanitizeState(input,catalog){
  const s=emptyState();
  if(!input || input.version!==1 || typeof input!=='object') return s;
  const ids=new Set(catalog.outfits.map(x=>x.id));
  const groups=new Set(catalog.groups.map(x=>x.id));
  for(const [id,rating] of Object.entries(input.ratings||{})) if(ids.has(id)&&[2,1,-1].includes(rating)) s.ratings[id]=rating;
  for(const [id,reason] of Object.entries(input.reasons||{})) if(ids.has(id)&&typeof reason==='string'&&reason.length<120) s.reasons[id]=reason;
  s.visited=Array.from(new Set(Array.isArray(input.visited)?input.visited.filter(x=>groups.has(x)):[]));
  s.groupIndex=Number.isInteger(input.groupIndex)?Math.max(0,Math.min(catalog.groups.length-1,input.groupIndex)):0;
  return s;
}
export function shanghaiDate(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;
}
export function hash(value){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function profile(catalog,state){
  const liked=catalog.outfits.filter(x=>state.ratings[x.id]===2);
  const admired=catalog.outfits.filter(x=>state.ratings[x.id]===1);
  const negatives=catalog.outfits.filter(x=>state.ratings[x.id]===-1);
  const byGroup=catalog.groups.map(g=>({...g,likes:liked.filter(o=>o.group===g.id).length,admired:admired.filter(o=>o.group===g.id).length})).filter(g=>g.likes||g.admired).sort((a,b)=>(b.likes*2+b.admired)-(a.likes*2+a.admired));
  const averages={};
  if(liked.length) for(const k of Object.keys(FEATURE_LABELS)) averages[k]=liked.reduce((n,o)=>n+o.features[k],0)/liked.length;
  return {liked,admired,negatives,byGroup,averages,tentative:liked.length<6};
}
export function recommend(catalog,state,dateKey,edition=0){
  const p=profile(catalog,state), input=catalog.outfits.filter(o=>state.ratings[o.id]!==-1);
  if(!input.length)return [];
  const seenGroups=new Set(p.byGroup.filter(g=>g.likes).map(g=>g.id));
  const seed=dateKey+':'+edition;
  const score=o=>{
    const jitter=(hash(seed+o.id)%10000)/10000;
    if(!p.liked.length)return jitter;
    const affinity=Object.keys(FEATURE_LABELS).reduce((n,k)=>n+(4-Math.abs(o.features[k]-p.averages[k]))/4,0)/4;
    return affinity*.50+(seenGroups.has(o.group)?.17:0)+(state.ratings[o.id]===2?.08:0)+jitter*.45;
  };
  const pool=input.slice().sort((a,b)=>score(b)-score(a));
  const output=[], counts={};
  for(const o of pool){if((counts[o.group]||0)>=1)continue;output.push({...o,recommendation:seenGroups.has(o.group)?'沿着你的偏好':'保留一点探索'});counts[o.group]=(counts[o.group]||0)+1;if(output.length===3)break;}
  const unexplored=input.filter(o=>!seenGroups.has(o.group)&&!output.some(x=>x.id===o.id)).sort((a,b)=>hash(seed+'explore'+b.id)-hash(seed+'explore'+a.id));
  const extra=unexplored[0]||pool.find(o=>!output.some(x=>x.id===o.id));
  if(extra&&output.length<4)output.push({...extra,recommendation:'换个方向试试'});
  for(const o of pool){if(output.length===4)break;if(!output.some(x=>x.id===o.id))output.push({...o,recommendation:'也许你会喜欢'});}
  return output;
}
export function preferenceSummary(catalog,state){
  const p=profile(catalog,state);
  const list=items=>items.length?items.map(x=>x.id+' '+x.title).join('；'):'暂无';
  const notes=Object.entries(state.reasons).filter(([id])=>state.ratings[id]===-1).map(([id,r])=>id+'：'+r).join('；');
  return ['衣间偏好摘要 · '+shanghaiDate(),'搭配库版本：'+catalog.curatedAt,'完成浏览：'+state.visited.length+'/'+catalog.groups.length+'组','想穿：'+list(p.liked),'欣赏，但不一定穿：'+list(p.admired),'暂不适合：'+list(p.negatives),notes?'不适合的原因：'+notes:'','初步方向：'+(p.byGroup.length?p.byGroup.slice(0,3).map(x=>x.name).join('、'):'尚未形成'),'请根据这些选择继续推荐；不要把没选择的搭配视为不喜欢。'].filter(Boolean).join('\n');
}
