(function(root){
const defaults={high:100000,daily:300000,repeat:3,share:50,farKm:20};
const sum=rs=>rs.reduce((s,r)=>s+r.amount,0),unique=rs=>[...new Map(rs.map(r=>[r.id,r])).values()];
function groups(rs,key){const m=new Map();for(const r of rs){const k=key(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r)}return [...m.values()]}
function geo(a,b){const t=Math.PI/180,x=(b.lat-a.lat)*t,y=(b.lng-a.lng)*t;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(x/2)**2+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(y/2)**2)))}
function run(source,context={}){
 const cfg={...defaults,...context.settings};for(const k of Object.keys(defaults))if(!Number.isFinite(cfg[k])||cfg[k]<=0)throw Error('점검 기준은 0보다 큰 숫자로 입력하세요.');if(cfg.repeat<2||!Number.isInteger(cfg.repeat)||cfg.share>100)throw Error('반복 횟수는 2 이상 정수, 비중은 100 이하로 입력하세요.');
 const rows=source.map(r=>{const d=/^\d{4}-\d{2}-\d{2}$/.test(r.date)?new Date(r.date+'T00:00:00Z'):null;const date=d&&Number.isFinite(+d)&&d.toISOString().slice(0,10)===r.date?d:null;const t=String(r.time||'').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);const hour=t&&+t[1]<24&&+t[2]<60&&+(t[3]||0)<60?+t[1]:null;const minutes=hour===null?null:hour*60+(+t[2]);const canceled=/취소|환불/.test(r.slip||'')||r.amount<0;const online=/PG|온라인|전자상거래|인터넷|갤럭시아|결제대행|통신판매/i.test((r.industry||'')+' '+(r.merchant||''));const p=r.point;const located=!canceled&&!online&&context.home&&p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng);return {...r,dateOK:!!date,weekend:date?[0,6].includes(date.getUTCDay()):null,hour,minutes,stamp:date&&hour!==null?+date+(minutes*60+(+(t[3]||0)))*1000:null,canceled,dist:located?geo(context.home,p):null}});
 const normal=rows.filter(r=>!r.canceled&&Number.isFinite(r.amount)&&r.amount>0),dated=normal.filter(r=>r.dateOK),timed=normal.filter(r=>r.stamp!==null),located=normal.filter(r=>r.dist!==null),near=located.filter(r=>r.dist<=context.radius),result=[];
 function rule(id,title,criterion,base,hits,note=''){const matched=unique(hits);result.push({id,title,criterion,status:base.length?(matched.length?'확인 필요':'기준 미해당'):'자료 부족',eligible:base.length,total:rows.length,transactionCount:matched.length,transactionIds:matched.map(r=>r.id+1),note})}
 rule(1,'집 주변 반복 사용',`집 주변 사용 ${cfg.repeat}건 이상`,located,near.length>=cfg.repeat?near:[]);
 rule(2,'집 주변 사용 비중 높음',`좌표 확인 가능한 사용 중 집 주변 ${cfg.share}% 이상, ${cfg.repeat}건 이상`,located,near.length>=cfg.repeat&&near.length/located.length*100>=cfg.share?near:[],`좌표 확인 가능한 ${located.length}건 중 집 주변 ${near.length}건`);
 rule(3,'집 주변 업무시간 외 사용','집 주변이며 20:00~07:59',located.filter(r=>r.hour!==null),near.filter(r=>r.hour!==null&&(r.hour>=20||r.hour<8)));
 rule(4,'집 주변 주말 사용','집 주변이며 토요일·일요일',located.filter(r=>r.dateOK),near.filter(r=>r.weekend));
 rule(5,'집 주변 동일 가맹점 반복',`같은 가맹점에서 ${cfg.repeat}일 이상 집 주변 사용`,located.filter(r=>r.dateOK&&r.merchant),groups(near.filter(r=>r.dateOK&&r.merchant),r=>r.merchant).filter(g=>new Set(g.map(r=>r.date)).size>=cfg.repeat).flat());
 rule(6,'심야·새벽 사용','22:00~05:59',normal.filter(r=>r.hour!==null),normal.filter(r=>r.hour!==null&&(r.hour>=22||r.hour<6)));
 rule(7,'주말 사용','토요일·일요일',dated,dated.filter(r=>r.weekend));
 rule(8,'업무시간 외 사용','20:00~07:59 (업무시간 가정: 08:00~19:59)',normal.filter(r=>r.hour!==null),normal.filter(r=>r.hour!==null&&(r.hour>=20||r.hour<8)));
 rule(9,'단건 고액 결제',`1건 ${cfg.high.toLocaleString()}원 이상`,normal,normal.filter(r=>r.amount>=cfg.high));
 rule(10,'하루 누적 고액 사용',`하루 합계 ${cfg.daily.toLocaleString()}원 이상`,dated,groups(dated,r=>r.date).filter(g=>sum(g)>=cfg.daily).flat());
 const byMerchantDay=dated.filter(r=>r.merchant);
 rule(11,'하루 동일 가맹점 빈번 사용',`동일 가맹점·동일 날짜 ${cfg.repeat}건 이상`,byMerchantDay,groups(byMerchantDay,r=>JSON.stringify([r.merchant,r.date])).filter(g=>g.length>=cfg.repeat).flat());
 const split=[];for(const g of groups(timed.filter(r=>r.merchant),r=>JSON.stringify([r.merchant,r.date]))){g.sort((a,b)=>a.stamp-b.stamp);const marks=new Array(g.length+1).fill(0);let j=0,total=0;for(let i=0;i<g.length;i++){while(j<g.length&&g[j].stamp-g[i].stamp<=3600000)total+=g[j++].amount;if(j-i>=cfg.repeat&&total>=cfg.high){marks[i]++;marks[j]--}total-=g[i].amount}let active=0;for(let i=0;i<g.length;i++){active+=marks[i];if(active>0)split.push(g[i])}}
 rule(12,'짧은 시간 분할 결제 후보',`동일 가맹점 60분 안에 ${cfg.repeat}건 이상, 합계 ${cfg.high.toLocaleString()}원 이상`,timed.filter(r=>r.merchant),split,'합법적 별도 구매 또는 정산 건일 수 있으므로 영수증 확인');
 rule(13,'동일 거래 중복 후보','가맹점·날짜·시간·금액이 모두 같은 거래 2건 이상',timed.filter(r=>r.merchant),groups(timed.filter(r=>r.merchant),r=>JSON.stringify([r.merchant,r.stamp,r.amount])).filter(g=>g.length>=2).flat(),'중복 입력·별도 구매 가능성 확인. 승인번호를 사용하지 않는 후보 탐지');
 rule(14,'동일 금액 반복 결제',`동일 가맹점·동일 금액이 ${cfg.repeat}일 이상 반복`,byMerchantDay,groups(byMerchantDay,r=>JSON.stringify([r.merchant,r.amount])).filter(g=>new Set(g.map(r=>r.date)).size>=cfg.repeat).flat(),'정기 결제와 계약 요금 여부 확인');
 const merchants=normal.filter(r=>r.merchant);rule(15,'특정 가맹점 지출 집중',`한 가맹점이 양수 정상 사용액의 40% 이상, ${cfg.repeat}건 이상`,merchants,groups(merchants,r=>r.merchant).filter(g=>g.length>=cfg.repeat&&sum(g)>=sum(normal)*.4).flat());
 rule(16,'하루 결제 건수 과다','하루 5건 이상',dated,groups(dated,r=>r.date).filter(g=>g.length>=5).flat());
 const amounts=normal.map(r=>r.amount).sort((a,b)=>a-b),n=amounts.length,median=n?(n%2?amounts[(n-1)/2]:(amounts[n/2-1]+amounts[n/2])/2):0;
 rule(17,'평소보다 큰 금액 후보',`정상 거래 10건 이상일 때 중앙값의 3배 이상이면서 ${cfg.high.toLocaleString()}원 이상`,n>=10?normal:[],normal.filter(r=>n>=10&&r.amount>=median*3&&r.amount>=cfg.high),n>=10?`현재 필터 내 금액 중앙값 ${median.toLocaleString()}원`:'비교에 필요한 정상 거래 최소 10건');
 rule(18,'주거지에서 먼 고액 사용',`집에서 ${cfg.farKm}km 이상이며 ${cfg.high.toLocaleString()}원 이상`,located,located.filter(r=>r.dist>=cfg.farKm*1000&&r.amount>=cfg.high),'출장·외근 여부 확인');
 const mobility=located.filter(r=>r.stamp!==null).sort((a,b)=>a.stamp-b.stamp),jumps=[];for(let i=1;i<mobility.length;i++){const a=mobility[i-1],b=mobility[i],hours=(b.stamp-a.stamp)/3600000,km=geo(a.point,b.point)/1000;if(hours>=0&&hours<=3&&km>=30&&(hours===0||km/hours>=150))jumps.push(a,b)}
 rule(19,'짧은 시간 장거리 결제 후보','연속된 위치 확인 거래: 3시간 이내·30km 이상·평균 150km/h 이상 (동시 결제 포함)',mobility.length>=2?mobility:[],jumps,'가맹점 등록 주소 간 직선거리입니다. 실제 이동·카드 소지자 위치를 입증하지 않습니다.');
 const cancellations=rows.filter(r=>r.canceled),cancelBase=rows.some(r=>String(r.slip||'').trim()||r.amount<0)?rows:[];
 rule(20,'취소·환불 비중 높음',`취소·환불 ${cfg.repeat}건 이상이며 전체 거래의 20% 이상`,cancelBase,cancellations.length>=cfg.repeat&&cancellations.length/rows.length>=.2?cancellations:[],`취소·환불 ${cancellations.length}건 / 전체 ${rows.length}건`);
 return {settings:cfg,scopeCount:rows.length,rules:result};
}
const api={run,defaults};root.CardScenarios=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
