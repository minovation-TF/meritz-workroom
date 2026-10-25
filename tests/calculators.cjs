const assert=require('node:assert/strict'),C=require('../assets/calculator-core.js');let checks=0;
const equal=(got,want)=>{assert.deepEqual(got,want);checks++;};
const fails=fn=>{assert.throws(fn);checks++;};
equal(C.today(new Date('2026-10-24T15:00:00Z')),'2026-10-25');equal(C.today(new Date('2026-10-24T14:59:59Z')),'2026-10-24');
equal(C.iso(C.parse('19900101')),'1990-01-01');equal(C.parse('1990-0101'),null);equal(C.parse('199001-01'),null);
for(const value of ['2026-02-29','1900-02-29','0000-01-01','2026-04-31','abcd','2026-13-01'])equal(C.parse(value),null);
equal(C.iso(C.parse('2000-02-29')),'2000-02-29');
for(const [birth,ref,full,insurance,counting]of[
 ['1988-10-02','2020-04-14',31,32,33],
 ['1990-04-25','2026-10-24',36,36,37],['1990-04-25','2026-10-25',36,37,37],
 ['1990-10-25','2026-10-24',35,36,37],['1990-10-25','2026-10-25',36,36,37],
 ['2000-02-29','2025-02-28',24,25,26],['2000-02-29','2025-03-01',25,25,26],
 ['2000-02-29','2025-08-28',25,25,26],['2000-02-29','2025-08-29',25,26,26],
 ['2000-08-31','2026-02-28',25,25,27],['2000-08-31','2026-03-01',25,26,27],
 ['2000-08-29','2024-02-28',23,23,25],['2000-08-29','2024-02-29',23,24,25],
 ['2026-10-25','2026-10-25',0,0,1]]){const r=C.age(birth,ref);equal([r.full,r.insurance,r.counting],[full,insurance,counting]);}
equal(C.age('1990-04-25','2026-10-24').nextInsurance,'2026-10-25');equal(C.age('1990-04-25','2026-10-25').nextInsurance,'2027-10-25');
fails(()=>C.age('2026-10-26','2026-10-25'));
const p=C.pregnancy('2027-01-01','2026-10-25');equal([p.weeks,p.remainder,p.days,p.remaining],[30,2,212,68]);
equal([C.pregnancy('2027-01-01','2027-01-01').weeks,C.pregnancy('2027-01-01','2027-01-01').remainder],[40,0]);
equal([C.pregnancy('2027-01-01','2026-12-31').weeks,C.pregnancy('2027-01-01','2026-12-31').remainder],[39,6]);
equal(C.pregnancy('2027-01-01',C.offset('2027-01-01',-280)).days,0);fails(()=>C.pregnancy('2027-01-01',C.offset('2027-01-01',-281)));
equal(C.pregnancy('2027-01-01','2027-01-02').remaining,-1);
equal(C.difference('2026-01-01','2026-12-31').days,364);equal(C.difference('2026-01-01','2026-12-31',true).days,365);equal(C.difference('2024-01-01','2025-01-01').days,366);
equal(C.difference('2026-10-25','2026-10-25').days,0);equal(C.difference('2026-10-25','2026-10-25',true).days,1);fails(()=>C.difference('2026-10-26','2026-10-25'));
equal(C.offset('2024-02-28',1),'2024-02-29');equal(C.offset('2024-02-28',2),'2024-03-01');equal(C.offset('2023-02-28',1),'2023-03-01');equal(C.offset('2026-01-01',-1),'2025-12-31');fails(()=>C.offset('9999-12-31',1));
const base={value:'365,000',start:'2026-01-01',end:'2027-01-01',usedStart:'2026-01-01',usedEnd:'2026-01-31'};
equal(C.prorate(base).pay,'30000');equal(C.prorate({...base,value:'0'}).pay,'0');equal(C.prorate({...base,usedEnd:'2027-01-01'}).pay,'365000');
equal(C.prorate({value:'366000',start:'2024-01-01',end:'2025-01-01',usedStart:'2024-02-01',usedEnd:'2024-03-01'}).pay,'29000');
equal(C.prorate({value:'310000',start:'2026-01-01',end:'2026-01-31',usedStart:'2026-01-01',usedEnd:'2026-01-10',includeStart:true}).pay,'100000');
const third={value:'10',start:'2026-01-01',end:'2026-01-04',usedStart:'2026-01-01',usedEnd:'2026-01-02'};
equal(C.prorate({...third,rounding:'floor'}).pay,'3');equal(C.prorate({...third,rounding:'round'}).pay,'3');equal(C.prorate({...third,rounding:'ceil'}).pay,'4');
equal(C.prorate({...third,value:'11',rounding:'round'}).pay,'4');equal(C.prorate({...third,value:'100000000000001',rounding:'round'}).pay,'33333333333334');
for(const value of ['-1000','1e6','abc','1,,000','3.5','1000000000000000'])fails(()=>C.prorate({...base,value}));
fails(()=>C.prorate({...base,usedStart:'2025-12-31'}));fails(()=>C.prorate({...base,usedEnd:'2027-01-02'}));fails(()=>C.prorate({...base,end:base.start}));
for(let i=0;i<120;i++){const year=2000+i,ref=`${year}-01-01`,days=365+(C.parse(`${year}-12-31`).serial-C.parse(ref).serial===365?1:0);equal(C.offset(ref,days),`${year+1}-01-01`);const r=C.prorate({...base,value:String(100000000000000n+BigInt(i)),usedEnd:C.offset(base.usedStart,i%365),rounding:['floor','round','ceil'][i%3]});assert(BigInt(r.pay)>=0n&&BigInt(r.pay)<=100000000000000n+BigInt(i));checks++;}
console.log(JSON.stringify({result:'passed',checks,groups:['Meritz insurance-age example','six-month boundary and leap/month-end birthdays','Korean-date timezone','gestation weeks and days','day inclusion and calendar arithmetic','exact integer prorating and rounding']}));
