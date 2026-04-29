// ============ CONSTANTS ============
const DAY_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const CIRC = 339.3;
const TODAY = new Date().toDateString();

// ============ SCHEDULE ============
function makeSched(day) {
  const isWork = [1,2,3,4,5].includes(day);
  const isBas = [1,3].includes(day);
  const isNightA = [1,2,4,5].includes(day);
  const isSellon = [1,3,5,6].includes(day);
  const isAHA = [2,4].includes(day);
  const isKeto = [1,3,5,0].includes(day);
  const gymMap = {5:'Legs Heavy 🏋️',6:'Push Heavy 💪',0:'Pull Heavy 🔥',2:'Push DB+BW 💪',4:'Pull DB+BW 🔥'};

  const nightSkin = isNightA ? 'Retacnyl (คืน A) — buffer → Retacnyl → lock in' : 'Skinoren Rest (คืน B)';
  const bodyTxt = isSellon ? 'Sellon 2.5% ทิ้งไว้ 4 นาที + Body Moisturizer' : isAHA ? 'Mizumi AHA Body ทิ้งไว้ 3 นาที' : 'พักผิวตัว';
  const hairTxt = isKeto ? 'Ketoconazole 2% ทิ้งไว้ 3 นาที' : 'แชมพูธรรมดา';

  const s = [];

  s.push({id:'b_wake',t:'07:00',ico:'🌅',name:'ตื่นนอน + เริ่มวัน',subs:[
    {id:'sw1',n:'ดื่มน้ำ 500ml ก่อนทำอะไร',sec:0},
    {id:'sw2',n:'Finasteride 1mg กับอาหาร',sec:0},
    {id:'sw3',n:'กินมื้อเช้า — ห้ามข้าม',sec:0},
  ]});

  s.push({id:'b_skin_am',t:'07:15',ico:'✨',name:'Skincare เช้า',subs:[
    {id:'sa1',n:'Cetaphil SA ล้างหน้า',sec:60},
    {id:'sa2',n:'Benzac 5% spot treatment (ถ้ามีตุ่ม) รอแห้ง 30 วิ',sec:30},
    {id:'sa3',n:'Clinda M ตาม Benzac (เฉพาะวันที่ใช้ Benzac)',sec:0},
    {id:'sa4',n:'Skinoren ทาบางๆ ทั่วหน้า',sec:0},
    {id:'sa5',n:'Clearnose Moist',sec:0},
    {id:'sa6',n:'Mizumi Matte&Oil SPF ☀️ ห้ามข้าม',sec:0},
  ]});

  s.push({id:'b_neck_am',t:'07:30',ico:'🧘',name:'ยืดเช้า — คอ/บ่า/ไมเกรน',subs:[
    {id:'sn1',n:'Chin Tuck ดึงคางเข้า ค้าง 5 วิ × 10',sec:0},
    {id:'sn2',n:'Neck Side Bend ซ้าย',sec:30},
    {id:'sn3',n:'Neck Side Bend ขวา',sec:30},
    {id:'sn4',n:'Upper Trap Stretch ซ้าย',sec:40},
    {id:'sn5',n:'Upper Trap Stretch ขวา',sec:40},
    {id:'sn6',n:'Levator Scapulae ซ้าย (มองรักแร้)',sec:40},
    {id:'sn7',n:'Levator Scapulae ขวา',sec:40},
    {id:'sn8',n:'Shoulder Roll × 10 ทั้งสองทิศ',sec:0},
    {id:'sn9',n:'Cat-Cow × 10 ช้าๆ',sec:0},
    {id:'sn10',n:'Temple + Scalp Massage',sec:120},
  ]});

  if (isBas) {
    s.push({id:'b_ex',t:'08:00',ico:'🏀',name:'บาสเกตบอล + Upper Light',subs:[
      {id:'se1',n:'Warm-up: Ankle Circle 15 ครั้ง/ข้าง',sec:0},
      {id:'se2',n:'Warm-up: High Knee Jog',sec:60},
      {id:'se3',n:'Warm-up: Hip Circle + Squat Jump เบาๆ',sec:30},
      {id:'se4',n:'เล่นบาส',sec:0},
      {id:'se5',n:'Upper Light: DB Shoulder Press 2×12 เบา — พัก',sec:60},
      {id:'se6',n:'Upper Light: DB Row 2×12 เบา — พัก',sec:60},
      {id:'se7',n:'Stretch: Quad ซ้าย',sec:30},{id:'se8',n:'Stretch: Quad ขวา',sec:30},
      {id:'se9',n:'Stretch: Calf ซ้าย',sec:40},{id:'se10',n:'Stretch: Calf ขวา',sec:40},
      {id:'se11',n:'Stretch: Hip Flexor ซ้าย',sec:30},{id:'se12',n:'Stretch: Hip Flexor ขวา',sec:30},
      {id:'se13',n:'Stretch: Pigeon Pose ซ้าย',sec:45},{id:'se14',n:'Stretch: Pigeon Pose ขวา',sec:45},
    ]});
  } else if (gymMap[day]) {
    const gymSubs = getGymSubs(day);
    s.push({id:'b_ex',t:[2,4].includes(day)?'07:45':'08:00',ico:'🏋️',name:gymMap[day],subs:gymSubs});
  }

  if (isWork) {
    s.push({id:'b_work',t:'10:00',ico:'💻',name:'งาน Full Stack',subs:[
      {id:'sk1w',n:'เช็ค task วันนี้',sec:0},
      {id:'sk2w',n:'20-20-20: มองไกล 20 ฟุต ทุก 20 นาที',sec:0},
      {id:'sk3w',n:'ดื่มน้ำ 300ml ระหว่างงาน',sec:0},
      {id:'sk4w',n:'ยืดคอ/บ่า 2 นาทีทุกชั่วโมง',sec:120},
    ]});
    s.push({id:'b_lunch',t:'12:00',ico:'🍱',name:'มื้อกลางวัน + พัก',subs:[
      {id:'sl1',n:'กินข้าว — โปรตีน + ผัก ลดข้าวขาว',sec:0},
      {id:'sl2',n:'เดินเบาๆ 10 นาที',sec:600},
      {id:'sl3',n:'ดื่มน้ำ 250ml',sec:0},
    ]});
    s.push({id:'b_side',t:'18:30',ico:'📦',name:'งานเสริม Reseller',subs:[
      {id:'ss1',n:'ตอบลูกค้า + อัปเดต listing',sec:0},
      {id:'ss2',n:'จัดการ order',sec:0},
    ]});
  } else {
    s.push({id:'b_work',t:'09:00',ico:'📦',name:'งาน Reseller',subs:[
      {id:'sr1',n:'ถ่ายรูปสินค้า',sec:0},
      {id:'sr2',n:'เขียน listing / อัปเดตราคา',sec:0},
      {id:'sr3',n:'จัด inventory',sec:0},
    ]});
    s.push({id:'b_lunch',t:'12:00',ico:'🍱',name:'มื้อกลางวัน',subs:[
      {id:'sl1',n:'กินข้าว — โปรตีน + ผัก',sec:0},
      {id:'sl2',n:'ดื่มน้ำ 250ml',sec:0},
    ]});
  }

  s.push({id:'b_eve',t:'19:00',ico:'🌙',name:'มื้อเย็น — ก่อน 20:00',subs:[
    {id:'se1e',n:'กินข้าวเย็น — ลดคาร์บ เน้นโปรตีน',sec:0},
    {id:'se2e',n:'ดื่มน้ำ 250ml',sec:0},
  ]});

  s.push({id:'b_night',t:'21:00',ico:'🌿',name:'Routine ก่อนนอน',subs:[
    {id:'sni1',n:'ยืดคอ: Chin Tuck × 10 + Neck Side Bend',sec:60},
    {id:'sni2',n:'ยืดบ่า: Upper Trap ซ้าย',sec:40},{id:'sni3',n:'ยืดบ่า: Upper Trap ขวา',sec:40},
    {id:'sni4',n:'ข้อเท้า: Ankle Circle + Alphabet 2 นาที',sec:120},
    {id:'sni5',n:'ข้อเท้า: Calf Raise ช้า 3วิ × 15',sec:0},
    {id:'sni6',n:'ข้อเท้า: Single-leg Stand หลับตา 30วิ/ข้าง',sec:60},
    {id:'sni7',n:`Skincare คืน — ${nightSkin}`,sec:0},
    {id:'sni8',n:'ล้างหน้า Cetaphil SA',sec:60},
    {id:'sni9',n:isNightA?'Cetaphil Lotion buffer บางๆ รอ 5 นาที':'Skinoren ทาบางๆ',sec:isNightA?300:0},
    {id:'sni10',n:isNightA?'Retacnyl pea size ทั่วหน้า':'Clearnose Moist',sec:0},
    {id:'sni11',n:isNightA?'Cetaphil Lotion lock in':'',sec:0},
    {id:'sni12',n:'Minoxidil 5% ทาหนังศีรษะ',sec:0},
    {id:'sni13',n:'รอ Minoxidil แห้ง 20 นาที',sec:1200},
    {id:'sni14',n:'Nectapharma Hair Serum',sec:0},
    {id:'sni15',n:'Magnesium Glycinate 300mg',sec:0},
    {id:'sni16',n:`อาบน้ำ: ${bodyTxt}`,sec:isSellon||isAHA?240:0},
    {id:'sni17',n:`สระผม: ${hairTxt}`,sec:isKeto?180:0},
  ].filter(x=>x.n!=='')});

  s.push({id:'b_sleep',t:'22:30',ico:'🛌',name:'นอน — เป้า 23:00',subs:[
    {id:'ssl1',n:'ปิดหน้าจอทุกชิ้น',sec:0},
    {id:'ssl2',n:'ห้องมืด เย็น เงียบ',sec:0},
  ]});

  return s;
}

