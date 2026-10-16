const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../silson-calculator.html'),'utf8');
const core=html.match(/<script id="calc">([\s\S]*?)<\/script>/)[1];
const renderer=html.slice(html.indexOf('const detailNumber='),html.indexOf('function compute(){'));
const ctx=vm.createContext({});
vm.runInContext(core+'\n'+renderer+'\nglobalThis.api={out4,out23,out5,three,inpatient,inpatient5,traceTotals,traceItemHtml,breakdownHtml};',ctx);
const c=ctx.api,cover={severe:true,mild:true};let checks=0;
const equal=(a,b)=>{assert.equal(a,b);checks++;};
function balance(items,pay){
  const group={title:'검증',items,pay},t=c.traceTotals([group]);
  assert(Math.abs(t.amount-t.self-t.limitCut-t.excluded-t.waiting-t.rounding-t.pay)<1e-6,'Every input won must reconcile');
  for(const item of items){assert(item.self>=0&&item.self<=item.amount);assert(item.limitCut>=0);}
  checks++;return t;
}
const g4=c.out4({grade:'g',g:124000,b:36000});
equal(g4.pay,105200);equal(g4.lines[0].trace.self,24800);equal(g4.lines[1].trace.self,30000);
equal(balance(g4.lines.map(x=>x.trace),g4.pay).self,54800);
const small=c.out4({grade:'g',g:5000,b:5000});equal(small.lines[0].trace.ded,20000);equal(small.lines[0].trace.self,5000);balance(small.lines.map(x=>x.trace),small.pay);
const capped=c.out4({grade:'g',g:1000000,b:0});equal(capped.lines[0].trace.limitCut,600000);balance(capped.lines.map(x=>x.trace),capped.pay);
const mixed=c.out23('g3','s2',{grade:'2',g:154500,b:63000},{out:250000,rx:50000});
equal(mixed.lines[0].trace.self,28050);equal(mixed.lines[0].trace.candidates[0].parts.length,2);balance(mixed.lines.map(x=>x.trace),mixed.pay);
const flat=c.out23('g2','a',{grade:'1',g:51400,b:218000},{out:250000,rx:50000});
equal(flat.lines[0].trace.candidates.length,1);equal(flat.lines[0].trace.self,10000);equal(flat.lines[0].trace.limitCut,9400);balance(flat.lines.map(x=>x.trace),flat.pay);
const missing=c.out5({grade:'1',g:200000,b:0},cover);equal(missing.lines[0].trace.waiting,200000);equal(missing.lines[0].trace.self,0);balance(missing.lines.map(x=>x.trace),missing.pay);
const noRider=c.out5({grade:'1',g:0,b:300000,severe:true});equal(noRider.lines[0].trace.excluded,300000);equal(noRider.lines[0].trace.self,0);balance(noRider.lines.map(x=>x.trace),noRider.pay);
const nhi=c.out5({grade:'2',g:200000,fund:300000,b:0},cover);equal(nhi.lines[0].trace.candidates.length,3);equal(nhi.lines[0].trace.self,80000);balance(nhi.lines.map(x=>x.trace),nhi.pay);
const room=c.inpatient('g3','s2',{g:0,b:0,room:1000000,days:2});equal(room.traces[0].self,500000);equal(room.traces[0].limitCut,300000);balance(room.traces,room.pay);
const noDays=c.inpatient('g3','s2',{g:100,b:0,room:1000000,days:0});equal(noDays.traces[1].waiting,1000000);balance(noDays.traces,noDays.pay);
const ip5=c.inpatient5({g:0,b:10000000,bs:100000,severe:true,big:false},cover);equal(ip5.traces[1].limitCut,2000000);balance(ip5.traces,ip5.pay);
for(let i=1;i<=1000;i++){
  const g=(i*17011)%10000000,b=(i*49123)%10000000;
  for(const result of [c.out4({grade:'g',g,b}),c.out23('g3','s2',{grade:'2',g,b},{out:250000,rx:50000}),c.out5({grade:'4',g,fund:g*2,b,severe:i%2===0},cover)])balance(result.lines.map(x=>x.trace),result.pay);
  for(const result of [c.inpatient('g2','c',{g,b,room:150001,days:3}),c.inpatient5({g,b,bs:135791,severe:true,big:i%2===0},cover)])balance(result.traces,result.pay);
}
const odd=c.three('g4',123457);balance([odd.trace],odd.pay);assert(c.traceItemHtml(odd.trace).includes('원 미만 버림'));checks++;
assert(!c.traceItemHtml(noRider.lines[0].trace).includes('실제 차감한 자기부담금'));checks++;
const grouped=[{title:'통원 <검증>',pay:g4.pay,items:g4.lines.map(x=>x.trace)}],totals=c.traceTotals(grouped);
assert(c.breakdownHtml(grouped,totals,true,false,false).includes('&lt;검증&gt;'));checks++;
assert(!c.breakdownHtml(grouped,totals,true,false,true).includes('105,200'));checks++;

// Run the actual page scripts and input handler without replacing their calculation logic.
const nodes=new Map(),listeners={};
function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:false,open:undefined,dataset:{},setAttribute(){},setCustomValidity(){},addEventListener(){},matches(){return false;}});return nodes.get(id);}
const document={querySelector(s){return s.startsWith('#')?node(s.slice(1)):null;},querySelectorAll(){return[];},getElementById:node,addEventListener(t,fn){(listeners[t]??=[]).push(fn);}};
const page=vm.createContext({document,localStorage:{getItem(){return null;},setItem(){}}});
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))vm.runInContext(match[1],page);
assert(node('summary').innerHTML.includes('금액을 입력하면'));checks++;
for(const [gen,total] of [['g5','726,000원'],['g4','606,000원'],['g3','1,026,450원'],['g2','604,000원']]){
  vm.runInContext(`state.gen='${gen}';Object.assign(S(),JSON.parse(JSON.stringify(EXAMPLES.${gen})));renderAll();`,page);
  assert(node('summary').innerHTML.includes(`<div class="big">${total}</div>`));assert(node('summary').innerHTML.includes('계산 내역 보기'));checks+=2;
}
vm.runInContext("state.gen='g4';renderAll();",page);
const input={value:'250000',type:'text',dataset:{v:'0',k:'g'},matches(){return true;},setCustomValidity(){},setAttribute(){}};
listeners.input[0]({target:input});assert(node('summary').innerHTML.includes('706,800원'));checks++;
node('breakdownBox').open=false;input.value='124000';listeners.input[0]({target:input});assert(node('summary').innerHTML.includes('id="breakdownBox" >'));checks++;
console.log(JSON.stringify({result:'passed',checks,scope:'Trace reconciliation, deductions, caps, exclusions, missing inputs, escaping and page-script integration; no browser layout verification.'}));
