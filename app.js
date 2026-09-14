(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const temperature=$('#temperature'), ozone=$('#ozone'), checkBtn=$('#checkBtn'), liveBtn=$('#liveBtn'), demoBtn=$('#demoBtn');
  const saveBtn=$('#saveBtn'), clearBtn=$('#clearBtn'), formError=$('#formError'), resultCard=$('#resultCard'), resultGem=$('#resultGem');
  const resultTitle=$('#resultTitle'), resultMain=$('#resultMain'), resultReason=$('#resultReason'), sourceNote=$('#sourceNote');
  const valueRow=$('#valueRow'), tempValue=$('#tempValue'), ozoneValue=$('#ozoneValue'), historyEmpty=$('#historyEmpty'), historyList=$('#historyList');
  const bgm=$('#bgm'), bgmToggle=$('#bgmToggle'), bgmHint=$('#bgmHint');

  const PAPER={sample:91,period:'2025년 4~6월',r:-0.0697,p:0.5115};
  const STORAGE='brb-ozone-heart-rune-history-v1';
  let currentResult=null;

  const num=(v)=>v===''||v==null?null:Number.isFinite(Number(v))?Number(v):null;
  const validTemp=(n)=>n!=null&&n>=-40&&n<=60;
  const validOzone=(n)=>n!=null&&n>=0&&n<=1000;
  const setError=(m='')=>formError.textContent=m;

  function gemClass(source){
    if(source==='live')return 'gem-green';
    if(source==='manual')return 'gem-pink';
    if(source==='demo')return 'gem-purple';
    if(source==='saved')return 'gem-red';
    return 'gem-orange';
  }
  function sourceLabel(source){return ({live:'실시간',manual:'직접 입력',demo:'예시',tempOnly:'판단 보류'})[source]||'확인';}
  function applyGem(source){resultGem.className=`gem-heart ${gemClass(source)}`;}

  function showTempOnly(t){
    currentResult={timestamp:new Date().toISOString(),temperature:t,ozone:null,source:'tempOnly'};
    applyGem('tempOnly');
    resultCard.className='result-card ornate-card state-temp-only';
    resultTitle.textContent='판단 보류';
    resultMain.textContent=`${t.toFixed(1)}°C만으로 오존을 정하지 않아요.`;
    tempValue.textContent=`기온 ${t.toFixed(1)}°C`;
    ozoneValue.textContent='오존 미확인';
    valueRow.hidden=false;
    resultReason.textContent=`연구 결과 r=${PAPER.r}, p=${PAPER.p}`;
    sourceNote.textContent='실제 오존 값을 함께 확인해 주세요.';
    saveBtn.disabled=false;
  }

  function showMeasured(t,o,source,detail=''){
    currentResult={timestamp:new Date().toISOString(),temperature:t,ozone:o,source};
    applyGem(source);
    resultCard.className=`result-card ornate-card state-${source}`;
    resultTitle.textContent=source==='live'?'현재값 확인':source==='demo'?'예시 체험':'직접 확인';
    resultMain.textContent=`기온 ${t.toFixed(1)}°C · 오존 ${o.toFixed(1)} µg/m³`;
    tempValue.textContent=`기온 ${t.toFixed(1)}°C`;
    ozoneValue.textContent=`오존 ${o.toFixed(1)} µg/m³`;
    valueRow.hidden=false;
    resultReason.textContent='기온 때문에 오존이 높아졌다고 단정하지 않아요.';
    sourceNote.textContent=detail||'기온과 실제 오존 값을 함께 봅니다.';
    saveBtn.disabled=false;
  }

  function checkInputs(){
    setError('');
    const t=num(temperature.value),o=num(ozone.value);
    if(!validTemp(t)){setError('기온은 -40~60°C로 입력해 주세요.');temperature.focus();return;}
    if(o!=null&&!validOzone(o)){setError('오존은 0~1000 µg/m³로 입력해 주세요.');ozone.focus();return;}
    o==null?showTempOnly(t):showMeasured(t,o,'manual','직접 입력한 값이에요.');
    resultCard.scrollIntoView({behavior:'smooth',block:'center'});
  }

  async function fetchWithTimeout(url,timeoutMs=8000){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const res=await fetch(url,{signal:controller.signal,cache:'no-store'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      return await res.json();
    }finally{clearTimeout(timer);}
  }

  async function fetchLive(){
    setError('');
    liveBtn.disabled=true;
    liveBtn.textContent='확인 중...';
    try{
      const lat=37.5665,lon=126.9780;
      const w=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=Asia%2FSeoul`;
      const a=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=ozone&timezone=Asia%2FSeoul`;
      const [weather,air]=await Promise.all([fetchWithTimeout(w),fetchWithTimeout(a)]);
      const t=num(weather?.current?.temperature_2m),o=num(air?.current?.ozone);
      if(!validTemp(t)||!validOzone(o))throw new Error('응답 형식 오류');
      temperature.value=t.toFixed(1);ozone.value=o.toFixed(1);
      const time=air?.current?.time||weather?.current?.time||'현재';
      showMeasured(t,o,'live',`서울 현재값 · ${String(time).replace('T',' ')}`);
      resultCard.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(err){
      setError('현재값을 못 불러왔어요. 직접 입력하거나 예시를 눌러 주세요.');
      currentResult=null;applyGem('tempOnly');
      resultTitle.textContent='연결 실패';
      resultMain.textContent='앱은 계속 사용할 수 있어요.';
      resultReason.textContent='직접 입력 또는 예시 체험을 이용해 주세요.';
      sourceNote.textContent=err?.name==='AbortError'?'요청 시간 초과':(err?.message||'연결 실패');
      valueRow.hidden=true;saveBtn.disabled=true;
    }finally{liveBtn.disabled=false;liveBtn.textContent='서울 현재값';}
  }

  function useDemo(){
    setError('');
    const t=28,o=110;
    temperature.value=t.toFixed(1);ozone.value=o.toFixed(1);
    showMeasured(t,o,'demo','예시 데이터예요.');
    resultCard.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function loadHistory(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(x)?x.slice(0,7):[];}catch{return [];}}
  function persistHistory(items){try{localStorage.setItem(STORAGE,JSON.stringify(items.slice(0,7)));return true;}catch{return false;}}
  function fmtDate(iso){const d=new Date(iso);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d);}

  function renderHistory(){
    const items=loadHistory();historyList.innerHTML='';historyEmpty.hidden=items.length>0;
    for(const item of items){
      const el=document.createElement('article');el.className='history-item';
      const ozoneText=item.ozone==null?'오존 미확인':`오존 ${Number(item.ozone).toFixed(1)}`;
      el.innerHTML=`<div class="history-mini ${gemClass(item.source)}" aria-hidden="true"></div><div class="history-meta"><strong>${Number(item.temperature).toFixed(1)}°C · ${ozoneText}</strong><span>${fmtDate(item.timestamp)}</span></div><span class="history-source">${sourceLabel(item.source)}</span>`;
      historyList.appendChild(el);
    }
  }

  function saveCurrent(){
    if(!currentResult)return;
    const items=loadHistory();items.unshift({...currentResult,timestamp:new Date().toISOString()});
    if(!persistHistory(items)){sourceNote.textContent='기록 저장에 실패했어요.';return;}
    renderHistory();saveBtn.textContent='저장 완료';setTimeout(()=>saveBtn.textContent='오늘 기록 저장',1200);
  }
  function clearHistory(){try{localStorage.removeItem(STORAGE);}catch{}renderHistory();}

  async function toggleBgm(){
    if(!bgm||!bgmToggle)return;
    const label=bgmToggle.querySelector('.bgm-label');
    if(!bgm.paused){bgm.pause();bgmToggle.setAttribute('aria-pressed','false');label.textContent='BGM PLAY';return;}
    try{bgm.volume=.34;await bgm.play();bgmToggle.setAttribute('aria-pressed','true');label.textContent='BGM STOP';if(bgmHint)bgmHint.textContent='BGM ON';}
    catch{bgmToggle.setAttribute('aria-pressed','false');label.textContent='BGM FILE NEEDED';if(bgmHint)bgmHint.textContent='assets/bgm.mp3를 넣어 주세요.';}
  }

  checkBtn.addEventListener('click',checkInputs);
  liveBtn.addEventListener('click',fetchLive);
  demoBtn.addEventListener('click',useDemo);
  saveBtn.addEventListener('click',saveCurrent);
  clearBtn.addEventListener('click',clearHistory);
  if(bgmToggle)bgmToggle.addEventListener('click',toggleBgm);
  if(bgm)bgm.addEventListener('error',()=>{if(bgmHint)bgmHint.textContent='assets/bgm.mp3를 넣어 주세요.';});
  [temperature,ozone].forEach(input=>{input.addEventListener('keydown',e=>{if(e.key==='Enter')checkInputs();});input.addEventListener('input',()=>setError(''));});
  renderHistory();
})();