function getGymSubs(day) {
  const rest60 = sec => ({sec});
  const maps = {
    2:[
      {id:'g1',n:'Warm-up: Arm Circle + Wall Slide × 10',sec:0},
      {id:'g2',n:'DB Bench Press / Push-up 4×10-12 — พัก',sec:60},
      {id:'g3',n:'DB Shoulder Press 3×12 — พัก',sec:60},
      {id:'g4',n:'DB Lateral Raise 3×15 — พัก',sec:60},
      {id:'g5',n:'DB Incline Press 3×12 — พัก',sec:60},
      {id:'g6',n:'Tricep Ext. / Diamond Push-up 3×12 — พัก',sec:60},
      {id:'g7',n:'Stretch: Cross-body Shoulder ซ้าย',sec:30},{id:'g8',n:'Stretch: Cross-body Shoulder ขวา',sec:30},
      {id:'g9',n:"Stretch: Chest Doorway + Child's Pose",sec:45},
    ],
    4:[
      {id:'g1',n:'Warm-up: Cat-Cow + Thoracic Rotation × 10',sec:0},
      {id:'g2',n:'DB Bent-over Row 4×10 — พัก',sec:60},
      {id:'g3',n:'DB Single-arm Row 3×12/ข้าง — พัก',sec:60},
      {id:'g4',n:'DB Reverse Fly 3×15 — พัก',sec:60},
      {id:'g5',n:'DB Bicep Curl 3×12 — พัก',sec:60},
      {id:'g6',n:'Inverted Row ใต้โต๊ะ 3×8 — พัก',sec:60},
      {id:'g7',n:'Stretch: Lat ซ้าย',sec:30},{id:'g8',n:'Stretch: Lat ขวา',sec:30},
      {id:'g9',n:'Stretch: Thread the Needle + Forward Fold',sec:45},
    ],
    5:[
      {id:'g1',n:'Warm-up: Leg Swing + Hip Circle + BW Squat × 15',sec:0},
      {id:'g2',n:'Leg Press 4×12 — พัก',sec:60},
      {id:'g3',n:'Romanian Deadlift (DB) 3×12 — พัก',sec:60},
      {id:'g4',n:'Goblet Squat (DB) 3×12 — พัก',sec:60},
      {id:'g5',n:'Leg Curl (เครื่อง) 3×15 — พัก',sec:60},
      {id:'g6',n:'Standing Calf Raise 4×20 — พัก',sec:45},
      {id:'g7',n:'Single-leg Calf Raise 3×15/ข้าง — พัก',sec:45},
      {id:'g8',n:'Stretch: Quad + Hamstring',sec:40},
      {id:'g9',n:'Stretch: Hip Flexor Lunge ซ้าย',sec:30},{id:'g10',n:'Stretch: Hip Flexor Lunge ขวา',sec:30},
      {id:'g11',n:'Stretch: Pigeon Pose ซ้าย',sec:45},{id:'g12',n:'Stretch: Pigeon Pose ขวา',sec:45},
    ],
    6:[
      {id:'g1',n:'DB Bench Press หนัก 4×8 — พัก',sec:90},
      {id:'g2',n:'DB Incline Press 3×10 — พัก',sec:90},
      {id:'g3',n:'DB Shoulder Press หนัก 4×8 — พัก',sec:90},
      {id:'g4',n:'Lateral Raise 3×15 — พัก',sec:60},
      {id:'g5',n:'Tricep Pushdown 3×12 — พัก',sec:60},
      {id:'g6',n:'Skull Crusher 3×12 — พัก',sec:60},
      {id:'g7',n:'Stretch: Chest + Cross-body + Tricep',sec:60},
    ],
    0:[
      {id:'g1',n:'Lat Pulldown หนัก 4×8 — พัก',sec:90},
      {id:'g2',n:'Seated Cable Row 4×10 — พัก',sec:90},
      {id:'g3',n:'DB Single-arm Row หนัก 3×10/ข้าง — พัก',sec:90},
      {id:'g4',n:'Face Pull 3×15 — พัก',sec:60},
      {id:'g5',n:'Hammer Curl 3×12 — พัก',sec:60},
      {id:'g6',n:"Stretch: Lat + Child's Pose + Thread the Needle",sec:60},
    ],
  };
  return maps[day] || [];
}

