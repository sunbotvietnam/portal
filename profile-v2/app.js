(function(){
const body=document.body;
const a=body.dataset.audience||'common';
const d=window.SUNBOT_PROFILE[a]||window.SUNBOT_PROFILE.common;
body.classList.add('aud-'+a);

document.querySelectorAll('[data-copy]').forEach(el=>{
  const k=el.dataset.copy;
  if(d[k]) el.textContent=d[k];
});
document.querySelectorAll('[data-audience-link]').forEach(el=>{
  if(el.dataset.audienceLink===a) el.classList.add('active');
});

const values=document.querySelector('#audience-values');
if(values){
  const notes=[
    'Giá trị cốt lõi được ưu tiên trong cấu hình này.',
    'Được phản ánh trong chương trình, vận hành và báo cáo.',
    'Có thể điều chỉnh theo nguồn lực của nhà trường.',
    'Được kiểm chứng trước khi mở rộng quy mô.'
  ];
  values.innerHTML=d.values.map((v,i)=>`<div class="value"><strong>${v}</strong><span>${notes[i]}</span></div>`).join('');
}

function renderCards(selector, items, className='card'){
  const el=document.querySelector(selector);
  if(!el||!items) return;
  el.innerHTML=items.map((x,i)=>`<div class="${className}"><div class="number">${String(i+1).padStart(2,'0')}</div><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('');
}
renderCards('#audience-problems',d.problems);
renderCards('#audience-school-values',d.schoolValues);
renderCards('#audience-models',d.models);

const params=new URLSearchParams(location.search);
const school=params.get('school');
const source=params.get('source');
if(school){
  const e=document.querySelector('#personalized');
  e.hidden=false;
  e.innerHTML=`Hồ sơ đang được chuẩn bị cho <strong>${escapeHtml(school)}</strong>${source?` · nguồn: ${escapeHtml(source)}`:''}.`;
}

function track(name,extra={}){
  const evt={name,audience:a,school:school||'',source:source||'',ts:new Date().toISOString(),path:location.pathname,...extra};
  const q=JSON.parse(localStorage.getItem('sunbot_profile_events')||'[]');
  q.push(evt);
  localStorage.setItem('sunbot_profile_events',JSON.stringify(q.slice(-200)));
  window.dispatchEvent(new CustomEvent('sunbot-profile-event',{detail:evt}));
}
document.querySelectorAll('[data-track]').forEach(x=>x.addEventListener('click',()=>track(x.dataset.track,{label:x.textContent.trim()})));
track('profile_view');

function escapeHtml(s){
  return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
})();