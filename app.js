    const TAX_BANDS = [
      {label:'1,400만원 이하', pts:[350,700,1050]},
      {label:'1,400~5,000만원', pts:[2300,3200,4100]},
      {label:'5,000~8,800만원', pts:[5950,6900,7850]},
      {label:'8,800~1억5,000만원', pts:[10350,11900,13450]},
      {label:'1억5,000~3억원', pts:[18750,22500,26250]},
      {label:'3~5억원', pts:[35000,40000,45000]},
      {label:'5~10억원', pts:[62500,75000,87500]},
      {label:'10억원 초과', pts:[105000,125000,150000]}
    ];
    const RENT_BANDS = [
      {label:'40 ~ 60만원', lo:40, hi:60},
      {label:'60 ~ 80만원', lo:60, hi:80},
      {label:'80 ~ 100만원', lo:80, hi:100},
      {label:'100 ~ 120만원', lo:100, hi:120},
      {label:'120 ~ 150만원', lo:120, hi:150},
      {label:'150 ~ 200만원', lo:150, hi:200},
      {label:'200 ~ 250만원', lo:200, hi:250}
    ];
    const OTHER_BANDS = [
      {label:'0 ~ 10만원', lo:0, hi:10},
      {label:'10 ~ 20만원', lo:10, hi:20},
      {label:'20 ~ 30만원', lo:20, hi:30},
      {label:'30 ~ 50만원', lo:30, hi:50},
      {label:'50 ~ 80만원', lo:50, hi:80}
    ];

    const $ = id => document.getElementById(id);

    function mid(b){ return (b.lo+b.hi)/2; }
    function nationalTax(tb){
      tb=Math.max(0,tb);
      if(tb<=1400) return tb*.06;
      if(tb<=5000) return 84+(tb-1400)*.15;
      if(tb<=8800) return 624+(tb-5000)*.24;
      if(tb<=15000) return 1536+(tb-8800)*.35;
      if(tb<=30000) return 3706+(tb-15000)*.38;
      if(tb<=50000) return 9406+(tb-30000)*.40;
      if(tb<=100000) return 17406+(tb-50000)*.42;
      return 38406+(tb-100000)*.45;
    }
    function totalIncomeTax(tb){
      const n=nationalTax(tb);
      return n+n*.10; // 개인지방소득세 표준세율 = 소득세율의 10% 수준 구조
    }
    function taxSaved(tb,deductible){
      return Math.max(0,totalIncomeTax(tb)-totalIncomeTax(Math.max(0,tb-deductible)));
    }
    function calcExpense(rentMonthly, otherMonthly, months, record, carCount, insurance){
      const rent=rentMonthly*months;
      const other=otherMonthly*months;
      const total=rent+other;
      const recordLimit=1500*months/12;
      const depCap=800*months/12;

      if(carCount==='extra' && insurance==='no'){
        return {rent,other,total,recordLimit,depCap,businessRate:0,businessUse:0,depEquivalent:0,depRecognized:0,depExcess:0,deductible:0,insuranceBlocked:true};
      }

      let businessRate;
      if(record==='none') businessRate = total>0 ? Math.min(1,recordLimit/total) : 1;
      else businessRate = Number(record);

      const businessUse=total*businessRate;
      const depEquivalent=rent*.70*businessRate;
      const depRecognized=Math.min(depEquivalent,depCap);
      const depExcess=Math.max(0,depEquivalent-depCap);
      const deductible=Math.max(0,businessUse-depExcess);
      return {rent,other,total,recordLimit,depCap,businessRate,businessUse,depEquivalent,depRecognized,depExcess,deductible,insuranceBlocked:false};
    }
    function money(v){
      if(!Number.isFinite(v)) return '-';
      const r=Math.round(v);
      if(r>=10000){
        const eok=(r/10000).toFixed(r%10000===0?0:2).replace(/\.00$/,'');
        return `${eok}억원`;
      }
      return `${r.toLocaleString('ko-KR')}만원`;
    }
    function pct(v){ return `${(v*100).toFixed(1)}%`; }

    function getState(){
      return {
        taxBand:Number($('taxBand').value), rentBand:Number($('rentBand').value), otherBand:Number($('otherBand').value),
        months:Number($('months').value), record:$('record').value, carCount:$('carCount').value,
        insurance:$('insurance').value, bookType:$('bookType').value
      };
    }

    function scenarioRange(state){
      const tpts=TAX_BANDS[state.taxBand].pts;
      const rb=RENT_BANDS[state.rentBand]; const ob=OTHER_BANDS[state.otherBand];
      const costPairs=[[rb.lo,ob.lo],[mid(rb),mid(ob)],[rb.hi,ob.hi]];
      const savings=[]; const deductibles=[]; const cash=[];
      for(const tb of tpts){
        for(const [r,o] of costPairs){
          const c=calcExpense(r,o,state.months,state.record,state.carCount,state.insurance);
          savings.push(taxSaved(tb,c.deductible)); deductibles.push(c.deductible); cash.push(c.total);
        }
      }
      return {savingMin:Math.min(...savings),savingMax:Math.max(...savings),dedMin:Math.min(...deductibles),dedMax:Math.max(...deductibles),cashMin:Math.min(...cash),cashMax:Math.max(...cash)};
    }

    function render(){
      const s=getState();
      $('insuranceWrap').style.display=s.carCount==='extra'?'flex':'none';
      const rb=RENT_BANDS[s.rentBand], ob=OTHER_BANDS[s.otherBand], tb=TAX_BANDS[s.taxBand];
      const calc=calcExpense(mid(rb),mid(ob),s.months,s.record,s.carCount,s.insurance);
      const range=scenarioRange(s);
      const tbMid=tb.pts[1];
      const saving=taxSaved(tbMid,calc.deductible);
      const net=Math.max(0,calc.total-saving);

      $('cashOut').textContent=money(calc.total);
      $('cashRange').textContent=`구간 범위 ${money(range.cashMin)} ~ ${money(range.cashMax)}`;
      $('deductible').textContent=money(calc.deductible);
      $('deductibleSub').textContent=`업무사용비율 ${pct(calc.businessRate)} · 감가상각 상당액 이월 ${money(calc.depExcess)}`;
      $('taxSaving').textContent=money(saving);
      $('taxRange').textContent=`예상 범위 ${money(range.savingMin)} ~ ${money(range.savingMax)}`;
      $('netCost').textContent=money(net);
      $('savingRate').textContent=`현금지출 대비 세금 절감 ${pct(calc.total? saving/calc.total:0)}`;

      const depRatio=calc.depCap?calc.depEquivalent/calc.depCap:0;
      const recRatio=calc.recordLimit?calc.total/calc.recordLimit:0;
      $('depFill').style.width=`${Math.min(100,depRatio*100)}%`;
      $('recordFill').style.width=`${Math.min(100,recRatio*100)}%`;
      $('depText').textContent=`${money(calc.depEquivalent)} / ${money(calc.depCap)}`;
      $('recordText').textContent=`${money(calc.total)} / ${money(calc.recordLimit)}`;

      const c=$('mainCallout');
      let cls='good', title='현재 선택은 주요 당해연도 기준 안쪽입니다.', body='';
      if(calc.insuranceBlocked){
        cls='danger'; title='추가 차량의 보험 요건을 먼저 확인해야 합니다.';
        body='현재 선택에서는 업무전용자동차보험 요건 미충족으로 필요경비 인정액을 0원으로 표시했습니다. 실제 장기렌트 계약의 운전자 한정·보험 구조를 세무대리인과 확인하세요.';
      } else {
        const issues=[];
        if(calc.depExcess>0) issues.push(`감가상각비 상당액 한도 초과 ${money(calc.depExcess)}는 당해연도 불산입 후 이월 대상`);
        if(s.record==='none' && calc.total>calc.recordLimit) issues.push(`운행기록 미작성으로 업무사용비율이 ${pct(calc.businessRate)}로 제한`);
        if(issues.length){cls='warn'; title='세무상 경계구간을 넘었습니다.'; body=issues.join(' · ');}
        else {
          const depHeadroom=Math.max(0,calc.depCap-calc.depEquivalent);
          const recordHeadroom=Math.max(0,calc.recordLimit-calc.total);
          body=`감가상각비 상당액 한도 여유 ${money(depHeadroom)} · 운행기록 미작성 기준 여유 ${money(recordHeadroom)}. 업무사용 100%라면 월 렌트료 약 95.2만원이 800만원 한도의 대표적인 경계이며, 렌트료+기타차량비 월평균 약 125만원이 1,500만원 기준의 경계입니다.`;
        }
      }
      if(s.bookType==='unknown'){
        cls='warn'; title='장부유형 확인이 필요합니다.';
        body='이 계산기는 복식부기의무자에 대한 업무용승용차 특례를 중심으로 계산합니다. 간편장부 대상이면 동일한 방식으로 신고하지 않을 수 있으므로 신고서 또는 세무대리인을 통해 장부유형을 확인하세요.';
      }
      c.className=`callout ${cls}`;
      c.innerHTML=`<strong>${title}</strong>${body}`;

      renderCompare(s);
    }

    function renderCompare(s){
      const body=$('compareBody'); body.innerHTML='';
      const ob=OTHER_BANDS[s.otherBand]; const tb=TAX_BANDS[s.taxBand].pts[1];
      RENT_BANDS.forEach((rb,i)=>{
        const calc=calcExpense(mid(rb),mid(ob),s.months,s.record,s.carCount,s.insurance);
        const save=taxSaved(tb,calc.deductible); const net=Math.max(0,calc.total-save);
        const tr=document.createElement('tr'); if(i===s.rentBand) tr.className='active';
        const tag=i===s.rentBand?' <span class="pill">선택</span>':'';
        tr.innerHTML=`<td>${rb.label}${tag}</td><td>${money(mid(rb))}</td><td>${money(calc.total)}</td><td>${money(calc.deductible)}</td><td>${money(save)}</td><td>${money(net)}</td>`;
        body.appendChild(tr);
      });
    }

    function boot(){
      try{
        ['taxBand','rentBand','otherBand','months','record','carCount','insurance','bookType'].forEach(function(id){
          var el=$(id);
          if(!el) throw new Error('필수 입력 항목을 찾을 수 없습니다: '+id);
          el.addEventListener('change',render);
        });
        render();
        var status=$('scriptStatus');
        if(status) status.style.display='none';
      }catch(err){
        var status=$('scriptStatus');
        if(status){
          status.className='callout danger';
          status.innerHTML='<strong>계산기 실행 오류</strong>GitHub Pages에서 새로고침해 주세요. 오류: '+(err && err.message ? err.message : String(err));
        }
        console.error(err);
      }
    }
    boot();
