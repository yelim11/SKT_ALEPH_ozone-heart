(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const temperature = $('#temperature');
  const ozone = $('#ozone');
  const checkBtn = $('#checkBtn');
  const liveBtn = $('#liveBtn');
  const demoBtn = $('#demoBtn');
  const saveBtn = $('#saveBtn');
  const clearBtn = $('#clearBtn');
  const formError = $('#formError');
  const resultCard = $('#resultCard');
  const resultGem = $('#resultGem');
  const resultTitle = $('#resultTitle');
  const resultMain = $('#resultMain');
  const resultReason = $('#resultReason');
  const sourceNote = $('#sourceNote');
  const valueRow = $('#valueRow');
  const tempValue = $('#tempValue');
  const ozoneValue = $('#ozoneValue');
  const historyEmpty = $('#historyEmpty');
  const historyList = $('#historyList');
  const bgm = $('#bgm');
  const bgmToggle = $('#bgmToggle');
  const bgmHint = $('#bgmHint');

  const PAPER_RULE = {
    sample: 91,
    period: '2025년 4~6월',
    place: '서울',
    pearsonR: -0.0697,
    pValue: 0.5115,
    conclusion: '전체 표본에서 기온과 오존의 단순한 양의 관계가 확인되지 않았다.'
  };

  const STORAGE_KEY = 'brb-ozone-heart-rune-history-v1';
  let currentResult = null;

  function finiteNumber(value) {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  function validTemp(n) { return n != null && n >= -40 && n <= 60; }
  function validOzone(n) { return n != null && n >= 0 && n <= 1000; }
  function setError(message = '') { formError.textContent = message; }

  function gemClass(source) {
    if (source === 'live') return 'gem-green';
    if (source === 'manual') return 'gem-pink';
    if (source === 'demo') return 'gem-purple';
    if (source === 'saved') return 'gem-red';
    return 'gem-orange';
  }
  function sourceLabel(source) {
    return ({ live: '실시간', manual: '직접 입력', demo: '예시', tempOnly: '판단 보류' })[source] || '확인';
  }
  function applyGem(source) {
    resultGem.className = `gem-heart ${gemClass(source)}`;
  }

  function showTempOnly(temp) {
    currentResult = { timestamp:new Date().toISOString(), temperature:temp, ozone:null, source:'tempOnly' };
    applyGem('tempOnly');
    resultCard.className = 'result-card ornate-card state-temp-only';
    resultTitle.textContent = '판단 보류: 기온만으로 오존을 예측하지 않습니다';
    resultMain.textContent = `${temp.toFixed(1)}°C라는 정보만으로는 오늘의 오존 값을 높다거나 낮다고 단정하지 않습니다.`;
    tempValue.textContent = `기온 ${temp.toFixed(1)}°C`;
    ozoneValue.textContent = '오존 값 미확인';
    valueRow.hidden = false;
    resultReason.textContent = `과제 10 연구의 ${PAPER_RULE.sample}일 분석에서 Pearson r=${PAPER_RULE.pearsonR}, p=${PAPER_RULE.pValue}였기 때문에, 이 앱의 핵심 규칙은 “기온 단독 예측 금지”입니다.`;
    sourceNote.textContent = '다음 행동: “서울 현재값 자동 확인”을 누르거나 실제 오존 값을 직접 입력해 주세요.';
    saveBtn.disabled = false;
  }

  function showMeasured(temp, o3, source, detail = '') {
    currentResult = { timestamp:new Date().toISOString(), temperature:temp, ozone:o3, source };
    applyGem(source);
    resultCard.className = `result-card ornate-card state-${source}`;
    resultTitle.textContent = source === 'live' ? '실제 오존 값까지 함께 확인했습니다' : source === 'demo' ? '예시 데이터로 논문 규칙을 체험했습니다' : '직접 입력한 오존 값을 함께 확인했습니다';
    resultMain.textContent = `기온 ${temp.toFixed(1)}°C · 오존 ${o3.toFixed(1)} µg/m³를 함께 봅니다. 이 앱은 두 값이 같이 보여도 “기온이 높아서 오존이 높아졌다”라고 단정하지 않습니다.`;
    tempValue.textContent = `기온 ${temp.toFixed(1)}°C`;
    ozoneValue.textContent = `오존 ${o3.toFixed(1)} µg/m³`;
    valueRow.hidden = false;
    resultReason.textContent = `논문 결과(${PAPER_RULE.period} ${PAPER_RULE.place} ${PAPER_RULE.sample}일, r=${PAPER_RULE.pearsonR}, p=${PAPER_RULE.pValue})를 적용해 실제 오존 값을 우선 확인하고, 기온만으로 오존을 추정하지 않습니다.`;
    sourceNote.textContent = detail || '보석 하트 색은 데이터 확인 상태를 나타낼 뿐, 공식 대기질 위험 등급이 아닙니다.';
    saveBtn.disabled = false;
  }

  function checkInputs() {
    setError('');
    const t = finiteNumber(temperature.value);
    const o = finiteNumber(ozone.value);
    if (!validTemp(t)) { setError('기온을 -40~60°C 사이 숫자로 입력해 주세요.'); temperature.focus(); return; }
    if (o != null && !validOzone(o)) { setError('오존 값은 0~1000 µg/m³ 사이 숫자로 입력해 주세요.'); ozone.focus(); return; }
    if (o == null) showTempOnly(t); else showMeasured(t, o, 'manual', '직접 입력한 값입니다. 수치를 다시 확인하고 저장할 수 있습니다.');
    resultCard.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  async function fetchWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal:controller.signal, cache:'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally { clearTimeout(timer); }
  }

  async function fetchLive() {
    setError('');
    liveBtn.disabled = true;
    liveBtn.textContent = '서울 현재값 확인 중...';
    try {
      const lat = 37.5665, lon = 126.9780;
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=Asia%2FSeoul`;
      const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=ozone&timezone=Asia%2FSeoul`;
      const [w, a] = await Promise.all([fetchWithTimeout(weatherUrl), fetchWithTimeout(airUrl)]);
      const t = finiteNumber(w?.current?.temperature_2m);
      const o = finiteNumber(a?.current?.ozone);
      if (!validTemp(t) || !validOzone(o)) throw new Error('응답 형식이 예상과 다릅니다.');
      temperature.value = t.toFixed(1);
      ozone.value = o.toFixed(1);
      const timeText = a?.current?.time || w?.current?.time || '현재';
      showMeasured(t, o, 'live', `서울 시청 기준 좌표의 공개 API 현재값입니다. 기준 시각: ${String(timeText).replace('T',' ')}`);
      resultCard.scrollIntoView({ behavior:'smooth', block:'center' });
    } catch (err) {
      setError('현재값을 불러오지 못했습니다. 인터넷 연결을 확인하거나, 직접 값을 입력하거나, 예시 데이터로 체험해 주세요.');
      showFailureState(err);
    } finally {
      liveBtn.disabled = false;
      liveBtn.textContent = '서울 현재값 자동 확인';
    }
  }

  function showFailureState(err) {
    currentResult = null;
    applyGem('tempOnly');
    resultCard.className = 'result-card ornate-card state-failure';
    resultTitle.textContent = '자동 확인이 실패해도 앱은 멈추지 않습니다';
    resultMain.textContent = '현재값 연결에 실패했습니다. 수동 입력과 예시 데이터 기능은 계속 사용할 수 있습니다.';
    resultReason.textContent = '과제의 “잘못된 입력이나 실패 상황에서도 멈추지 않기” 조건을 위해 오류를 사용자 행동으로 바꿔 안내합니다.';
    sourceNote.textContent = `오류 정보: ${err?.name === 'AbortError' ? '요청 시간 초과' : (err?.message || '연결 실패')}`;
    valueRow.hidden = true;
    saveBtn.disabled = true;
  }

  function useDemo() {
    setError('');
    const t = 28.0, o = 110.0;
    temperature.value = t.toFixed(1); ozone.value = o.toFixed(1);
    showMeasured(t, o, 'demo', '예시 데이터 28.0°C / 110.0 µg/m³입니다. 실제 개인정보나 실제 관측 원본을 포함하지 않습니다.');
    resultCard.scrollIntoView({ behavior:'smooth', block:'center' });
  }

  function loadHistory() {
    try { const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(raw) ? raw.slice(0,7) : []; }
    catch { return []; }
  }
  function persistHistory(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0,7))); return true; }
    catch { return false; }
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '기록 시각 없음';
    return new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function renderHistory() {
    const items = loadHistory();
    historyList.innerHTML = '';
    historyEmpty.hidden = items.length > 0;
    for (const item of items) {
      const el = document.createElement('article');
      el.className = 'history-item';
      const ozoneText = item.ozone == null ? '오존 미확인' : `오존 ${Number(item.ozone).toFixed(1)} µg/m³`;
      el.innerHTML = `<div class="history-mini ${gemClass(item.source)}" aria-hidden="true"></div><div class="history-meta"><strong>${Number(item.temperature).toFixed(1)}°C · ${ozoneText}</strong><span>${fmtDate(item.timestamp)} · 기온 단독 예측 안 함</span></div><span class="history-source">${sourceLabel(item.source)}</span>`;
      historyList.appendChild(el);
    }
  }
  function saveCurrent() {
    if (!currentResult) return;
    const items = loadHistory();
    items.unshift({ ...currentResult, timestamp:new Date().toISOString() });
    if (!persistHistory(items)) { sourceNote.textContent = '브라우저 저장 공간을 사용할 수 없어 기록 저장에 실패했습니다. 체크 기능은 계속 사용할 수 있습니다.'; return; }
    renderHistory();
    saveBtn.textContent = '저장 완료';
    setTimeout(() => { saveBtn.textContent = '오늘의 기록에 저장'; }, 1200);
  }
  function clearHistory() { try { localStorage.removeItem(STORAGE_KEY); } catch {} renderHistory(); }

  async function toggleBgm() {
    if (!bgm || !bgmToggle) return;
    const label = bgmToggle.querySelector('.bgm-label');
    if (!bgm.paused) {
      bgm.pause();
      bgmToggle.setAttribute('aria-pressed','false');
      label.textContent = 'BGM PLAY';
      return;
    }
    try {
      bgm.volume = 0.34;
      await bgm.play();
      bgmToggle.setAttribute('aria-pressed','true');
      label.textContent = 'BGM STOP';
      if (bgmHint) bgmHint.textContent = 'BGM ON · assets/bgm.mp3';
    } catch {
      bgmToggle.setAttribute('aria-pressed','false');
      label.textContent = 'BGM FILE NEEDED';
      if (bgmHint) bgmHint.textContent = 'assets/bgm.mp3 파일을 넣으면 재생됩니다.';
    }
  }

  checkBtn.addEventListener('click', checkInputs);
  liveBtn.addEventListener('click', fetchLive);
  demoBtn.addEventListener('click', useDemo);
  saveBtn.addEventListener('click', saveCurrent);
  clearBtn.addEventListener('click', clearHistory);
  if (bgmToggle) bgmToggle.addEventListener('click', toggleBgm);
  if (bgm) bgm.addEventListener('error', () => { if (bgmHint) bgmHint.textContent = 'assets/bgm.mp3 파일을 넣으면 재생됩니다.'; });
  [temperature, ozone].forEach((input) => {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkInputs(); });
    input.addEventListener('input', () => setError(''));
  });
  renderHistory();
})();