// ============ FOOD DB ============
const FDB = {
  'ไข่':{cal:70,p:6,c:0,f:5,u:'ฟอง'},
  'ข้าว':{cal:180,p:3,c:40,f:0,u:'ทัพพี'},
  'ข้าวกล้อง':{cal:165,p:3,c:35,f:1,u:'ทัพพี'},
  'อกไก่':{cal:165,p:31,c:0,f:4,u:'100g'},
  'สะโพกไก่':{cal:210,p:26,c:0,f:12,u:'100g'},
  'เนื้อวัว':{cal:250,p:26,c:0,f:17,u:'100g'},
  'หมูสันใน':{cal:143,p:26,c:0,f:4,u:'100g'},
  'หมูบด':{cal:250,p:22,c:0,f:18,u:'100g'},
  'ปลาแซลมอน':{cal:208,p:20,c:0,f:13,u:'100g'},
  'ปลาทูน่า':{cal:130,p:28,c:0,f:1,u:'100g'},
  'ปลาทู':{cal:160,p:22,c:0,f:8,u:'100g'},
  'กุ้ง':{cal:85,p:20,c:0,f:1,u:'100g'},
  'นม':{cal:120,p:8,c:12,f:5,u:'แก้ว'},
  'นมไขมันต่ำ':{cal:80,p:8,c:12,f:0,u:'แก้ว'},
  'กล้วย':{cal:90,p:1,c:23,f:0,u:'ลูก'},
  'ขนมปังโฮลวีต':{cal:70,p:3,c:13,f:1,u:'แผ่น'},
  'oats':{cal:150,p:5,c:27,f:3,u:'ถ้วย'},
  'อัลมอนด์':{cal:160,p:6,c:6,f:14,u:'30g'},
  'greek yogurt':{cal:100,p:17,c:6,f:0,u:'ถ้วย'},
  'whey protein':{cal:120,p:25,c:3,f:2,u:'scoop'},
  'ข้าวผัดไข่':{cal:450,p:14,c:58,f:18,u:'จาน'},
  'ข้าวผัดหมู':{cal:500,p:18,c:60,f:20,u:'จาน'},
  'ข้าวผัดกุ้ง':{cal:460,p:20,c:58,f:18,u:'จาน'},
  'ข้าวผัด':{cal:460,p:14,c:58,f:18,u:'จาน'},
  'ข้าวคะน้าหมูกรอบ':{cal:580,p:20,c:62,f:28,u:'จาน'},
  'คะน้าหมูกรอบ':{cal:400,p:18,c:22,f:28,u:'จาน'},
  'ผัดคะน้า':{cal:180,p:10,c:12,f:10,u:'จาน'},
  'กะเพราหมู':{cal:420,p:22,c:45,f:16,u:'จาน'},
  'กะเพราไก่':{cal:380,p:25,c:42,f:12,u:'จาน'},
  'กะเพราเนื้อ':{cal:480,p:28,c:44,f:20,u:'จาน'},
  'กะเพรา':{cal:400,p:22,c:43,f:15,u:'จาน'},
  'ข้าวมันไก่':{cal:480,p:25,c:55,f:15,u:'จาน'},
  'ข้าวหน้าไก่':{cal:420,p:22,c:55,f:10,u:'จาน'},
  'ข้าวต้มไก่':{cal:220,p:16,c:32,f:4,u:'ชาม'},
  'ข้าวต้มหมู':{cal:250,p:15,c:35,f:6,u:'ชาม'},
  'ข้าวต้ม':{cal:235,p:15,c:33,f:5,u:'ชาม'},
  'ข้าวไข่ดาว':{cal:380,p:14,c:42,f:16,u:'จาน'},
  'ก๋วยเตี๋ยวน้ำใส':{cal:280,p:16,c:42,f:4,u:'ชาม'},
  'ก๋วยเตี๋ยวน้ำข้น':{cal:380,p:16,c:48,f:12,u:'ชาม'},
  'ก๋วยเตี๋ยว':{cal:300,p:15,c:45,f:6,u:'ชาม'},
  'ก๋วยเตี๋ยวเนื้อ':{cal:320,p:20,c:42,f:6,u:'ชาม'},
  'ก๋วยเตี๋ยวไก่':{cal:290,p:18,c:42,f:4,u:'ชาม'},
  'บะหมี่น้ำ':{cal:350,p:16,c:52,f:8,u:'ชาม'},
  'เส้นใหญ่ผัด':{cal:480,p:16,c:66,f:16,u:'จาน'},
  'ผัดซีอิ๊ว':{cal:480,p:20,c:65,f:14,u:'จาน'},
  'ผัดไทย':{cal:500,p:18,c:68,f:16,u:'จาน'},
  'ส้มตำ':{cal:150,p:5,c:25,f:3,u:'จาน'},
  'ส้มตำไก่ย่าง':{cal:350,p:32,c:28,f:11,u:'ชุด'},
  'ไก่ย่าง':{cal:200,p:30,c:0,f:8,u:'ชิ้น'},
  'ต้มยำกุ้ง':{cal:180,p:18,c:8,f:8,u:'ชาม'},
  'ต้มยำไก่':{cal:160,p:18,c:6,f:7,u:'ชาม'},
  'แกงจืด':{cal:120,p:12,c:8,f:4,u:'ถ้วย'},
  'แกงเขียวหวาน':{cal:380,p:22,c:18,f:24,u:'ถ้วย'},
  'ผัดผัก':{cal:120,p:5,c:10,f:6,u:'จาน'},
  'ลาบไก่':{cal:240,p:26,c:10,f:10,u:'จาน'},
  'ลาบหมู':{cal:280,p:24,c:12,f:14,u:'จาน'},
  'หมูกรอบ':{cal:450,p:20,c:0,f:40,u:'100g'},
  'ข้าวขาหมู':{cal:650,p:28,c:60,f:30,u:'จาน'},
  'ชานม':{cal:300,p:3,c:50,f:8,u:'แก้ว'},
  'กาแฟดำ':{cal:5,p:0,c:1,f:0,u:'แก้ว'},
  'กาแฟลาเต้':{cal:180,p:7,c:25,f:6,u:'แก้ว'},
  'น้ำส้ม':{cal:110,p:1,c:26,f:0,u:'แก้ว'},
};

