(function(){
const body=document.body;
const a=body.dataset.audience||'common';
const d=window.SUNBOT_PROFILE[a]||window.SUNBOT_PROFILE.common;
const params=new URLSearchParams(location.search);
const school=params.get('school');
const source=params.get('source');
body.classList.add('aud-'+a);

document.querySelectorAll('[data-copy]').forEach(el=>{const k=el.dataset.copy;if(d[k])el.textContent=d[k]});

document.querySelectorAll('[data-audience-link]').forEach(el=>{
  const target=el.dataset.audienceLink;
  if(target===a)el.classList.add('active');
  if(school||source){
    const url=new URL(el.href,location.href);
    if(school)url.searchParams.set('school',school);
    if(source)url.searchParams.set('source',source);
    el.href=url.pathname+url.search;
  }
});

const values=document.querySelector('#audience-values');
if(values){
  const notes=['Điểm cần ưu tiên trong phương án này.','Được thể hiện trong chương trình và cách triển khai.','Có thể điều chỉnh theo nguồn lực thực tế.','Nên được thử và đánh giá trước khi mở rộng.'];
  values.innerHTML=d.values.map((v,i)=>`<div class="value fade-up"><strong>${escapeHtml(v)}</strong><span>${notes[i]}</span></div>`).join('');
}

function renderCards(selector,items,accent=false){
  const el=document.querySelector(selector);if(!el||!items)return;
  el.innerHTML=items.map((x,i)=>`<div class="card ${accent&&i===0?'accent':''} fade-up"><div class="number">${String(i+1).padStart(2,'0')}</div><h3>${escapeHtml(x[0])}</h3><p>${escapeHtml(x[1])}</p></div>`).join('');
}
renderCards('#audience-problems',d.problems,true);
renderCards('#audience-school-values',d.schoolValues);

const models=document.querySelector('#audience-models');
if(models&&d.models){
  models.innerHTML=d.models.map((x,i)=>`<details class="disclosure fade-up" ${i===0?'open':''}><summary><span><span class="model-tag">Phương án ${String(i+1).padStart(2,'0')}</span><br>${escapeHtml(x[0])}</span></summary><div class="detail-body">${escapeHtml(x[1])}</div></details>`).join('');
  models.querySelectorAll('details').forEach((el,i)=>el.addEventListener('toggle',()=>{if(el.open)track('model_expand',{index:i+1,label:el.querySelector('summary').textContent.trim()})}));
}

if(school){const e=document.querySelector('#personalized');if(e){e.hidden=false;e.innerHTML=`Hồ sơ được chuẩn bị cho <strong>${escapeHtml(school)}</strong>${source?` · người gửi: ${escapeHtml(source)}`:''}.`}}

const nextActions=document.querySelector('#next .actions');
if(nextActions){
  const catalogue=document.createElement('a');
  catalogue.className='btn primary';
  catalogue.href='../catalogue/';
  const cq=new URLSearchParams();
  if(a!=='common')cq.set('audience',a);
  if(school)cq.set('school',school);
  if(source)cq.set('source',source);
  if(cq.toString())catalogue.href+='?'+cq.toString();
  catalogue.dataset.track='open_catalogue';
  catalogue.innerHTML='Xem các mô hình hợp tác <span class="arrow">→</span>';
  nextActions.prepend(catalogue);
}

function track(name,extra={}){
  const evt={name,audience:a,school:school||'',source:source||'',ts:new Date().toISOString(),path:location.pathname,...extra};
  const q=JSON.parse(localStorage.getItem('sunbot_profile_events')||'[]');q.push(evt);localStorage.setItem('sunbot_profile_events',JSON.stringify(q.slice(-200)));
  window.dispatchEvent(new CustomEvent('sunbot-profile-event',{detail:evt}));
}
document.querySelectorAll('[data-track]').forEach(x=>x.addEventListener('click',()=>track(x.dataset.track,{label:x.textContent.trim()})));
track('profile_view');

const navLinks=[...document.querySelectorAll('.nav-links a[href^="#"]')];
const sections=navLinks.map(l=>document.querySelector(l.getAttribute('href'))).filter(Boolean);
if('IntersectionObserver'in window){
  const navObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){navLinks.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+entry.target.id))}})},{rootMargin:'-25% 0px -65% 0px',threshold:0});
  sections.forEach(s=>navObserver.observe(s));
  const revealObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObserver.unobserve(e.target)}})},{rootMargin:'0px 0px -40px 0px',threshold:.08});
  document.querySelectorAll('.fade-up,.card,.layer,.proof').forEach(el=>{el.classList.add('fade-up');revealObserver.observe(el)});
}else document.querySelectorAll('.fade-up').forEach(el=>el.classList.add('visible'));

function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
})();