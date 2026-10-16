const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../silson-calculator.html'),'utf8');
const core=html.match(/<script id="calc">([\s\S]*?)<\/script>/)[1];
const renderer=html.slice(html.indexOf('const detailNumber='),html.indexOf('function compute(){'));
const ctx=vm.createContext({});
vm.runInContext(core+'\n'+renderer+'\nglobalThis.api={GENS,inpatient,inpatient5,three,out23,out5,traceTotals,traceItemHtml};',ctx);
const c=ctx.api,cover={severe:true,mild:true};let checks=0;
const equal=(a,b)=>{assert.equal(a,b);checks++;};
const near=(a,b)=>{assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);checks++;};
function reconcile(result){
  const t=c.traceTotals([{title:'입원',items:result.traces,pay:result.pay}]);
  near(t.amount,t.self+t.limitCut+t.excluded+t.waiting+t.rounding+t.pay);
  assert(result.pay>=0&&result.pay<=t.amount);checks++;
  return t;
}
const base={g:0,b:0,room:0,days:0,priorSelf:0};
for(const [gen,type] of [['g2','a'],['g2','b'],['g2','c'],['g3','s2'],['g3','std']]){
  const r=c.GENS[gen].types[type];
  for(const prior of [0,1800000,2000000,2100000]){
    for(const [g,b] of [[0,0],[1000000,2000000],[20000000,10000000],[9999999,2345678]]){
      const ip=c.inpatient(gen,type,{...base,g,b,priorSelf:prior});
      const self=Math.min(g*r.rg+b*r.rb,Math.max(0,2000000-prior));
      equal(ip.pay,Math.floor(g+b-self+1e-9));near(ip.annual.self,self);reconcile(ip);
    }
  }
}
const combined=c.inpatient('g3','s2',{...base,g:10000000,b:10000000});
equal(combined.pay,18000000);equal(combined.annual.extra,1000000);
const prior=c.inpatient('g2','b',{...base,g:1500000,b:1000000,priorSelf:1800000});
equal(prior.pay,2300000);equal(prior.annual.self,200000);equal(prior.annual.extra,300000);
const withRoom=c.inpatient('g3','s2',{...base,g:10000000,b:10000000,room:1000000,days:2,priorSelf:2000000});
equal(withRoom.pay,20200000);equal(withRoom.traces[1].self,500000);equal(withRoom.traces[1].limitCut,300000);reconcile(withRoom);
// Separate special riders and outpatient deductions stay outside the inpatient ceiling.
equal(c.three('g3',1000000).pay,700000);
equal(c.out23('g3','s2',{grade:'1',g:100000,b:0},{out:250000,rx:50000}).pay,90000);
const severe={g:0,b:0,bs:20000000,severe:true,big:true,priorSevereSelf:0};
const ip5=c.inpatient5(severe,cover);equal(ip5.pay,15000000);equal(ip5.annual.self,5000000);equal(ip5.annual.extra,1000000);reconcile(ip5);
const ip5prior=c.inpatient5({...severe,priorSevereSelf:4000000},cover);equal(ip5prior.pay,19000000);equal(ip5prior.annual.self,1000000);reconcile(ip5prior);
equal(c.inpatient5({...severe,priorSevereSelf:5000000},cover).pay,20000000);
equal(c.inpatient5({...severe,priorSevereSelf:9000000},cover).pay,20000000);
const smallHospital=c.inpatient5({...severe,big:false,priorSevereSelf:5000000},cover);equal(smallHospital.pay,14000000);equal(smallHospital.annual,null);reconcile(smallHospital);
const unconfirmed=c.inpatient5({...severe,severe:false},cover);equal(unconfirmed.pending,true);equal(unconfirmed.pay,0);equal(unconfirmed.traces[0].waiting,20000000);reconcile(unconfirmed);
const noRider=c.inpatient5(severe,{severe:false,mild:true});equal(noRider.pay,0);equal(noRider.annual,null);equal(noRider.traces[0].excluded,20000000);reconcile(noRider);
const mixed5=c.inpatient5({...severe,g:10000000,b:10000000,priorSevereSelf:5000000},cover);equal(mixed5.pay,33000000);equal(reconcile(mixed5).self,7000000); // Only severe self is capped.
equal(c.inpatient5({g:20000000,b:0,bs:0,big:false},cover).pay,16000000); // Fifth-generation basic inpatient keeps 20%.
equal(c.out5({grade:'4',g:0,b:300000,severe:true},cover).pay,200000); // No annual ceiling for outpatient.
for(const prior of [0,4500000,5000000])for(const bs of [0,1,16666666,16666667,20000000]){
  const ip=c.inpatient5({...severe,bs,priorSevereSelf:prior},cover);
  equal(ip.pay,Math.floor(bs-Math.min(bs*.3,Math.max(0,5000000-prior))+1e-9));reconcile(ip);
}
const detail=c.traceItemHtml(ip5prior.traces[0]);
for(const text of ['연간 자기부담 상한','앞선 입원 누적 자기부담금','이번 입원 전 남은 자기부담 한도','상한 적용으로 보험금 추가','19,000,000원']){assert(detail.includes(text));checks++;}
// Check the actual page input handlers, generation isolation, checkbox transitions, and reset.
const nodes=new Map(),listeners={};
function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:false,open:undefined,dataset:{},setAttribute(){},setCustomValidity(){},addEventListener(){},matches(){return false;}});return nodes.get(id);}
const document={querySelector(s){return s.startsWith('#')?node(s.slice(1)):null;},querySelectorAll(){return[];},getElementById:node,addEventListener(t,fn){(listeners[t]??=[]).push(fn);}};
const page=vm.createContext({document,localStorage:{getItem(){return null;},setItem(){}}});
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],page);
const run=code=>vm.runInContext(code,page);
function input(key,value,checkbox=false){listeners.input[0]({target:{value:String(value),checked:!!value,type:checkbox?'checkbox':'text',dataset:{i:key},matches(){return !checkbox;},setCustomValidity(){},setAttribute(){}}});}
function total(want){assert(node('summary').innerHTML.includes(`<div class="big">${want}</div>`));checks++;}
run("state.gen='g2';S().type='b';renderAll();");
input('g',1500000);input('b',1000000);input('priorSelf',1800000);total('2,300,000원');
assert(node('annualInputs').innerHTML.includes('미입력은 0원'));checks++;
for(const t of Object.values(c.GENS.g2.types)){assert(t.desc.includes('급여')&&t.desc.includes('비급여')&&t.desc.includes('자기부담'));checks++;}
run("state.gen='g3';renderAll();");total('0원');
run("state.gen='g5';S().cover.severe=true;renderAll();");
input('bs',20000000);total('입력 확인 필요');input('severe',true,true);total('14,000,000원');input('big',true,true);total('15,000,000원');input('priorSevereSelf',4000000);total('19,000,000원');
input('big',false,true);total('14,000,000원');input('big',true,true);total('19,000,000원');
listeners.click[0]({target:{id:'fillEx',closest(){return null;}}});total('726,000원');equal(run('S().inp.priorSevereSelf'),0);equal(run('S().inp.severe'),false);
input('priorSevereSelf',5000000);listeners.click[0]({target:{id:'clearAll',closest(){return null;}}});total('0원');equal(run('S().inp.priorSevereSelf'),0);
run("state.gen='g5';renderAll();");input('g',20000000);total('16,000,000원');
run("state.gen='g4';renderAll();");equal(node('annualInputs').hidden,true);input('g',20000000);total('입력 확인 필요');
console.log(JSON.stringify({result:'passed',checks,scope:'Inpatient annual self ceilings, prior accrual, eligible fifth-generation hospital/treatment/rider, excluded room/outpatient/rider costs, reconciliation and actual page event handlers.'}));