// ============ STATE ============
let foodLog=[], waterCount=0;
let timerSec=0, timerTotal=0, timerRun=false, timerIv=null;
let reportPeriod='week', charts={};
let scanStream=null, scanDetector=null;

function loadState(){
  try{
    const ts=localStorage.getItem('los_t_'+TODAY);
    if(ts) JSON.parse(ts).forEach(id=>{document.getElementById(id)?.classList.add('done');});
    const fl=localStorage.getItem('los_f_'+TODAY);
    if(fl) foodLog=JSON.parse(fl);
    const wc=localStorage.getItem('los_w_'+TODAY);
    if(wc) waterCount=parseInt(wc)||0;
  }catch(e){}
}

function saveTaskState(){
  const done=[];
  document.querySelectorAll('.tblock.done,.subtask.done').forEach(e=>done.push(e.id));
  localStorage.setItem('los_t_'+TODAY,JSON.stringify(done));
  fbSaveTasks(done);
  const pct=calcProgress();
  saveHist({task:pct});
}

function saveFoodState(){
  localStorage.setItem('los_f_'+TODAY,JSON.stringify(foodLog));
  fbSaveFood(foodLog);
  const tC=foodLog.reduce((s,f)=>s+f.cal,0);
  const tP=foodLog.reduce((s,f)=>s+f.p,0);
  saveHist({cal:tC,prot:tP});
  // Save recent
  const recent=[];
  const seen=new Set();
  for(const f of [...foodLog].reverse()){
    const base=f.name.replace(/ ×[\d.]+.*/,'').trim();
    if(!seen.has(base)&&FDB[base]){seen.add(base);recent.push(base);}
    if(recent.length>=8) break;
  }
  localStorage.setItem('los_recent',JSON.stringify(recent));
  fbSaveRecent(recent);
}

function saveWater(){
  localStorage.setItem('los_w_'+TODAY,waterCount);
  fbSaveWater(waterCount);
  saveHist({water:waterCount*250});
}

