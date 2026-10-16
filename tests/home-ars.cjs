const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),script=fs.readFileSync(path.join(root,'assets/home.js'),'utf8');
const {document,window}=parseHTML(html),timers=new Map(),writes=[];let timerId=0,checks=0;
const eq=(a,b)=>{assert.equal(a,b);checks++;};
let focused;
Object.defineProperty(document,'activeElement',{get:()=>focused,configurable:true});
window.HTMLElement.prototype.focus=function(){focused=this;};
window.HTMLElement.prototype.select=function(){this.selectedForCopy=true;};
for(const dialog of document.querySelectorAll('dialog')){
  dialog.showModal=function(){this.open=true;};
  dialog.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
}
const navigator={clipboard:{async writeText(value){writes.push(value);}}};
window.isSecureContext=true;window.WORKROOM_CONFIG={};
const context=vm.createContext({document,window,navigator,Intl,Date,AbortSignal,setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);}});
vm.runInContext(script,context);
const click=element=>{assert(element);element.dispatchEvent(new window.Event('click',{bubbles:true}));};
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
(async()=>{
 const voice=document.getElementById('voice-ars-modal'),buttons=[...voice.querySelectorAll('button[data-ars-steps]')],copy=document.getElementById('copy-ars-guide');
 eq(buttons.length,42);eq(copy.hidden,true);
 const routes=buttons.map(b=>JSON.parse(b.dataset.arsSteps));eq(new Set(routes.map(r=>r.map(s=>s.key).join(','))).size,42);
 const find=keys=>buttons.find(b=>JSON.parse(b.dataset.arsSteps).map(x=>x.key).join(',')===keys);
 click(document.querySelector('.tool[data-modal-open="customer-modal"]'));eq(document.getElementById('customer-modal').open,true);
 click(document.querySelector('#customer-modal [data-modal-open="voice-ars-modal"]'));eq(voice.open,true);
 click(find('3,1'));eq(copy.hidden,false);
 const want='메리츠화재 고객센터 1566-7711로 전화한 뒤 음성 ARS를 선택해 주세요.\n3번(보험료 납입 및 납입 방법 변경) → 1번(모바일을 통한 보험료납입, 계좌/카드 변경) 순서로 눌러주세요.';
 eq(copy.dataset.copy,want);eq(document.getElementById('ars-selected-guide').textContent,want);
 click(copy);await flush();eq(writes.at(-1),want);eq(voice.querySelector('.modal-feedback').hidden,false);eq(voice.querySelector('.modal-feedback').textContent,'클립보드에 복사했어요.');eq(document.getElementById('preview-message').hidden,true);
 eq(timers.size,1);eq([...timers.values()][0].delay,2400);
 click(find('0,2,2'));
 assert(copy.dataset.copy.includes('0번(상담사 연결) → 2번(질병 및 상해보험 사고접수) → 2번(보험금 신청을 위한 구비서류 문자안내)'));checks++;
 eq(voice.querySelectorAll('[aria-pressed="true"]').length,1);
 click(copy);await flush();eq(writes.at(-1),copy.dataset.copy);eq(timers.size,1);
 click(find('1'));eq(copy.dataset.copy,'메리츠화재 고객센터 1566-7711로 전화한 뒤 음성 ARS를 선택해 주세요.\n1번(자동차 사고접수) 순서로 눌러주세요.');
 for(const button of buttons){click(button);const route=JSON.parse(button.dataset.arsSteps);eq(document.getElementById('ars-selected-guide').textContent,copy.dataset.copy);assert(route.every(step=>copy.dataset.copy.includes(`${step.key}번(${step.label})`)));checks++;}
 // Exercise every pre-existing phone/fax/address copy button with the same toast handler.
 for(const button of document.querySelectorAll('[data-copy]')){
  if(!button.dataset.copy)continue;button.closest('dialog').open=true;
  click(button);await flush();eq(writes.at(-1),button.dataset.copy);eq(button.closest('dialog').querySelector('.modal-feedback').hidden,false);eq(timers.size,1);
 }
 // A denied clipboard uses a temporary textarea inside the active top-layer dialog.
 navigator.clipboard.writeText=async()=>{throw Error('denied');};let usedFallback=false;
 document.execCommand=command=>{const input=voice.querySelector('textarea');assert(input?.selectedForCopy);eq(command,'copy');usedFallback=true;return true;};
 click(copy);await flush();eq(usedFallback,true);eq(document.querySelectorAll('textarea').length,0);eq(voice.querySelector('.modal-feedback').textContent,'클립보드에 복사했어요.');
 document.execCommand=()=>false;click(copy);await flush();eq(voice.querySelector('.modal-feedback').textContent,'복사하지 못했어요. 내용을 길게 눌러 복사해주세요.');eq([...timers.values()][0].delay,4200);
 [...timers.values()][0].fn();eq(voice.querySelector('.modal-feedback').hidden,true);
 click(copy);await flush();voice.close();eq(voice.querySelector('.modal-feedback').hidden,true);eq(timers.size,0);
 // Check structural content: three new-tab cues, a visible digital image, and all 14 mappings.
 eq(document.querySelectorAll('.tool .external-mark').length,3);
 for(const anchor of document.querySelectorAll('.tool .external-mark'))eq(anchor.closest('a').getAttribute('target'),'_blank');
 eq(document.querySelector('.tool[data-modal-open="service-modal"] > span').textContent,'현물서비스');eq(document.getElementById('service-title').textContent,'현물서비스');
 const digital=document.getElementById('digital-ars-modal');eq(digital.querySelectorAll('details.ars-screen').length,0);eq(digital.querySelectorAll('.ars-screen img').length,1);eq(digital.querySelectorAll('.ars-screen-markers > span').length,14);eq(digital.querySelectorAll('[data-ars-key]').length,14);
 const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);eq(new Set(ids).size,ids.length);
 for(const dialog of document.querySelectorAll('dialog'))eq(dialog.querySelectorAll('.modal-feedback').length,1);
 console.log(JSON.stringify({result:'passed',checks,scope:'All 42 voice ARS leaf paths, 3→1 and nested 0→2→2 guidance, all clipboard buttons, permission fallback and error toasts, modal closure, external cues, always-visible digital image and 14 menu mappings; layout checked separately in a browser.'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
