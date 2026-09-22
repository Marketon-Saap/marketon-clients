'use strict';
const head = document.querySelector('.site-head');
const menu = document.getElementById('mobile-nav');
const toggle = document.querySelector('.menu-toggle');
function closeMenu(returnFocus = false) { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); if(returnFocus) toggle.focus(); }
toggle.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); });
menu.addEventListener('click', (e) => { if(e.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && !menu.hidden) closeMenu(true); });
document.addEventListener('click', (e) => { if(!menu.hidden && !head.contains(e.target)) closeMenu(); });
const desktop = matchMedia('(min-width:781px)'); desktop.addEventListener('change', () => { if(desktop.matches) closeMenu(); });
let ticking = false;
function syncHeader() { ticking = false; const hero = document.getElementById('hero'); const darks = [...document.querySelectorAll('#hero,#categoria,#productos,#cta-form')]; const y = head.getBoundingClientRect().top + 25; const dark = darks.some(el => { const r=el.getBoundingClientRect(); return r.top < y && r.bottom > y; }); head.classList.toggle('on-light', !dark); }
addEventListener('scroll', () => { if(!ticking) { ticking=true; requestAnimationFrame(syncHeader); } }, {passive:true}); syncHeader();
for(const btn of document.querySelectorAll('.yt-facade')) btn.addEventListener('click', () => { const iframe=document.createElement('iframe'); iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(btn.dataset.ytId)+'?autoplay=1&rel=0'; iframe.title='APTO — Video institucional'; iframe.allow='autoplay; encrypted-media; picture-in-picture'; iframe.allowFullscreen=true; const frame=document.createElement('div'); frame.className='yt-facade'; frame.append(iframe); btn.replaceWith(frame); }, {once:true});
const form = document.getElementById('diagnostico-form');
if(form) {
 const country=document.getElementById('f-phone_country_code');
 const phone=document.getElementById('f-phone_number');
 const lengths={'52':[10],'1':[10],'34':[9],'57':[10],'54':[10],'56':[9],'51':[9],'55':[10,11],'593':[9],'598':[8,9]};
 function validate(input) {
  let message=''; const value=input.value.trim();
  if(input.type==='checkbox') { if(input.required && !input.checked) message='Acepta el aviso de privacidad para continuar.'; }
  else if(input.required && !value) message='Completa este campo.';
  else if(value && input.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message='Escribe un correo válido.';
  else if(value && input.minLength>0 && value.length<input.minLength) message='Escribe al menos '+input.minLength+' caracteres.';
  else if(input===phone && value && !lengths[country.value].includes(value.replace(/\D/g,'').length)) message='Revisa el número y escríbelo sin código de país.';
  const error=document.getElementById('err-'+input.name); if(error) error.textContent=message;
  input.setAttribute('aria-invalid',String(!!message)); input.closest('.form-field')?.classList.toggle('has-error',!!message); return !message;
 }
 for(const input of form.querySelectorAll('input,select,textarea')) { input.addEventListener('blur',()=>validate(input)); input.addEventListener('input',()=>{ if(input.getAttribute('aria-invalid')==='true') validate(input); }); }
 country.addEventListener('change',()=>{ phone.placeholder=lengths[country.value].join(' o ')+' dígitos'; if(phone.value) validate(phone); });
 form.addEventListener('submit',e=>{
  e.preventDefault(); let valid=true;
  for(const input of form.querySelectorAll('input,select,textarea')) if(!validate(input)) valid=false;
  if(!valid) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const message=document.getElementById('form-message');
  message.textContent='Formulario validado. Esta vista previa local no envía información ni crea registros. Para contactar a APTO, escribe a info@apto.mx.';
  message.hidden=false; message.setAttribute('tabindex','-1'); message.scrollIntoView({block:'center',behavior:'instant'}); message.focus({preventScroll:true});
 });
}