function saveHist(data){
  const hist=JSON.parse(localStorage.getItem('los_hist')||'{}');
  if(!hist[TODAY]) hist[TODAY]={};
  Object.assign(hist[TODAY],data);
  localStorage.setItem('los_hist',JSON.stringify(hist));
  fbSaveHist(hist);
}

// ============ INIT ============
function init(){
  const now=new Date(), day=now.getDay();
  const dd=String(now.getDate()).padStart(2,'0');
  const mm=String(now.getMonth()+1).padStart(2,'0');
  const yy=now.getFullYear()+543;
  document.getElementById('hdrDate').textContent=`${dd}/${mm}/${yy}`;
  document.getElementById('hdrDay').textContent=`วัน${DAY_TH[day]}`;
  document.getElementById('nowTime').textContent=now.toLocaleTimeString('th',{hour:'2-digit',minute:'2-digit'});

  const isNon=[1,2,3,4].includes(day);
  const gymLabels={5:'Legs',6:'Push',0:'Pull',2:'Push DB',4:'Pull DB'};
  let b=`<span class="badge b-loc">${isNon?'📍 นนทบุรี':'📍 ห้วยขวาง'}</span>`;
  if([1,3].includes(day)) b+=`<span class="badge b-bas">🏀 บาส</span>`;
  if(gymLabels[day]) b+=`<span class="badge b-gym">🏋️ ${gymLabels[day]}</span>`;
  document.getElementById('hdrBadges').innerHTML=b;

  buildTimeline(day);
  updateNow(day);
  updateCalTarget(day);
  renderFood();
  buildWater();
  updateRecentList();

  setInterval(()=>{
    const n=new Date();
    document.getElementById('nowTime').textContent=n.toLocaleTimeString('th',{hour:'2-digit',minute:'2-digit'});
    updateNow(n.getDay());
  },60000);

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
}

// ============ TIMELINE ============
function buildTimeline(day){
  const sched=makeSched(day);
  const container=document.getElementById('timeline');
  container.innerHTML='';
  const now=new Date();
  const cur=now.getHours()*60+now.getMinutes();

  const active=[], upcoming=[], past=[];
  sched.forEach((b,i)=>{
    const [h,m]=(b.t+':00').split(':').map(Number);
    const bMin=h*60+(m||0);
    const nMin=i+1<sched.length?(()=>{const[nh,nm]=(sched[i+1].t+':00').split(':').map(Number);return nh*60+(nm||0);})():1440;
    b._active=cur>=bMin&&cur<nMin;
    b._past=cur>=nMin;
    if(b._active) active.push(b);
    else if(b._past) past.push(b);
    else upcoming.push(b);
  });

  [...active,...upcoming,...past].forEach(b=>{
    const div=document.createElement('div');
    const isDone=b.subs.every(s=>false); // will be set by loadState
    div.className='tblock'+(b._active?' active':'')+(b._past?' collapsed':'');
    div.id=b.id;

    const subHTML=b.subs.map(s=>`
      <div class="subtask" id="${s.id}" onclick="toggleST('${b.id}','${s.id}')">
        <div class="st-dot"></div>
        <span class="st-name">${s.n}</span>
        ${s.sec>0?`<button class="st-btn" onclick="event.stopPropagation();openTimer('${s.n.substring(0,22)}',${s.sec})">${fmtSec(s.sec)}</button>`:''}
      </div>`).join('');

    const allIds=b.subs.map(s=>s.id).join(',');
    div.innerHTML=`
      <div class="tblock-hd" onclick="collapseToggle('${b.id}')">
        <span class="tblock-time">${b.t}</span>
        <span class="tblock-ico">${b.ico}</span>
        <div class="tblock-info">
          <div class="tblock-name">${b.name}</div>
          <div class="tblock-meta">${b.subs.length} รายการ${b._past?' · เลยเวลา':''}</div>
        </div>
        <div class="tblock-check" onclick="event.stopPropagation();markDone('${b.id}','${allIds}')">✓</div>
      </div>
      <div class="subtasks">${subHTML}</div>`;
    container.appendChild(div);
  });

  loadState();
  updateProgress();
}

function collapseToggle(id){
  document.getElementById(id)?.classList.toggle('collapsed');
}

function markDone(blockId,subIds){
  const el=document.getElementById(blockId);
  if(!el) return;
  const wasDone=el.classList.contains('done');
  el.classList.toggle('done');
  el.classList.toggle('collapsed',!wasDone);
  if(!wasDone) subIds.split(',').forEach(sid=>document.getElementById(sid)?.classList.add('done'));
  saveTaskState(); updateProgress();
}

function toggleST(blockId,subId){
  document.getElementById(subId)?.classList.toggle('done');
  const block=document.getElementById(blockId);
  if(block){
    const allDone=[...block.querySelectorAll('.subtask')].every(s=>s.classList.contains('done'));
    if(allDone){block.classList.add('done','collapsed');}
    else{block.classList.remove('done');}
  }
  saveTaskState(); updateProgress();
}

function calcProgress(){
  const all=document.querySelectorAll('.tblock').length;
  const done=document.querySelectorAll('.tblock.done').length;
  return all?Math.round(done/all*100):0;
}

function updateProgress(){
  const pct=calcProgress();
  document.getElementById('progVal').textContent=pct+'%';
  document.getElementById('progFill').style.width=pct+'%';
}

