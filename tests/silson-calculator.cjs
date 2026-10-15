const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../silson-calculator.html'),'utf8');
const core=html.match(/<script id="calc">([\s\S]*?)<\/script>/)[1],parse=html.match(/const parseAmount=value=>\{[\s\S]*?const toNum=s=>parseAmount\(s\)\?\?0;/)[0];
const ctx=vm.createContext({});vm.runInContext(core+'\n'+parse+'\nglobalThis.api={out4,out23,three,inpatient,out5,inpatient5,parseAmount};',ctx);const c=ctx.api;let checks=0;
const equal=(got,want)=>{assert.equal(got,want);checks++;};
equal(c.out4({grade:'g',g:124000,b:36000}).pay,105200);
equal(c.out4({grade:'c',g:5000,b:5000}).pay,0);
equal(c.out4({grade:'g',g:1000000,b:1000000}).pay,400000);
equal(c.out23('g2','a',{grade:'1',g:51400,b:218000},{out:250000,rx:50000}).pay,250000);
equal(c.out23('g3','s2',{grade:'2',g:154500,b:63000},{out:250000,rx:50000}).pay,189450);
equal(c.out23('g3','s2',{kind:'rx',g:43000,b:0},{out:250000,rx:50000}).pay,35000);
equal(c.out23('g2','b',{grade:'1',g:100000,b:0},{out:10000,rx:5000}).pay,10000);
equal(c.out23('g2','a',{kind:'rx',g:7000,b:0},{out:250000,rx:50000}).pay,0);
equal(c.three('g3',50000).pay,30000);equal(c.three('g4',50000).pay,20000);equal(c.three('g4',10000).pay,0);
equal(c.inpatient('g2','a',{g:230000,b:80000,room:150000,days:6}).pay,354000);
equal(c.inpatient('g4','4',{g:350000,b:230000,room:0,days:0}).pay,441000);
equal(c.inpatient('g3','s2',{g:0,b:0,room:1000000,days:2}).room,200000);
equal(c.inpatient('g3','s2',{g:0,b:0,room:1000000,days:0}).room,0);
const cover={severe:true,mild:true};
equal(c.out5({grade:'2',g:200000,fund:300000,b:0},cover).pay,120000); // FSC's published example.
equal(c.out5({grade:'4',g:120000,fund:80000,b:0,severe:true},cover).pay,48000); // Never infer a 20% rate from diagnosis alone.
equal(c.out5({grade:'1',g:15000,b:0},cover).pending,true);
equal(c.out5({grade:'1',g:15000,fund:0,b:0},cover).pay,0);
equal(c.out5({grade:'1',g:0,b:300000,severe:true},cover).pay,200000);
equal(c.out5({grade:'1',g:0,b:300000,severe:false},cover).pay,150000);
equal(c.out5({grade:'1',g:0,b:300000,severe:true}).pay,0);
equal(c.inpatient5({g:350000,b:230000,bs:200000,big:false},cover).pay,535000);
equal(c.inpatient5({g:0,b:10000000,bs:0,big:false},cover).pay,3000000);
equal(c.inpatient5({g:0,b:10000000,bs:0,big:true},cover).pay,5000000);
equal(c.inpatient5({g:0,b:100000,bs:100000,big:true}).pay,0);
for(const [raw,value] of [['12,000원',12000],['1만5천',15000],['12만3000',123000],['1.5만',15000],['1억2천',100002000],['0',0],['',0],['12.9',12],['-1000',null],['1e6',null],['abc123',null],['1만2만',null],['1000000000001',null]])equal(c.parseAmount(raw),value);
for(let i=0;i<1000;i++){const g=(i*17011)%10000000,b=(i*49123)%10000000;for(const r of [c.out4({grade:'g',g,b}),c.out23('g3','s2',{grade:'2',g,b},{out:250000,rx:50000}),c.out5({grade:'4',g,fund:g*4,b,severe:i%2===0},cover)]){assert(Number.isSafeInteger(r.pay)&&r.pay>=0&&r.pay<=g+b);checks++;}}
console.log(JSON.stringify({result:'passed',checks,scope:'Per-claim basic deductions; annual accumulations and separate 5th-generation benefits excluded.'}));
