const $ = (s) => document.querySelector(s);
const levels = [
  { max:15, name:'낮음', color:'#f4dc3b', message:'기온이 낮은 편이에요. 오존 증가 가능성이 비교적 낮은 단계예요.' },
  { max:20, name:'보통', color:'#35ca63', message:'온화한 기온이에요. 실제 대기질 측정값도 함께 확인해 주세요.' },
  { max:25, name:'주의', color:'#f08a24', message:'기온이 올라가고 있어요. 오존 농도가 높아질 가능성을 주의해 주세요.' },
  { max:29, name:'높음', color:'#ef75ba', message:'기온이 높은 편이에요. 외출 전 현재 오존·대기질 정보를 확인해 주세요.' },
  { max:32, name:'매우 높음', color:'#9b4fe0', message:'높은 기온이 이어져요. 오존 농도 상승 가능성을 염두에 두세요.' },
  { max:Infinity, name:'매우 위험', color:'#e63248', message:'매우 높은 기온이에요. 실제 오존 측정값을 반드시 확인해 주세요.' }
];

function burst(){
  const box=$('#sparkles'); box.innerHTML='';
  for(let i=0;i<28;i++){
    const s=document.createElement('i');
    s.textContent=Math.random()>.45?'✦':'♥';
    s.style.left=`${Math.random()*100}%`; s.style.top=`${Math.random()*100}%`;
    s.style.animationDelay=`${Math.random()*.2}s`; box.appendChild(s);
  }
  setTimeout(()=>box.innerHTML='',1300);
}

function showResult(){
  const value=Number($('#temperature').value);
  if(!Number.isFinite(value)||value<-30||value>60){ alert('기온은 -30°C~60°C 사이로 입력해줘!'); return; }
  const level=levels.find(x=>value<=x.max);
  $('#resultHeart').style.setProperty('--heart',level.color);
  $('#resultName').textContent=level.name;
  $('#resultText').textContent=`${value}°C · ${level.message}`;
  const result=$('#resultCard'); result.classList.remove('show'); void result.offsetWidth; result.classList.add('show');
  $('#flash').classList.remove('go'); void $('#flash').offsetWidth; $('#flash').classList.add('go');
  $('#duke').classList.remove('jump'); void $('#duke').offsetWidth; $('#duke').classList.add('jump');
  burst();
}

$('#checkBtn').addEventListener('click',showResult);
$('#temperature').addEventListener('keydown',e=>{if(e.key==='Enter')showResult()});
$('#closeResult').addEventListener('click',()=>$('#resultCard').classList.remove('show'));

const bgm=$('#bgm'), bgmFile=$('#bgmFile'), bgmToggle=$('#bgmToggle'), volume=$('#volume');
bgm.volume=Number(volume.value);
volume.addEventListener('input',()=>bgm.volume=Number(volume.value));
bgmToggle.addEventListener('click',async()=>{
  try{if(bgm.paused)await bgm.play();else bgm.pause()}catch{bgmFile.click()}
  bgmToggle.textContent=bgm.paused?'♫ BGM':'❚❚ BGM';
});
bgmFile.addEventListener('change',async e=>{
  const f=e.target.files?.[0]; if(!f)return;
  bgm.src=URL.createObjectURL(f); bgm.loop=true;
  try{await bgm.play()}catch{}
  bgmToggle.textContent='❚❚ BGM';
});

document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#resultCard').classList.remove('show')});