function updateNow(day){
  const sched=makeSched(day);
  const now=new Date(), cur=now.getHours()*60+now.getMinutes();
  let active=sched[0];
  for(const b of sched){
    const [h,m]=(b.t+':00').split(':').map(Number);
    if(cur>=h*60+(m||0)) active=b;
    else break;
  }
  document.getElementById('nowTask').textContent=active.ico+' '+active.name;
  const pending=active.subs.filter(s=>!document.getElementById(s.id)?.classList.contains('done'));
  document.getElementById('nowSub').textContent=pending.length?'▸ '+pending[0].n:'✓ เสร็จหมดแล้ว';
}

// ============ FOOD ============
function getCalTarget(day){return day===4?1700:2000;}

function updateCalTarget(day){
  const t=getCalTarget(day);
  document.getElementById('calTarget').textContent=(t===2000?'🏋️ ออกกำลังกาย':'💤 พัก')+' · '+t.toLocaleString()+' kcal';
  window._calt=t;
}

function searchFDB(q){
  if(!q||q.length<1) return [];
  const lq=q.toLowerCase();
  const res=[];
  for(const k in FDB){
    const lk=k.toLowerCase();
    let score=0;
    if(lk===lq) score=4;
    else if(lk.startsWith(lq)) score=3;
    else if(lk.includes(lq)||lq.includes(lk)) score=2;
    else if(lq.split('').filter(c=>c.trim()).some(c=>lk.includes(c))) score=1;
    if(score>0) res.push({key:k,score,...FDB[k]});
  }
  return res.sort((a,b)=>b.score-a.score).slice(0,8);
}

function onFoodInput(val){
  const el=document.getElementById('foodSuggest');
  if(!val.trim()){el.classList.remove('on');return;}
  const res=searchFDB(val.trim());
  if(!res.length){el.classList.remove('on');return;}
  el.innerHTML=res.map(r=>`
    <div class="suggest-item">
      <div class="si-info">
        <div class="si-name">${r.key}</div>
        <div class="si-macro">${r.cal} kcal · P${r.p}g · C${r.c}g · F${r.f}g · (${r.u})</div>
      </div>
      <button class="si-add" onclick="event.stopPropagation();quickAdd('${r.key}',1)">+</button>
    </div>`).join('');
  el.classList.add('on');
}

function quickAdd(key,qty){
  const d=FDB[key];
  if(!d) return;
  const q=qty||1;
  foodLog.push({name:`${key}${q!==1?' ×'+q:''} (${d.u})`,cal:Math.round(d.cal*q),p:Math.round(d.p*q),c:Math.round(d.c*q),f:Math.round(d.f*q)});
  document.getElementById('foodInp').value='';
  document.getElementById('foodSuggest').classList.remove('on');
  saveFoodState(); renderFood(); updateRecentList();
}

async function addFoodByName(){
  const raw=document.getElementById('foodInp').value.trim().toLowerCase();
  if(!raw) return;
  document.getElementById('foodSuggest').classList.remove('on');
  const qm=raw.match(/^(.*?)\s+([\d.]+)$/);
  const name=qm?qm[1].trim():raw;
  const qty=qm?parseFloat(qm[2]):1;
  const q=isNaN(qty)||qty<=0?1:qty;

  // Find best match
  let matched=null;
  if(FDB[name]) matched=name;
  else{
    let best=0;
    for(const k in FDB){
      if(k.includes(name)||name.includes(k)){if(k.length>best){best=k.length;matched=k;}}
    }
  }

  if(matched){quickAdd(matched,q);return;}

  // Claude API fallback
  const btn=document.querySelector('.add-btn');
  btn.textContent='…'; btn.disabled=true;
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',max_tokens:120,
        system:'Return ONLY JSON: {"cal":int,"p":int,"c":int,"f":int,"u":"string"} per 1 serving. No markdown.',
        messages:[{role:'user',content:`Thai food nutrition: ${name}`}]
      })
    });
    const d=await res.json();
    const p=JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim());
    FDB[name]={cal:p.cal||0,p:p.p||0,c:p.c||0,f:p.f||0,u:p.u||'จาน'};
    quickAdd(name,q);
  }catch(e){
    foodLog.push({name,cal:0,p:0,c:0,f:0,unk:true});
    saveFoodState(); renderFood();
    document.getElementById('foodInp').value='';
  }
  btn.textContent='+'; btn.disabled=false;
}

function removeFood(i){foodLog.splice(i,1);saveFoodState();renderFood();}
function resetFood(){foodLog=[];saveFoodState();renderFood();}

function renderFood(){
  const tC=foodLog.reduce((s,f)=>s+f.cal,0);
  const tP=foodLog.reduce((s,f)=>s+f.p,0);
  const tCa=foodLog.reduce((s,f)=>s+f.c,0);
  const tF=foodLog.reduce((s,f)=>s+f.f,0);
  const goal=window._calt||2000;
  const rem=goal-tC;

  document.getElementById('mCal').textContent=tC;
  document.getElementById('mP').textContent=tP+'g';
  document.getElementById('mC').textContent=tCa+'g';
  document.getElementById('mF').textContent=tF+'g';
  document.getElementById('calLeft').textContent=`${tC.toLocaleString()} / ${goal.toLocaleString()} kcal`;
  document.getElementById('calRight').textContent=rem>=0?`เหลือ ${rem}`:`เกิน ${Math.abs(rem)}`;
  document.getElementById('calRight').style.color=rem>=0?'var(--lime)':'var(--red)';
  document.getElementById('calBarFill').style.width=Math.min(100,Math.round(tC/goal*100))+'%';
  document.getElementById('calBarFill').style.background=rem>=0?'var(--lime)':'var(--red)';
  document.getElementById('protIn').textContent=tP;
  document.getElementById('protRight').textContent=tP>=120?'ครบ ✓':`ขาด ${120-tP}g`;
  document.getElementById('protRight').style.color=tP>=120?'var(--green)':'var(--amber)';
  document.getElementById('protBarFill').style.width=Math.min(100,Math.round(tP/120*100))+'%';

  const list=document.getElementById('foodList');
  list.innerHTML=foodLog.length===0
    ?'<div class="empty-food">ยังไม่บันทึกอาหารวันนี้<br><span style="font-size:10px;">พิมพ์ชื่อ หรือสแกน barcode</span></div>'
    :foodLog.map((f,i)=>`<div class="food-item">
      <span class="fi-name" style="color:${f.unk?'var(--amber)':''};">${f.name}${f.unk?' ⚠️':''}</span>
      <span class="fi-kcal">${f.cal} kcal · P${f.p}g</span>
      <button class="fi-del" onclick="removeFood(${i})">✕</button>
    </div>`).join('');
}

function updateRecentList(){
  const el=document.getElementById('qaList');
  const sec=document.getElementById('qaSection');
  if(!el||!sec) return;
  const recent=JSON.parse(localStorage.getItem('los_recent')||'[]');
  // also check today's log
  const seen=new Set(recent);
  const todayRecent=[];
  for(const f of [...foodLog].reverse()){
    const base=f.name.replace(/ ×[\d.]+.*/,'').trim();
    if(!seen.has(base)&&FDB[base]){seen.add(base);todayRecent.push(base);}
  }
  const all=[...todayRecent,...recent.filter(k=>!todayRecent.includes(k))].slice(0,6);
  if(!all.length){sec.style.display='none';return;}
  sec.style.display='block';
  el.innerHTML=all.map(k=>{
    const d=FDB[k];
    return `<div class="qa-row">
      <span class="qa-name">${k}</span>
      <span class="qa-kcal">${d.cal} kcal · P${d.p}g</span>
      <button class="qa-btn" onclick="quickAdd('${k}',1)">+</button>
    </div>`;
  }).join('');
}

// ============ BARCODE ============
function runBarcode(){
  const code=document.getElementById('barcodeInp').value.trim();
  if(code) lookupBarcode(code);
  document.getElementById('barcodeInp').value='';
}

async function lookupBarcode(code){
  const hint=document.getElementById('barcodeHint');
  hint.textContent='🔍 กำลังค้นหา '+code+'...';
  hint.style.color='var(--t3)';
  try{
    const res=await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const d=await res.json();
    if(d.status===1&&d.product){
      const p=d.product;
      const name=(p.product_name_th||p.product_name||'สินค้า '+code).substring(0,40);
      const n=p.nutriments||{};
      const cal=Math.round(n['energy-kcal_100g']||n['energy-kcal']||0);
      const prot=Math.round(n['proteins_100g']||0);
      const carb=Math.round(n['carbohydrates_100g']||0);
      const fat=Math.round(n['fat_100g']||0);
      FDB[name]={cal,p:prot,c:carb,f:fat,u:p.serving_size||'100g'};
      hint.textContent=`✓ ${name} — ${cal} kcal/100g`;
      hint.style.color='var(--green)';
      document.getElementById('foodInp').value=name;
      onFoodInput(name);
    } else {
      hint.textContent='ไม่พบสินค้า barcode: '+code;
      hint.style.color='var(--amber)';
    }
  }catch(e){
    hint.textContent='เชื่อมต่อไม่ได้ ลองอีกครั้ง';
    hint.style.color='var(--red)';
  }
}

// ============ CAMERA SCAN ============
async function openScanModal(){
  const modal=document.getElementById('scanModal');
  const result=document.getElementById('scanResult');
  const hint=document.getElementById('scanHint');
  modal.classList.add('on');
  result.textContent='กำลังเปิดกล้อง...';

  try{
    scanStream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}
    });
    const video=document.getElementById('scanVideo');
    video.srcObject=scanStream;
    await video.play();
    hint.textContent='เล็งกล้องที่บาร์โค้ด';
    result.textContent='';

    if('BarcodeDetector' in window){
      scanDetector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']});
      const scanLoop=async()=>{
        if(!scanStream) return;
        try{
          const codes=await scanDetector.detect(video);
          if(codes.length>0){
            const code=codes[0].rawValue;
            closeScanModal();
            document.getElementById('barcodeInp').value=code;
            lookupBarcode(code);
            return;
          }
        }catch(e){}
        if(scanStream) requestAnimationFrame(scanLoop);
      };
      requestAnimationFrame(scanLoop);
    } else {
      hint.textContent='กล้องพร้อม — ใส่เลข barcode ด้านล่างแทน';
      result.textContent='BarcodeDetector ไม่รองรับบน browser นี้';
    }
  }catch(e){
    result.textContent='เปิดกล้องไม่ได้: '+e.message;
  }
}

function closeScanModal(){
  if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null;}
  scanDetector=null;
  document.getElementById('scanVideo').srcObject=null;
  document.getElementById('scanModal').classList.remove('on');
}

// ============ WATER ============
function buildWater(){
  const c=document.getElementById('waterCups');
  c.innerHTML='';
  for(let i=0;i<12;i++){
    const d=document.createElement('div');
    d.className='wcup'+(i<waterCount?' full':'');
    d.textContent='💧';
    d.onclick=()=>{waterCount=i<waterCount?i:i+1;saveWater();buildWater();};
    c.appendChild(d);
  }
  document.getElementById('waterVal').textContent=(waterCount*250)+' ml';
}

// ============ TIMER ============
function fmtSec(s){if(s>=3600)return Math.floor(s/3600)+'h';if(s>=60)return Math.floor(s/60)+'m';return s+'s';}
function fmtDisp(s){return Math.floor(s/60)+':'+(String(s%60).padStart(2,'0'));}

function openTimer(label,sec){
  timerSec=sec; timerTotal=sec; timerRun=false;
  clearInterval(timerIv);
  document.getElementById('timerLabel').textContent=label;
  document.getElementById('timerNum').textContent=fmtDisp(sec);
  document.getElementById('timerTogBtn').textContent='เริ่ม';
  document.getElementById('timerTogBtn').style.background='var(--lime)';
  document.getElementById('timerRing').style.strokeDashoffset=0;
  document.getElementById('timerModal').classList.add('on');
}
function closeTimer(){clearInterval(timerIv);timerRun=false;document.getElementById('timerModal').classList.remove('on');}
function toggleTimer(){
  if(timerRun){clearInterval(timerIv);timerRun=false;document.getElementById('timerTogBtn').textContent='ต่อ';return;}
  if(timerSec<=0) timerSec=timerTotal;
  timerRun=true;
  document.getElementById('timerTogBtn').textContent='หยุด';
  timerIv=setInterval(()=>{
    timerSec--;
    document.getElementById('timerNum').textContent=fmtDisp(timerSec);
    document.getElementById('timerRing').style.strokeDashoffset=CIRC*(1-timerSec/timerTotal);
    if(timerSec<=0){
      clearInterval(timerIv);timerRun=false;
      document.getElementById('timerNum').textContent='✓';
      document.getElementById('timerTogBtn').textContent='เริ่มใหม่';
      document.getElementById('timerTogBtn').style.background='var(--amber)';
      if(navigator.vibrate) navigator.vibrate([300,100,300]);
    }
  },1000);
}

// ============ REPORT ============
function setRP(p,el){
  reportPeriod=p;
  document.querySelectorAll('.rtab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  buildReport();
}

function buildReport(){
  const hist=JSON.parse(localStorage.getItem('los_hist')||'{}');
  const count=reportPeriod==='week'?7:reportPeriod==='month'?30:365;
  const dates=[],labels=[];
  for(let i=count-1;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    dates.push(d.toDateString());
    if(reportPeriod==='week') labels.push(DAY_TH[d.getDay()].substring(0,2));
    else if(reportPeriod==='month') labels.push(String(d.getDate()));
    else labels.push(`${d.getMonth()+1}/${String(d.getFullYear()).slice(2)}`);
  }

  const calData=dates.map(d=>hist[d]?.cal||0);
  const protData=dates.map(d=>hist[d]?.prot||0);
  const waterData=dates.map(d=>hist[d]?.water||0);
  const taskData=dates.map(d=>hist[d]?.task||0);

  // Streak
  let streak=0;
  for(let i=dates.length-1;i>=0;i--){
    if((hist[dates[i]]?.task||0)>0) streak++;
    else if(i<dates.length-1) break;
  }
  document.getElementById('streakNum').textContent=streak;
  document.getElementById('streakSub').textContent=streak>0?'วันล่าสุด: '+new Date(dates[dates.length-1]).toLocaleDateString('th'):'ยังไม่มีข้อมูล';

  const nz=arr=>arr.filter(v=>v>0);
  const avg=arr=>nz(arr).length?Math.round(nz(arr).reduce((a,b)=>a+b,0)/nz(arr).length):0;
  document.getElementById('avgCal').textContent=avg(calData)||'—';
  document.getElementById('avgProt').textContent=avg(protData)?(avg(protData)+'g'):'—';
  document.getElementById('avgTask').textContent=avg(taskData)?(avg(taskData)+'%'):'—';

  const chartCfg=(data,color,target)=>{
    const datasets=[{
      data, backgroundColor:data.map(v=>v>0?color.replace('1)','0.6)'):'rgba(34,34,40,0.5)'),
      borderColor:data.map(v=>v>0?color:'transparent'), borderWidth:1, borderRadius:3,
    }];
    if(target) datasets.push({type:'line',data:dates.map(()=>target),borderColor:'rgba(184,240,0,0.3)',borderWidth:1.5,borderDash:[4,4],pointRadius:0,fill:false,tension:0});
    return {
      type:'bar', data:{labels,datasets},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{
          x:{grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9}}},
          y:{grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9}}}
        }
      }
    };
  };

  const pairs=[
    ['calChart',calData,'rgba(240,160,32,1)',getCalTarget(new Date().getDay())],
    ['protChart',protData,'rgba(74,184,240,1)',120],
    ['waterChart',waterData,'rgba(74,184,240,0.7)',3000],
    ['taskChart',taskData,'rgba(184,240,0,1)',null],
  ];
  pairs.forEach(([id,data,color,target])=>{
    if(charts[id]) charts[id].destroy();
    charts[id]=new Chart(document.getElementById(id).getContext('2d'),chartCfg(data,color,target));
  });
}

// ============ NAV ============
window.showPg=function(name){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.tab,.nbtn').forEach(b=>b.classList.remove('on'));
  document.getElementById('pg-'+name)?.classList.add('on');
  const idx={today:0,food:1,report:2};
  document.querySelectorAll('.tab')[idx[name]]?.classList.add('on');
  document.querySelectorAll('.nbtn')[idx[name]]?.classList.add('on');
  if(name==='report') setTimeout(buildReport,50);
  if(name==='food'){updateCalTarget(new Date().getDay());renderFood();buildWater();updateRecentList();}
};

// ============ BOOT ============
init();
