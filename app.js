// ============ CONSTANTS ============
const DAY_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const CIRC = 339.3;
const TODAY = new Date().toDateString();

// ============ SCHEDULE ============
function makeSched(day) {
  const isWork = [1,2,3,4,5].includes(day);
  const isBas = [1,3].includes(day);
  const gymMap = {2:'Upper Heavy 💪',5:'Lower Heavy 🦵',6:'Upper Light 💪',0:'Lower Light 🦵'};

  // Evening shower: Keto(จ1/พ3/ศ5=scalp only, Sellon เลิกใช้แล้ว) | ธรรมดา(อ2/พฤ4/ส6/อา0)
  const isKetoDay  = [1,3,5].includes(day);
  const showerName = isKetoDay ? 'อาบน้ำ + Skincare คืน — Ketoconazole 2%' : 'อาบน้ำ + Skincare คืน';
  const shampooSec = isKetoDay ? 300 : 0;
  const shampooTxt = isKetoDay
    ? '<strong>Ketoconazole 2%</strong> ฟอก<strong>หัวเท่านั้น</strong> — ทิ้งไว้ 3–5 นาที'
    : '<strong>แชมพู/ครีมอาบน้ำทั่วไป</strong>';

  // Night skincare หน้า: จ1/พ3/ศ5 = Differin (Adapalene) | อ2/พฤ4/ส6 = Benzac+Clinda หน้า | อา0 = เว้นตัวยา
  const isAdapaleneNight = [1,3,5].includes(day);
  const isBenzacNight    = [2,4,6].includes(day);

  // Body steps (shared every night) — BPO ต้องทาบนผิวสะอาด/แห้งเสมอ (ล้างตัวก่อนเสมอ ไม่ใช่ก่อนเปิดน้ำ)
  // Benzac AC 5% + Clindamycin ใช้คู่กันตามแนวทาง AAD (ลด resistance) เป็น leave-on ไม่ต้องล้างออก
  const bodySteps = [
    {id:'ssp2',n:shampooTxt,sec:shampooSec},
    {id:'ssp3',n:'<strong>Mizumi AHA</strong> ทาตัว/หลัง/ก้น',sec:0},
    {id:'ssp4',n:'<strong>ล้างทุกอย่างออก</strong> เช็ดตัวให้แห้ง',sec:0},
    {id:'ssp1',n:'<strong>Benzac AC 5%</strong> แต้ม<strong>ทุกจุดอักเสบ</strong> (leave-on บนผิวแห้งสะอาด)',sec:0},
    {id:'ssp5',n:'<strong>Clinda-M</strong> จุดสิวบนหลัง (leave-on)',sec:0},
    {id:'ssp6',n:'<strong>Joice Acne Spray</strong> จุดสิวหลัง/ก้น (leave-on)',sec:0},
  ];

  // Benzac nights: ล้างหน้า+ตัวให้หมดก่อน แล้วค่อยทา Benzac/Clinda บนผิวแห้งสะอาด
  const benzacNightBodySteps = [
    {id:'ssp0',n:'<strong>Cetaphil Gentle</strong> ล้างหน้า',sec:60},
    {id:'ssp2',n:shampooTxt,sec:shampooSec},
    {id:'ssp3',n:'<strong>Mizumi AHA</strong> ทาตัว/หลัง/ก้น',sec:0},
    {id:'ssp4',n:'<strong>ล้างทุกอย่างออก</strong> — หน้า + หลัง พร้อมกัน เช็ดให้แห้ง',sec:0},
    {id:'ssp1',n:'<strong>Benzac AC 5%</strong> แต้ม<strong>ทุกจุดอักเสบที่ตัว</strong> (leave-on บนผิวแห้งสะอาด)',sec:0},
    {id:'ssp5',n:'<strong>Clinda-M</strong> จุดสิวบนหลัง (leave-on)',sec:0},
    {id:'ssp6',n:'<strong>Joice Acne Spray</strong> จุดสิวหลัง/ก้น (leave-on)',sec:0},
    {id:'div_face',type:'divider',n:'✨ หน้า'},
    {id:'ssp7',n:'<strong>Clinda-M</strong> จุดสิวบนหน้า (leave-on)',sec:0},
    {id:'ssp8',n:'<strong>AMT Light Emulsion</strong> — ปิดผิวหน้า',sec:0},
  ];

  // Face steps post-shower (Differin / Sunday) — Azelaic acid(Skinoren, เช้า) จับคู่กับ retinoid(กลางคืน) ได้ปกติ ไม่ชนกัน
  const adapaleneFace = [
    {id:'sni1',n:'<strong>Cetaphil Gentle</strong> ล้างหน้า',sec:60},
    {id:'sni2',n:'Buffer: <strong>AMT Light Emulsion</strong> บางๆ — <strong>รอ 5 นาที</strong>',sec:300},
    {id:'sni3',n:'<strong>Differin (Adapalene)</strong> pea size ทั่วหน้า',sec:0},
    {id:'sni4',n:'<strong>AMT Light Emulsion</strong> — ปิดผิวหน้า',sec:0},
  ];
  const sundayFace = [
    {id:'sni1',n:'<strong>Cetaphil Gentle</strong> ล้างหน้า',sec:60},
    {id:'sni2',n:'<strong>AMT Light Emulsion</strong> — ปิดผิวหน้า',sec:0},
  ];

  const faceDivider = {id:'div_face',type:'divider',n:'✨ หน้า'};
  const showerSubs = isBenzacNight
    ? benzacNightBodySteps
    : [...bodySteps, faceDivider, ...(isAdapaleneNight ? adapaleneFace : sundayFace)];

  const s = [];

  s.push({id:'b_wake',t:'07:00',ico:'🌅',name:'ตื่นนอน + เริ่มวัน',subs:[
    {id:'sw1',n:'ดื่มน้ำ 500ml ก่อนทำอะไร',sec:0},
    {id:'sw2',n:'Finasteride 1mg — กินพร้อมมื้อเช้า',sec:0},
    {id:'sw3',n:'กินมื้อเช้า — ห้ามข้าม',sec:0},
  ]});

  s.push({id:'b_skin_am',t:'07:20',ico:'✨',name:'Skincare เช้า (ทุกวัน)',subs:[
    {id:'sa0a',n:'อาบน้ำด้วยครีมอาบน้ำทั่วไป เช็ดตัวให้แห้ง',sec:0},
    {id:'sa0b',n:'<strong>Benzac AC 5%</strong> แต้มทุกจุดอักเสบ (leave-on บนผิวแห้งสะอาด)',sec:0},
    {id:'sa0c',n:'<strong>Clinda-M</strong> จุดสิวบนหลัง (leave-on)',sec:0},
    {id:'sa1',n:'<strong>Cetaphil Gentle</strong> ล้างหน้า',sec:60},
    {id:'sa2',n:'<strong>AMT Liposome Serum</strong> (niacinamide brightening)',sec:0},
    {id:'sa3',n:'<strong>Skinoren</strong> ทาบางๆ ทั่วหน้า',sec:0},
    {id:'sa4',n:'<strong>AMT Light Emulsion</strong>',sec:0},
    {id:'sa5',n:'<strong>COSRX Sunscreen</strong> ☀️ — <strong>ห้ามข้าม</strong>',sec:0},
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
    ]});
    s.push({id:'b_lunch',t:'12:00',ico:'🍱',name:'มื้อกลางวัน + พัก',subs:[
      {id:'sl1',n:'กินข้าว — โปรตีน + ผัก ลดข้าวขาว',sec:0},
      {id:'sl2',n:'ดื่มน้ำ 250ml',sec:0},
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

  // Evening grooming — shower + skincare รวมเป็น block เดียว
  s.push({id:'b_shower_pm',t:'19:45',ico:'🚿',name:showerName,subs:showerSubs});

  s.push({id:'b_sleep',t:'22:30',ico:'🛌',name:'นอน — เป้า 23:00',subs:[
    {id:'ssl1',n:'ปิดหน้าจอทุกชิ้น',sec:0},
    {id:'ssl2',n:'ห้องมืด เย็น เงียบ',sec:0},
  ]});

  return s;
}

function getGymSubs(day) {
  const maps = {
    // อังคาร — Upper Heavy
    2:[
      {id:'g1',n:'Warm-up: Arm Circle + Wall Slide × 10',sec:0},
      {id:'g2',n:'DB Bench Press 4-5×5-6 หนัก — พัก',sec:120},
      {id:'g3',n:'DB Shoulder Press 4-5×5-6 หนัก — พัก',sec:120},
      {id:'g4',n:'DB Bent-over Row 4-5×5-6 หนัก — พัก',sec:120},
      {id:'g5',n:'Face Pull 3×15 — พัก',sec:60},
      {id:'g6',n:'Bicep Curl 2×10 — พัก',sec:60},
      {id:'g7',n:'Stretch: Cross-body Shoulder ซ้าย',sec:30},{id:'g8',n:'Stretch: Cross-body Shoulder ขวา',sec:30},
      {id:'g9',n:"Stretch: Chest Doorway + Child's Pose",sec:45},
    ],
    // ศุกร์ — Lower Heavy
    5:[
      {id:'g1',n:'Warm-up: Leg Swing + Hip Circle + BW Squat × 15',sec:0},
      {id:'g2',n:'Goblet Squat (DB) 4-5×5-6 หนัก — พัก',sec:120},
      {id:'g3',n:'Romanian Deadlift (DB) 4-5×5-6 หนัก — พัก',sec:120},
      {id:'g4',n:'Leg Press 3×8 — พัก',sec:90},
      {id:'g5',n:'Leg Curl (เครื่อง) 2×12 — พัก',sec:60},
      {id:'g6',n:'Standing Calf Raise 3×15 — พัก',sec:45},
      {id:'g7',n:'Stretch: Quad + Hamstring',sec:40},
      {id:'g8',n:'Stretch: Hip Flexor Lunge ซ้าย',sec:30},{id:'g9',n:'Stretch: Hip Flexor Lunge ขวา',sec:30},
      {id:'g10',n:'Stretch: Pigeon Pose ซ้าย',sec:45},{id:'g11',n:'Stretch: Pigeon Pose ขวา',sec:45},
      // Ankle strengthening — optional, สำคัญสำหรับบาส ป้องกันข้อเท้าพลิก
      {id:'ga1',n:'[Optional] Single-leg Balance 30 วิ/ข้าง — ฝึก proprioception ข้อเท้า',sec:30,opt:true},
      {id:'ga2',n:'[Optional] Resistance Band Eversion 3×20/ข้าง — เสริม peroneal ป้องกันข้อเท้าพลิก',sec:0,opt:true},
      {id:'ga3',n:'[Optional] Resistance Band Inversion 3×20/ข้าง — เสริม tibialis posterior',sec:0,opt:true},
      {id:'ga4',n:'[Optional] Toe Walk 20 ก้าว + Heel Walk 20 ก้าว — เสริมกล้ามข้อเท้ารอบด้าน',sec:0,opt:true},
      {id:'ga5',n:'[Optional] Star Excursion Balance ซ้าย (6 ทิศทาง) — ฝึกการทรงตัว',sec:30,opt:true},
      {id:'ga6',n:'[Optional] Star Excursion Balance ขวา (6 ทิศทาง)',sec:30,opt:true},
      {id:'ga7',n:'[Optional] Stretch: Ankle Dorsiflexion ซ้าย (เข่ากดหน้า)',sec:30,opt:true},
      {id:'ga8',n:'[Optional] Stretch: Ankle Dorsiflexion ขวา',sec:30,opt:true},
    ],
    // เสาร์ — Upper Light (ท่าเดิมกับอังคาร reps สูงขึ้น น้ำหนักเบาลง)
    6:[
      {id:'g1',n:'Warm-up: Arm Circle + Wall Slide × 10',sec:0},
      {id:'g2',n:'DB Bench Press 3×10-12 เบา — พัก',sec:60},
      {id:'g3',n:'DB Shoulder Press 3×10-12 เบา — พัก',sec:60},
      {id:'g4',n:'DB Bent-over Row 3×10-12 เบา — พัก',sec:60},
      {id:'g5',n:'Lateral Raise 3×15 — พัก',sec:45},
      {id:'g6',n:'Tricep Pushdown 2×12 — พัก',sec:45},
      {id:'g7',n:'Stretch: Chest + Cross-body + Tricep',sec:60},
    ],
    // อาทิตย์ — Lower Light (ท่าเดิมกับศุกร์ reps สูงขึ้น น้ำหนักเบาลง)
    0:[
      {id:'g1',n:'Warm-up: Leg Swing + Hip Circle + BW Squat × 15',sec:0},
      {id:'g2',n:'Goblet Squat (DB) 3×10-12 เบา — พัก',sec:60},
      {id:'g3',n:'Romanian Deadlift (DB) 3×10-12 เบา — พัก',sec:60},
      {id:'g4',n:'Leg Curl (เครื่อง) 2×15 — พัก',sec:45},
      {id:'g5',n:'Standing Calf Raise 3×15 — พัก',sec:45},
      {id:'g6',n:'Stretch: Quad + Hamstring + Hip Flexor',sec:60},
    ],
  };
  return maps[day] || [];
}

// ============ EXERCISE LINKS ============
// YouTube search URLs — reliable form references (Jeff Nippard / Alan Thrall / Jeremy Ethier)
const EXERCISE_LINKS = [
  // PUSH
  {keys:['Bench Press','bench press'],       url:'https://www.youtube.com/results?search_query=jeff+nippard+bench+press+form'},
  {keys:['Incline Press','incline press'],   url:'https://www.youtube.com/results?search_query=jeff+nippard+incline+press+form'},
  {keys:['Shoulder Press','shoulder press'], url:'https://www.youtube.com/results?search_query=jeff+nippard+overhead+press+form'},
  {keys:['Lateral Raise','lateral raise'],   url:'https://www.youtube.com/results?search_query=jeff+nippard+lateral+raise+form'},
  {keys:['Tricep Ext','tricep ext'],         url:'https://www.youtube.com/results?search_query=jeff+nippard+tricep+extension+form'},
  {keys:['Tricep Pushdown','pushdown'],      url:'https://www.youtube.com/results?search_query=jeff+nippard+tricep+pushdown+form'},
  {keys:['Skull Crusher','skull crusher'],   url:'https://www.youtube.com/results?search_query=jeff+nippard+skull+crusher+form'},
  {keys:['Diamond Push-up','diamond push'],  url:'https://www.youtube.com/results?search_query=diamond+push+up+correct+form'},
  {keys:['Push-up'],                         url:'https://www.youtube.com/results?search_query=jeff+nippard+push+up+form'},
  // PULL
  {keys:['Bent-over Row','bent-over row'],   url:'https://www.youtube.com/results?search_query=jeff+nippard+dumbbell+row+form'},
  {keys:['Single-arm Row','single-arm row'], url:'https://www.youtube.com/results?search_query=jeff+nippard+single+arm+row+form'},
  {keys:['Reverse Fly','reverse fly'],       url:'https://www.youtube.com/results?search_query=jeff+nippard+reverse+fly+form'},
  {keys:['Bicep Curl','bicep curl'],         url:'https://www.youtube.com/results?search_query=jeff+nippard+bicep+curl+form'},
  {keys:['Hammer Curl','hammer curl'],       url:'https://www.youtube.com/results?search_query=jeff+nippard+hammer+curl+form'},
  {keys:['Inverted Row','inverted row'],     url:'https://www.youtube.com/results?search_query=inverted+row+form+tutorial'},
  {keys:['Lat Pulldown','lat pulldown'],     url:'https://www.youtube.com/results?search_query=jeff+nippard+lat+pulldown+form'},
  {keys:['Seated Cable Row','cable row'],    url:'https://www.youtube.com/results?search_query=jeff+nippard+seated+cable+row+form'},
  {keys:['Face Pull','face pull'],           url:'https://www.youtube.com/results?search_query=jeff+nippard+face+pull+form'},
  // LEGS
  {keys:['Leg Press','leg press'],           url:'https://www.youtube.com/results?search_query=jeff+nippard+leg+press+form'},
  {keys:['Romanian Deadlift','romanian'],    url:'https://www.youtube.com/results?search_query=jeff+nippard+romanian+deadlift+form'},
  {keys:['Goblet Squat','goblet squat'],     url:'https://www.youtube.com/results?search_query=goblet+squat+proper+form'},
  {keys:['Leg Curl','leg curl'],             url:'https://www.youtube.com/results?search_query=leg+curl+machine+form+tutorial'},
  {keys:['Calf Raise','calf raise'],         url:'https://www.youtube.com/results?search_query=calf+raise+proper+form'},
  {keys:['BW Squat','bw squat'],             url:'https://www.youtube.com/results?search_query=bodyweight+squat+proper+form'},
  {keys:['Squat Jump','squat jump'],         url:'https://www.youtube.com/results?search_query=squat+jump+proper+form'},
  // STRETCHES
  {keys:['Pigeon Pose','pigeon pose'],       url:'https://www.youtube.com/results?search_query=pigeon+pose+hip+stretch+tutorial'},
  {keys:['Hip Flexor','hip flexor'],         url:'https://www.youtube.com/results?search_query=hip+flexor+stretch+tutorial'},
  {keys:['Hip Circle','hip circle'],         url:'https://www.youtube.com/results?search_query=hip+circle+warmup+tutorial'},
  {keys:["Child's Pose","child's pose"],     url:'https://www.youtube.com/results?search_query=childs+pose+stretch+tutorial'},
  {keys:['Thread the Needle','thread the'],  url:'https://www.youtube.com/results?search_query=thread+the+needle+stretch'},
  {keys:['Cat-Cow','cat-cow'],               url:'https://www.youtube.com/results?search_query=cat+cow+stretch+tutorial'},
  {keys:['Thoracic Rotation','thoracic'],    url:'https://www.youtube.com/results?search_query=thoracic+rotation+stretch'},
  {keys:['Wall Slide','wall slide'],         url:'https://www.youtube.com/results?search_query=wall+slide+shoulder+mobility'},
  {keys:['Arm Circle','arm circle'],         url:'https://www.youtube.com/results?search_query=arm+circle+warmup'},
  {keys:['Leg Swing','leg swing'],           url:'https://www.youtube.com/results?search_query=leg+swing+warmup+tutorial'},
  {keys:['High Knee','high knee'],           url:'https://www.youtube.com/results?search_query=high+knees+proper+form'},
  {keys:['Forward Fold','forward fold'],     url:'https://www.youtube.com/results?search_query=standing+forward+fold+stretch'},
  {keys:['Ankle Circle','ankle circle'],     url:'https://www.youtube.com/results?search_query=ankle+circles+warmup'},
  {keys:['Cross-body Shoulder','cross-body'], url:'https://www.youtube.com/results?search_query=cross+body+shoulder+stretch'},
  {keys:['Chest Doorway','doorway'],         url:'https://www.youtube.com/results?search_query=chest+doorway+stretch'},
  {keys:['DB Row'],                          url:'https://www.youtube.com/results?search_query=jeff+nippard+dumbbell+row+form'},
  // ANKLE STRENGTH (basketball injury prevention)
  {keys:['Single-leg Balance','single-leg balance'],     url:'https://www.youtube.com/results?search_query=single+leg+balance+proprioception+ankle+training'},
  {keys:['Band Eversion','band eversion','Eversion'],    url:'https://www.youtube.com/results?search_query=resistance+band+ankle+eversion+exercise+basketball'},
  {keys:['Band Inversion','band inversion','Inversion'], url:'https://www.youtube.com/results?search_query=resistance+band+ankle+inversion+exercise'},
  {keys:['Toe Walk','toe walk'],                         url:'https://www.youtube.com/results?search_query=toe+walk+heel+walk+ankle+strengthening'},
  {keys:['Heel Walk','heel walk'],                       url:'https://www.youtube.com/results?search_query=toe+walk+heel+walk+ankle+strengthening'},
  {keys:['Star Excursion','star excursion'],              url:'https://www.youtube.com/results?search_query=star+excursion+balance+test+ankle+training'},
  {keys:['Ankle Dorsiflexion','dorsiflexion'],           url:'https://www.youtube.com/results?search_query=ankle+dorsiflexion+stretch+mobility'},
  {keys:['Banded Distraction','banded distraction'],     url:'https://www.youtube.com/results?search_query=banded+ankle+distraction+mobility'},
  // STRETCHES (missing)
  {keys:['Quad'],                           url:'https://www.youtube.com/results?search_query=quad+stretch+proper+form'},
  {keys:['Hamstring'],                      url:'https://www.youtube.com/results?search_query=hamstring+stretch+proper+form'},
  {keys:['Calf','calf stretch'],            url:'https://www.youtube.com/results?search_query=calf+stretch+proper+form'},
  {keys:['Lat stretch','Stretch: Lat'],     url:'https://www.youtube.com/results?search_query=lat+stretch+tutorial'},
  {keys:['Tricep stretch','Stretch: Chest + Cross'], url:'https://www.youtube.com/results?search_query=tricep+overhead+stretch'},
];

function getExerciseLink(name){
  for(const e of EXERCISE_LINKS){
    for(const k of e.keys){
      if(name.includes(k)) return e.url;
    }
  }
  return null;
}

// ============ FOOD DB ============
const FDB = {
  'ไข่':{cal:70,p:6,c:0,f:5,u:'ฟอง'},
  'ข้าว':{cal:180,p:3,c:40,f:0,u:'ทัพพี'},
  'ข้าวกล้อง':{cal:165,p:3,c:35,f:1,u:'ทัพพี'},
  'อกไก่':{cal:120,p:23,c:0,f:3,u:'100g ดิบ'},
  'สะโพกไก่':{cal:177,p:20,c:0,f:8,u:'100g ดิบ'},
  'เนื้อวัว':{cal:250,p:26,c:0,f:17,u:'100g'},
  'เนื้อวัวบด':{cal:176,p:20,c:0,f:10,u:'100g ดิบ'},
  'หมูสันใน':{cal:109,p:21,c:0,f:2,u:'100g ดิบ'},
  'หมูสันนอก':{cal:110,p:23,c:0,f:6,u:'100g ดิบ'},
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
  'ถั่วลิสง':{cal:176,p:7,c:5,f:15,u:'30g'},
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
  // เพิ่มเติม — เครื่องดื่ม
  'น้ำปั่น':{cal:180,p:3,c:38,f:1,u:'แก้ว'},
  'สมูทตี้':{cal:200,p:5,c:38,f:2,u:'แก้ว'},
  'โปรตีนเชค':{cal:250,p:30,c:20,f:3,u:'แก้ว'},
  'น้ำเต้าหู้':{cal:120,p:8,c:16,f:3,u:'แก้ว'},
  'ชาเขียว':{cal:80,p:0,c:20,f:0,u:'แก้ว'},
  'น้ำแดง':{cal:120,p:0,c:30,f:0,u:'แก้ว'},
  'น้ำเปล่า':{cal:0,p:0,c:0,f:0,u:'แก้ว'},
  'กาแฟ':{cal:180,p:4,c:28,f:5,u:'แก้ว'},
  'ชาไทย':{cal:160,p:2,c:32,f:3,u:'แก้ว'},
  'โอเลี้ยง':{cal:120,p:1,c:28,f:1,u:'แก้ว'},
  'น้ำมะนาว':{cal:60,p:0,c:15,f:0,u:'แก้ว'},
  // เพิ่มเติม — ไข่
  'ไข่ต้ม':{cal:70,p:6,c:0,f:5,u:'ฟอง'},
  'ไข่ดาว':{cal:90,p:6,c:0,f:7,u:'ฟอง'},
  'ไข่เจียว':{cal:150,p:9,c:1,f:12,u:'จาน'},
  'ไข่ลวก':{cal:70,p:6,c:0,f:5,u:'ฟอง'},
  // เพิ่มเติม — คาร์บ/แป้ง
  'ข้าวสวย':{cal:180,p:3,c:40,f:0,u:'ทัพพี'},
  'ข้าวเหนียว':{cal:280,p:5,c:65,f:0,u:'ห่อ'},
  'มาม่า':{cal:390,p:9,c:54,f:15,u:'ซอง'},
  'บะหมี่กึ่งสำเร็จรูป':{cal:390,p:9,c:54,f:15,u:'ซอง'},
  'ขนมปัง':{cal:70,p:2,c:13,f:1,u:'แผ่น'},
  'ซาลาเปา':{cal:200,p:8,c:35,f:4,u:'ลูก'},
  'ปาท่องโก๋':{cal:250,p:5,c:32,f:12,u:'ชิ้น'},
  // เพิ่มเติม — โปรตีน
  'เต้าหู้':{cal:80,p:8,c:2,f:4,u:'100g'},
  'ไก่ทอด':{cal:320,p:28,c:12,f:18,u:'100g'},
  'หมูย่าง':{cal:250,p:24,c:0,f:17,u:'100g'},
  'ปลาหมึก':{cal:92,p:16,c:3,f:1,u:'100g'},
  // เพิ่มเติม — เมนูไทย
  'ขนมจีน':{cal:320,p:12,c:55,f:6,u:'จาน'},
  'หมูสะเต๊ะ':{cal:280,p:22,c:8,f:18,u:'จาน'},
  'ข้าวหน้าเป็ด':{cal:520,p:24,c:58,f:18,u:'จาน'},
  'ข้าวหมูแดง':{cal:500,p:22,c:62,f:16,u:'จาน'},
  'ข้าวราดแกง':{cal:480,p:18,c:60,f:16,u:'จาน'},
  'ต้มข่าไก่':{cal:280,p:20,c:8,f:18,u:'ถ้วย'},
  'พะแนง':{cal:350,p:22,c:12,f:24,u:'ถ้วย'},
  'มัสมั่น':{cal:420,p:20,c:22,f:28,u:'ถ้วย'},
  'เขียวหวาน':{cal:380,p:22,c:18,f:24,u:'ถ้วย'},
  'ผัดกะเพรา':{cal:400,p:22,c:43,f:15,u:'จาน'},
  // เพิ่มเติม — ผลไม้
  'แอปเปิ้ล':{cal:80,p:0,c:21,f:0,u:'ลูก'},
  'แตงโม':{cal:50,p:1,c:12,f:0,u:'ชิ้น'},
  'ส้ม':{cal:60,p:1,c:15,f:0,u:'ลูก'},
  'มะม่วง':{cal:100,p:1,c:25,f:0,u:'100g'},
  'สับปะรด':{cal:50,p:0,c:13,f:0,u:'ชิ้น'},
  'มังคุด':{cal:73,p:0,c:18,f:0,u:'ลูก'},
  'ทุเรียน':{cal:150,p:2,c:27,f:5,u:'100g'},
  // เพิ่มเติม — ขนมหวาน/ของว่าง
  'มันฝรั่งทอด':{cal:320,p:4,c:42,f:16,u:'ถ้วย'},
  'ช็อกโกแลต':{cal:150,p:2,c:17,f:9,u:'แท่ง'},
  'คุกกี้':{cal:140,p:2,c:20,f:6,u:'ชิ้น'},
  'เค้ก':{cal:280,p:4,c:40,f:12,u:'ชิ้น'},
  'ทองหยอด':{cal:180,p:2,c:40,f:2,u:'ลูก'},
  'ข้าวต้มมัด':{cal:250,p:4,c:55,f:2,u:'ห่อ'},
  // เพิ่มเติม — สลัด/ผัก
  'สลัด':{cal:80,p:3,c:10,f:3,u:'จาน'},
  'ผักต้ม':{cal:50,p:3,c:8,f:0,u:'จาน'},
  'ต้มจืดผักรวม':{cal:80,p:5,c:10,f:1,u:'ถ้วย'},
  // เพิ่มเติม — วัตถุดิบดิบ/สุก สำหรับคำนวณ Meal Prep (USDA-sourced, ต่อ 100g)
  'ข้าวขาวสุก':{cal:130,p:3,c:28,f:0,u:'100g'},
  'ข้าวกล้องสุก':{cal:112,p:2,c:24,f:1,u:'100g'},
  'ฟักทองนึ่ง':{cal:20,p:1,c:5,f:0,u:'100g'},
  'มันเทศต้ม':{cal:76,p:1,c:18,f:0,u:'100g'},
  'มันฝรั่งต้ม':{cal:86,p:2,c:20,f:0,u:'100g'},
  'เนยถั่ว':{cal:588,p:25,c:20,f:50,u:'100g'},
  'น้ำมันมะกอก':{cal:884,p:0,c:0,f:100,u:'100g'},
};

// ============ STATE ============
let foodLog=[], waterCount=0;
let timerSec=0, timerTotal=0, timerRun=false, timerIv=null;
let reportPeriod='week', charts={};
let scanStream=null, scanDetector=null;
let photoStream=null;
let financeLog=[];
let moneyPeriod='today';
let notifSentToday=new Set();
let weightLog=[];
let moodLog={};
let medList=[];
let medTaken={};
let budgetCaps={};
let illnessLog=[];
let recurringTx=[];
let catMemory={};
let moneyBudgetStartDay=1;
let receiptStream=null;
let sleepLog={};
let userHeight=null;
let coinBalance=0;
let pendingBaht=0;
let coinLog=[];
let streakBonusGiven={s7:false,s30:false};

// ── New state ──
let exerciseLog=[];
let currentMeal='breakfast';
let lowCarbMode=false;
let ifSettings={enabled:false,start:'12:00',end:'20:00'};
let ifTimerIv=null;
let customFoods=[];
let customMeals=[];
let customRecipes=[];
let currentExType='gym';
let mealIngredientsList=[];
let recipeIngredientsList=[];

// ============ LOCAL STORAGE ============
function loadState(){
  try{
    // Reset all block states before applying — prevents stale done/skipped classes
    document.querySelectorAll('.tblock').forEach(el=>el.classList.remove('done','skipped','collapsed'));
    document.querySelectorAll('.subtask').forEach(el=>el.classList.remove('done'));
    const ts=localStorage.getItem('los_t_'+TODAY);
    if(ts) JSON.parse(ts).forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('done','collapsed');});
    const sk=localStorage.getItem('los_skip_'+TODAY);
    if(sk) JSON.parse(sk).forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('skipped','collapsed');});
    // Re-collapse past blocks (loadState strips all collapsed, need to re-apply)
    document.querySelectorAll('.tblock.b-past').forEach(el=>el.classList.add('collapsed'));
    const fl=localStorage.getItem('los_f_'+TODAY);
    if(fl) foodLog=JSON.parse(fl);
    const wc=localStorage.getItem('los_w_'+TODAY);
    if(wc) waterCount=parseInt(wc)||0;
  }catch(e){}
}

function loadFinance(){
  try{
    const f=localStorage.getItem('los_finance');
    if(f) financeLog=JSON.parse(f);
  }catch(e){}
}

function saveTaskState(){
  const done=[];
  const skipped=[];
  document.querySelectorAll('.tblock.done').forEach(e=>done.push(e.id));
  document.querySelectorAll('.tblock.skipped').forEach(e=>skipped.push(e.id));
  localStorage.setItem('los_t_'+TODAY,JSON.stringify(done));
  localStorage.setItem('los_skip_'+TODAY,JSON.stringify(skipped));
  fbSaveTasks(done);
  const pct=calcProgress();
  saveHist({task:pct});
}

function saveFoodState(){
  localStorage.setItem('los_f_'+TODAY,JSON.stringify(foodLog));
  fbSaveFood(foodLog);
  if(foodLog.length>0&&!hasEarnedToday('food')) earnCoins(1000,'food','บันทึกอาหารวันนี้','🍽️');
  const tC=foodLog.reduce((s,f)=>s+f.cal,0);
  const tP=foodLog.reduce((s,f)=>s+f.p,0);
  saveHist({cal:tC,prot:tP});
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
function logWaterQuick(){
  waterCount=Math.min(waterCount+1,12);
  saveWater();
  const ml=waterCount*250;
  const el=document.getElementById('qlWaterLbl');
  if(el) el.textContent=ml>=1000?(ml/1000).toFixed(1)+'L':ml+'ml';
  showToast('💧','น้ำ +250ml',`รวม ${ml>=1000?(ml/1000).toFixed(1)+'L':ml+'ml'} วันนี้`);
  if(!hasEarnedToday('water')) earnCoins(500,'water','ดื่มน้ำวันนี้','💧');
}

// ── Sleep Quick Modal ──
let sqQuality=3;
function openSleepQuickModal(){
  const sl=sleepLog[TODAY];
  if(sl){
    const bedEl=document.getElementById('sqBedtime');
    const wakeEl=document.getElementById('sqWakeTime');
    if(bedEl) bedEl.value=sl.bedtime||'22:30';
    if(wakeEl) wakeEl.value=sl.wakeTime||'07:00';
    sqQuality=sl.quality||3;
  } else {
    sqQuality=3;
    const bedEl=document.getElementById('sqBedtime');
    const wakeEl=document.getElementById('sqWakeTime');
    if(bedEl) bedEl.value='22:30';
    if(wakeEl) wakeEl.value='07:00';
  }
  setSqQuality(sqQuality);
  document.getElementById('sleepQuickModal').classList.add('on');
}
function closeSleepQuickModal(){
  document.getElementById('sleepQuickModal').classList.remove('on');
}
function setSqQuality(q){
  sqQuality=q;
  document.querySelectorAll('.sq-q-btn').forEach(b=>{
    b.classList.toggle('on',parseInt(b.dataset.q)===q);
  });
}
function logSleepQuick(){
  const bed=document.getElementById('sqBedtime')?.value;
  const wake=document.getElementById('sqWakeTime')?.value;
  if(!bed||!wake){closeSleepQuickModal();return;}
  sleepLog[TODAY]={bedtime:bed,wakeTime:wake,quality:sqQuality};
  saveSleepLog();
  renderHealth();
  const h=calcSleepHours(bed,wake);
  const lbl=document.getElementById('qlSleepLbl');
  if(lbl) lbl.textContent=h.toFixed(1)+'h';
  closeSleepQuickModal();
  showToast('🌙','บันทึกการนอนแล้ว',`${h.toFixed(1)} ชม. · คุณภาพ ${sqQuality}/5`);
  if(!hasEarnedToday('sleep')) earnCoins(1000,'sleep','บันทึกการนอนวันนี้','🌙');
}

// ── Mood Quick Modal ──
const _MQ_LBL=['','ต่ำมาก','ต่ำ','ปกติ','ดี','ดีมาก'];
function openMoodQuickModal(){
  const cur=moodLog[TODAY]||0;
  _updateMoodQuickUI(cur);
  document.getElementById('moodQuickModal').classList.add('on');
}
function closeMoodQuickModal(){
  document.getElementById('moodQuickModal').classList.remove('on');
}
function _updateMoodQuickUI(score){
  document.querySelectorAll('.mq-btn').forEach((b,i)=>{
    b.classList.toggle('on',i+1===score);
  });
  const res=document.getElementById('moodQuickResult');
  if(res) res.textContent=score?`บันทึกแล้ว: ${_MQ_LBL[score]}`:'';
}
function selectMoodQuick(score){
  moodLog[TODAY]=score;
  saveMoodLog();
  renderHealth();
  _updateMoodQuickUI(score);
  const lbl=document.getElementById('qlMoodLbl');
  if(lbl) lbl.textContent=_MQ_LBL[score];
  setTimeout(()=>closeMoodQuickModal(),600);
}

function saveFinance(){
  localStorage.setItem('los_finance',JSON.stringify(financeLog));
  fbSaveMoney({txLog:financeLog,budgetCaps,catMemory,recurringTx,startDay:moneyBudgetStartDay});
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
  // Header streak
  const _hist=JSON.parse(localStorage.getItem('los_hist')||'{}');
  let _streak=0;
  for(let i=0;i<365;i++){const _d=new Date();_d.setDate(_d.getDate()-i);if((_hist[_d.toDateString()]?.task||0)>0)_streak++;else break;}
  const _se=document.getElementById('hdrStreak'),_sn=document.getElementById('hdrStreakNum');
  if(_se&&_sn){_sn.textContent=_streak;_se.style.display=_streak>0?'flex':'none';}
  checkStreakBonus(_streak);
  renderCoinBadge();
  document.getElementById('nowTime').textContent=now.toLocaleTimeString('th',{hour:'2-digit',minute:'2-digit'});

  const gymLabels={2:'Upper Heavy',5:'Lower Heavy',6:'Upper Light',0:'Lower Light'};
  let b='';
  if([1,3].includes(day)) b+=`<span class="badge b-bas">🏀 บาส</span>`;
  if(gymLabels[day]) b+=`<span class="badge b-gym">🏋️ ${gymLabels[day]}</span>`;
  document.getElementById('hdrBadges').innerHTML=b;

  loadFinance();
  loadGoals();
  loadHealth();
  applyRecurring();
  buildTimeline(day);
  updateNow(day);
  updateCalTarget(day);
  renderFood();
  buildWater();
  updateRecentList();
  loadNotifSettings();
  initIFTimer();
  checkWeightReminder(now);
  // Update quick labels if already logged today
  const _slToday=sleepLog[TODAY];
  if(_slToday){const _sh=calcSleepHours(_slToday.bedtime,_slToday.wakeTime);const _slLbl=document.getElementById('qlSleepLbl');if(_slLbl)_slLbl.textContent=_sh.toFixed(1)+'h';}
  const _moodToday=moodLog[TODAY];
  if(_moodToday){const _mLbl=document.getElementById('qlMoodLbl');if(_mLbl)_mLbl.textContent=_MQ_LBL[_moodToday]||'อารมณ์';}

  setInterval(()=>{
    const n=new Date();
    document.getElementById('nowTime').textContent=n.toLocaleTimeString('th',{hour:'2-digit',minute:'2-digit'});
    updateNow(n.getDay());
    checkNotifications();
    document.querySelectorAll('.tblock.b-past:not(.done):not(.skipped)').forEach(el=>el.classList.add('collapsed'));
  },60000);

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').then(reg=>{
      console.log('SW registered');
      reg.addEventListener('updatefound',()=>{
        const sw=reg.installing;
        sw?.addEventListener('statechange',()=>{
          if(sw.state==='activated'&&navigator.serviceWorker.controller){
            window.location.reload();
          }
        });
      });
    }).catch(()=>{});
  }
}

// ============ TIMELINE ============
const BLOCK_CLR={
  b_wake:'#F59E0B',b_skin_am:'#06D6A0',b_ex:'#84CC16',
  b_work:'#60A5FA',b_lunch:'#E8590C',b_side:'#60A5FA',
  b_eve:'#E8590C',b_shower_pm:'#06B6D4',
  b_sleep:'#8B5CF6',
};

function buildTimeline(day){
  const sched=makeSched(day);
  const container=document.getElementById('timeline');
  container.innerHTML='';
  const now=new Date();
  const cur=now.getHours()*60+now.getMinutes();

  sched.forEach((b,i)=>{
    const [h,m]=(b.t+':00').split(':').map(Number);
    const bMin=h*60+(m||0);
    const nMin=i+1<sched.length?(()=>{const[nh,nm]=(sched[i+1].t+':00').split(':').map(Number);return nh*60+(nm||0);})():1440;
    b._active=cur>=bMin&&cur<nMin;
    b._past=cur>=nMin;
    b._timeMin=bMin;
  });

  // ── Time-of-day groups (Structured-style) ──
  const timeGroups=[
    {label:'🌅 เช้า',    from:0,    to:719},   // 00:00–11:59
    {label:'☀️ กลางวัน', from:720,  to:1139},  // 12:00–18:59
    {label:'🌙 เย็น',    from:1140, to:1440},  // 19:00+
  ];
  timeGroups.forEach(g=>{g.blocks=[];});
  sched.forEach(b=>{
    const g=timeGroups.find(g=>b._timeMin>=g.from&&b._timeMin<=g.to);
    (g||timeGroups[2]).blocks.push(b);
  });

  function makeCard(b){
    const type=b._active?'active':b._past?'past':'upcoming';
    const color=BLOCK_CLR[b.id]||'#888888';
    const card=document.createElement('div');
    card.className=`rcard tblock b-${type}`+(b._past?' collapsed':'');
    card.id=b.id;
    if(type==='active'){
      card.style.background=color+'14';
      card.style.borderColor=color+'50';
    }
    const realSubs=b.subs.filter(s=>s.type!=='divider');
    const allIds=realSubs.map(s=>s.id).join(',');
    const subHTML=b.subs.map(s=>{
      if(s.type==='divider') return `<div class="rsub-divider">${s.n}</div>`;
      const link=getExerciseLink(s.n);
      const displayName=s.n.replace(/^\[Optional\]\s*/,'');
      return `<div class="rsub subtask${s.opt?' opt-sub':''}" id="${s.id}" onclick="toggleST('${b.id}','${s.id}')">
        <div class="rsub-dot"></div>
        <span class="rsub-name">${s.opt?`<span class="opt-badge">OPT</span> `:''}${displayName}</span>
        ${link?`<a class="rsub-link" href="${link}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔗</a>`:''}
        ${s.sec>0?`<button class="rsub-timer" onclick="event.stopPropagation();openTimer('${displayName.substring(0,22)}',${s.sec})">${fmtSec(s.sec)}</button>`:''}
      </div>`;
    }).join('');
    const meta=type==='past'?`${realSubs.length} รายการ`:`${realSubs.length} รายการ${type==='active'?' · กำลังทำ':''}`;
    card.innerHTML=`
      <div class="rcard-stripe" style="background:${color}"></div>
      <div class="rcard-main" onclick="collapseToggle('${b.id}')">
        <span class="rcard-time">${b.t}</span>
        <span class="rcard-ico">${b.ico}</span>
        <div class="rcard-info">
          <div class="tblock-name rcard-name">${b.name}</div>
          <div class="rcard-meta" id="meta_${b.id}">${meta}</div>
        </div>
        <div class="rcard-actions">
          <button class="rcard-skip" title="ข้าม" onclick="event.stopPropagation();skipBlock('${b.id}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button class="rcard-check" onclick="event.stopPropagation();markDone('${b.id}','${allIds}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      </div>
      <div class="rcard-subs">${subHTML}</div>`;
    return card;
  }

  timeGroups.forEach(g=>{
    if(!g.blocks.length) return;
    const sec=document.createElement('div');
    sec.className='tl-group';
    sec.innerHTML=`<div class="tl-group-hdr"><span class="tl-group-lbl">${g.label}</span><div class="tl-group-line"></div></div>`;
    g.blocks.forEach(b=>sec.appendChild(makeCard(b)));
    container.appendChild(sec);
  });

  loadState();
  _syncFinasterideTask();
  updateProgress();
}

function updateCategoryProgress(){
  const check=id=>{const el=document.getElementById(id);return el&&(el.classList.contains('done')||el.classList.contains('skipped'));};
  const _s=id=>document.getElementById(id);
  const pct=(done,total)=>total?Math.round(done/total*100):0;

  // Morning: ตื่นนอน + Skincare เช้า
  const mIds=['b_wake','b_skin_am'];
  const mTotal=mIds.filter(id=>!!document.getElementById(id)).length;
  const mDone=mIds.filter(check).length;
  const mP=pct(mDone,mTotal);
  if(_s('catFillMorning')){_s('catFillMorning').style.width=mP+'%';_s('catFillMorning').style.background=mP===100?'var(--green)':'var(--orange)';}
  if(_s('catProgMorning')) _s('catProgMorning').textContent=mTotal?`${mDone}/${mTotal}`:'—';

  // Exercise: b_ex (optional day)
  const hasEx=!!document.getElementById('b_ex');
  const eP=hasEx&&check('b_ex')?100:0;
  if(_s('catFillExercise')){_s('catFillExercise').style.width=eP+'%';_s('catFillExercise').style.background=eP===100?'var(--green)':'var(--lime)';}
  if(_s('catProgExercise')) _s('catProgExercise').textContent=hasEx?(eP===100?'✓':'0/1'):'—';

  // Evening: อาบน้ำ+Skincare รวม + นอน
  const evIds=['b_shower_pm','b_sleep'];
  const evTotal=evIds.filter(id=>!!document.getElementById(id)).length;
  const evDone=evIds.filter(check).length;
  const evP=pct(evDone,evTotal);
  if(_s('catFillEvening')){_s('catFillEvening').style.width=evP+'%';_s('catFillEvening').style.background=evP===100?'var(--green)':'var(--blue)';}
  if(_s('catProgEvening')) _s('catProgEvening').textContent=evTotal?`${evDone}/${evTotal}`:'—';
}

function collapseToggle(id){
  document.getElementById(id)?.classList.toggle('collapsed');
}

function markDone(blockId,subIds){
  const el=document.getElementById(blockId);
  if(!el) return;
  if(el.classList.contains('skipped')) return;
  const wasDone=el.classList.contains('done');
  el.classList.toggle('done');
  el.classList.toggle('collapsed',!wasDone);
  if(!wasDone) subIds.split(',').forEach(sid=>document.getElementById(sid)?.classList.add('done'));
  saveTaskState(); updateProgress();
  // Auto-log exercise when b_ex completes
  if(blockId==='b_ex' && !wasDone) _autoLogExerciseFromBlock(el);
  if(!wasDone&&!hasEarnedToday('task_'+blockId)) earnCoins(150,'task_'+blockId,'ทำ '+(el.querySelector('.tblock-name')?.textContent||'งาน')+' เสร็จ');
}

function _autoLogExerciseFromBlock(el){
  const name=el.querySelector('.tblock-name')?.textContent||'';
  const isBas=name.includes('บาส')||name.includes('Basketball');
  const type=isBas?'basketball':'gym';
  const defaultMin=isBas?90:60;
  // Don't double-log if already logged today for this block
  const alreadyAuto=exerciseLog.some(e=>e.date===TODAY&&e.fromRoutine);
  if(alreadyAuto) return;
  const cal=Math.round(defaultMin*(EX_CAL_RATES[type]||5));
  exerciseLog.push({id:'ex'+Date.now(),date:TODAY,type,name:name.trim(),duration:defaultMin,caloriesBurned:cal,note:'(จาก Routine อัตโนมัติ)',fromRoutine:true});
  localStorage.setItem('los_exercise',JSON.stringify(exerciseLog));
  renderExerciseLog();
  showToast('🏃','บันทึกออกกำลังกายแล้ว',`${name.trim()} ~${defaultMin} นาที · ${cal} kcal`);
  if(!hasEarnedToday('exercise')) earnCoins(1500,'exercise','ออกกำลังกายวันนี้','🏃');
}

function skipBlock(blockId){
  const el=document.getElementById(blockId);
  if(!el) return;
  const wasSkipped=el.classList.contains('skipped');
  if(wasSkipped){
    el.classList.remove('skipped','collapsed');
    el.classList.remove('done');
  } else {
    el.classList.remove('done');
    el.classList.add('skipped','collapsed');
  }
  saveTaskState(); updateProgress();
}

function toggleST(blockId,subId){
  document.getElementById(subId)?.classList.toggle('done');
  const block=document.getElementById(blockId);
  if(block){
    const wasDone=block.classList.contains('done');
    const allDone=[...block.querySelectorAll('.subtask')].every(s=>s.classList.contains('done'));
    if(allDone){block.classList.add('done','collapsed'); block.classList.remove('skipped');}
    else{block.classList.remove('done');}
    if(allDone&&!wasDone&&!hasEarnedToday('task_'+blockId)) earnCoins(150,'task_'+blockId,'ทำ '+(block.querySelector('.tblock-name')?.textContent||'งาน')+' เสร็จ');
  }
  // Finasteride ('sw2') is also tracked in the Health tab's medTaken — keep both in sync so ticking
  // one doesn't leave the other unchecked.
  if(subId==='sw2'&&medList.some(m=>m.id==='med1')){
    const taken=document.getElementById('sw2')?.classList.contains('done');
    if(!medTaken[TODAY]) medTaken[TODAY]=[];
    const idx=medTaken[TODAY].indexOf('med1');
    if(taken&&idx<0) medTaken[TODAY].push('med1');
    if(!taken&&idx>=0) medTaken[TODAY].splice(idx,1);
    saveMedTaken();
  }
  saveTaskState(); updateProgress();
}

// Mirrors Health tab's medTaken['med1'] (Finasteride) onto the Today tab's 'sw2' routine task —
// used both after toggling from the Health tab and to sync on initial render.
function _syncFinasterideTask(){
  const el=document.getElementById('sw2');
  if(!el||!medList.some(m=>m.id==='med1')) return;
  const taken=(medTaken[TODAY]||[]).includes('med1');
  el.classList.toggle('done',taken);
  const block=document.getElementById('b_wake');
  if(!block) return;
  const wasDone=block.classList.contains('done');
  const allDone=[...block.querySelectorAll('.subtask')].every(s=>s.classList.contains('done'));
  if(allDone){block.classList.add('done','collapsed'); block.classList.remove('skipped');}
  else{block.classList.remove('done');}
  if(allDone&&!wasDone&&!hasEarnedToday('task_b_wake')) earnCoins(150,'task_b_wake','ทำ '+(block.querySelector('.tblock-name')?.textContent||'งาน')+' เสร็จ');
  saveTaskState();
}

function calcProgress(){
  const all=document.querySelectorAll('.tblock').length;
  const done=document.querySelectorAll('.tblock.done').length;
  const skipped=document.querySelectorAll('.tblock.skipped').length;
  return all?Math.round((done+skipped)/all*100):0;
}

function updateProgress(){
  const pct=calcProgress();
  const done=document.querySelectorAll('.tblock.done').length;
  const skipped=document.querySelectorAll('.tblock.skipped').length;
  document.getElementById('progVal').textContent=pct+'%';
  document.getElementById('progFill').style.width=pct+'%';
  // Update ring & hero display — use setAttribute (most reliable across mobile browsers)
  const ring=document.getElementById('progRing');
  if(ring){
    const off=(276.5*(1-pct/100)).toFixed(1);
    ring.style.removeProperty('stroke-dashoffset');
    ring.setAttribute('stroke-dashoffset',off);
  }
  const bigVal=document.getElementById('progValBig');
  if(bigVal) bigVal.textContent=pct+'%';
  const lblSmall=document.getElementById('progLblSmall');
  if(skipped>0){
    const lbl=document.querySelector('.prog-lbl');
    if(lbl) lbl.textContent=`เสร็จ ${done} · ข้าม ${skipped}`;
    if(lblSmall) lblSmall.textContent=`${done}✓ ${skipped}⏭`;
  } else {
    const lbl=document.querySelector('.prog-lbl');
    if(lbl) lbl.textContent='เสร็จแล้ววันนี้';
    if(lblSmall) lblSmall.textContent='วันนี้';
  }
  updateCategoryProgress();
  if(pct>=70&&!hasEarnedToday('daily70')) earnCoins(1500,'daily70','ทำ routine วันนี้ครบ 70%!','🎉');
}

function scrollToActiveBlock(){
  const el=document.querySelector('.tblock.b-active');
  if(!el) return;
  el.scrollIntoView({behavior:'smooth',block:'start'});
  el.classList.remove('block-flash');
  void el.offsetWidth;
  el.classList.add('block-flash');
  el.addEventListener('animationend',()=>el.classList.remove('block-flash'),{once:true});
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
  const stripTags=s=>s.replace(/<[^>]*>/g,'');
  document.getElementById('nowSub').textContent=pending.length?'▸ '+stripTags(pending[0].n):'✓ เสร็จหมดแล้ว';
}

// ============ FOOD ============
// Measured BMR from latest full-scan entry, else Mifflin-St Jeor estimate (Male, 29yr — same assumption used in weight prediction)
function getEffectiveBMR(){
  const sorted=[...weightLog].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const measured=sorted.find(x=>x.bmr);
  if(measured) return measured.bmr;
  const w=sorted[0]?sorted[0].weight:70;
  const h=userHeight||173;
  return Math.round(10*w+6.25*h-5*29+5);
}
function getCalTarget(day){
  const bmr=getEffectiveBMR();
  const activity=day===4?1.2:1.375; // rest day vs exercise day
  const deficit=650; // ~0.6kg/wk safe recomp rate toward the fat-loss goal
  return Math.max(1200,Math.round(bmr*activity-deficit));
}

function updateCalTarget(day){
  const t=getCalTarget(day);
  const calTargetEl=document.getElementById('calTarget');
  if(calTargetEl) calTargetEl.textContent=(day===4?'💤 พัก':'🏋️ ออกกำลังกาย')+' · '+t.toLocaleString()+' kcal';
  const calTargetNumEl=document.getElementById('calTargetNum');
  if(calTargetNumEl) calTargetNumEl.textContent=t.toLocaleString();
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
    <div class="suggest-item" onclick="quickAdd('${r.key}',1)">
      <div class="si-info">
        <div class="si-name">${r.key}</div>
        <div class="si-macro">${r.cal} kcal · P${r.p}g · C${r.c}g · F${r.f}g</div>
      </div>
      <button class="si-add" onclick="event.stopPropagation();quickAdd('${r.key}',1)">+</button>
    </div>`).join('');
  el.classList.add('on');
}

function quickAdd(key,qty){
  const d=FDB[key];
  if(!d) return;
  const q=qty||1;
  foodLog.push({name:`${key}${q!==1?' ×'+q:''} (${d.u})`,cal:Math.round(d.cal*q),p:Math.round(d.p*q),c:Math.round(d.c*q),f:Math.round(d.f*q),meal:currentMeal});
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

  let matched=null;
  if(FDB[name]) matched=name;
  else{
    let best=0;
    for(const k in FDB){
      if(k.includes(name)||name.includes(k)){if(k.length>best){best=k.length;matched=k;}}
    }
  }
  if(matched){quickAdd(matched,q);return;}

  const btn=document.querySelector('.add-btn');
  const key=getApiKey();
  if(!key){
    // ไม่มี API key — บันทึกโดยไม่มีโภชนาการ (ผู้ใช้รับทราบ)
    foodLog.push({name:`${name}${q!==1?' ×'+q:''}`,cal:0,p:0,c:0,f:0,unk:true});
    saveFoodState(); renderFood();
    document.getElementById('foodInp').value='';
    document.getElementById('foodSuggest').classList.remove('on');
    const hint=document.getElementById('barcodeHint');
    if(hint){ hint.textContent='⚠️ ไม่พบในฐานข้อมูล — บันทึกแล้วแต่ไม่มีโภชนาการ (ใส่ Claude API Key ใน ⚙️ เพื่อค้นหาอัตโนมัติ)'; hint.style.color='var(--amber)'; setTimeout(()=>{hint.textContent='';},4000); }
    return;
  }
  btn.textContent='…'; btn.disabled=true;
  try{
    const headers={'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-allow-browser':'true'};
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers,
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',max_tokens:120,
        system:'Return ONLY valid JSON object: {"cal":int,"p":int,"c":int,"f":int,"u":"string"} per 1 serving/portion. No markdown, no explanation.',
        messages:[{role:'user',content:`Thai food nutrition per serving: ${name}`}]
      })
    });
    if(!res.ok){
      const errData=await res.json().catch(()=>({}));
      throw new Error(_claudeErrorMsg(res.status,errData));
    }
    const d=await res.json();
    const txt=(d.content?.[0]?.text||'').replace(/```json|```/g,'').trim();
    const m=txt.match(/\{[^}]+\}/);
    if(m){
      const p=JSON.parse(m[0]);
      const cal=p.cal||0,pr=p.p||0,c=p.c||0,f=p.f||0,u=p.u||'จาน';
      FDB[name]={cal,p:pr,c,f,u};
      _cacheAiFood(name,cal,pr,c,f,u);
      quickAdd(name,q);
    } else {
      foodLog.push({name:`${name}${q!==1?' ×'+q:''}`,cal:0,p:0,c:0,f:0,unk:true});
      saveFoodState(); renderFood();
      document.getElementById('foodInp').value='';
    }
  }catch(e){
    foodLog.push({name:`${name}${q!==1?' ×'+q:''}`,cal:0,p:0,c:0,f:0,unk:true});
    saveFoodState(); renderFood();
    document.getElementById('foodInp').value='';
    const hint=document.getElementById('barcodeHint');
    if(hint){ hint.textContent='⚠️ '+e.message; hint.style.color='var(--red)'; setTimeout(()=>{hint.textContent='';},5000); }
  }
  btn.textContent='+'; btn.disabled=false;
}

function removeFood(i){foodLog.splice(i,1);saveFoodState();renderFood();}
function resetFood(){foodLog=[];saveFoodState();renderFood();}

function getTodayExerciseCal(){
  return exerciseLog.filter(e=>e.date===TODAY).reduce((s,e)=>s+(e.caloriesBurned||0),0);
}

// Protein target from lean body mass (1.8g/kg) using latest entry with fat%, else fallback 120g
function getProteinTarget(){
  const withFat=[...weightLog].sort((a,b)=>new Date(b.date)-new Date(a.date)).find(x=>x.fat);
  if(withFat){
    const leanMass=withFat.weight*(1-withFat.fat/100);
    return Math.round(leanMass*1.8);
  }
  return 120;
}

function getMacroTargets(){
  const goal=window._calt||2000;
  return {cal:goal,prot:getProteinTarget(),carb:lowCarbMode?40:Math.round(goal*0.45/4),fat:Math.round(goal*0.28/9)};
}

// ── Meal Prep Calculator — solve backward from today's macro targets to exact ingredient amounts.
// Flow: pick 1-2 sources per category (protein/carb/fat) — mixing is fine, doesn't have to be one
// ingredient — then solve the amount of each needed to hit the day's remaining P/C/F. Cook once, divide.
const MEALPREP_PROTEIN = ['อกไก่','สะโพกไก่','เนื้อวัวบด','หมูสันนอก','หมูสันใน'];
// Rice is the real everyday staple carb — always the base. Pumpkin/sweet potato/potato are too
// low-density to realistically carry a whole day's carb target alone (needs 700g+ of pure pumpkin),
// so they only ever show up as a side mixed in with rice, never as the sole carb.
const MEALPREP_CARB_STAPLE = ['ข้าวขาวสุก'];
const MEALPREP_CARB_SIDE = ['ฟักทองนึ่ง','มันเทศต้ม','มันฝรั่งต้ม'];
const MEALPREP_FAT = ['อัลมอนด์','ถั่วลิสง'];
// Fixed daily staples eaten every day regardless of what else gets randomized — deducted from the
// target first, then the randomized picks solve for whatever's left.
const MEALPREP_FIXED_EGG = {key:'ไข่', qty:3};
const MEALPREP_FIXED_SNACK = {key:'ขนมปังโฮลวีต', qty:2}; // AM, pre-workout — not part of the divided batch
const MEALPREP_META = {protein:{ico:'🍗',label:'โปรตีน'}, carb:{ico:'🍚',label:'คาร์บ'}, fat:{ico:'🥑',label:'ไขมัน'}};
// Chance a category picks 2 ingredients instead of 1 — real meal prep mixes sources, doesn't lock to one
const MEALPREP_COMBO_CHANCE = {protein:0.3, carb:0.25, fat:0.3};
// grams-based clamp {step,min,max}; count-based items (ฟอง/แผ่น) use a separate {step,min,max} in pieces
const MEALPREP_CLAMP = {
  protein:{g:[10,60,500], count:[1,1,6]},
  carb:{g:[10,40,700], count:[1,1,14]}, // bread needs a higher piece-cap than eggs/nuts to cover a full day's carb alone
  fat:{g:[5,5,60], count:[1,1,6]},
};
// Actual dish suggestions per protein — one is randomly picked so the plan reads as a real menu to cook,
// not just a raw grocery amount. Re-picked whenever the protein itself is (re)rolled.
const MEALPREP_PROTEIN_DISH = {
  'อกไก่':['อกไก่ย่าง/นึ่ง คู่สลัด','กะเพราไก่ (ใช้อกไก่สับ)','ไก่ผัดผักรวม'],
  'สะโพกไก่':['ไก่อบ/ย่างสมุนไพร','แกงเขียวหวานไก่','ไก่ผัดขิง'],
  'เนื้อวัวบด':['สเต็กเนื้อบด','กะเพราเนื้อ','เนื้อผัดกระเทียมพริกไทย'],
  'หมูสันนอก':['หมูย่าง/หมูทอด (ไม่ชุบแป้ง)','กะเพราหมู','หมูผัดกระเทียม'],
  'หมูสันใน':['หมูต้ม/หมูนึ่ง','แกงจืดหมูสับ','หมูผัดผักรวม'],
  'ไข่':['ไข่ต้ม/ไข่ดาว','ไข่เจียว','ไข่ตุ๋น'],
};
function _pickDish(proteinKey){
  const opts=MEALPREP_PROTEIN_DISH[proteinKey]||[];
  return opts.length?opts[Math.floor(Math.random()*opts.length)]:'';
}

// Every FDB entry's macros are "per X" — gram-based units encode X in the string (e.g. "100g", "30g ดิบ");
// count-based units (ฟอง, แผ่น) have no number, meaning "per 1 piece".
function _isCountUnit(unit){ return !/\d+\s*g/.test(unit||''); }
function _baseAmount(unit){
  const m=(unit||'').match(/(\d+)\s*g/);
  return m?parseInt(m[1]):1;
}
function _baseGrams(unit){ return _baseAmount(unit); } // kept for gram-only callers
function _scaleItem(item, amount, base){
  const r=amount/base;
  return {cal:Math.round(item.cal*r), p:Math.round(item.p*r), c:Math.round(item.c*r), f:Math.round(item.f*r)};
}
function _clampRound(val, step, min, max){
  return Math.max(min, Math.min(max, Math.round(val/step)*step));
}
function _randPick(arr, exclude){
  const pool = (exclude && arr.length>1) ? arr.filter(k=>k!==exclude) : arr;
  return pool[Math.floor(Math.random()*pool.length)];
}
// Pick 1 ingredient, or sometimes 2 distinct ones (mixing sources) — matches how people actually eat
function _pickCategoryKeys(pool, comboChance){
  const first=pool[Math.floor(Math.random()*pool.length)];
  if(pool.length>1 && Math.random()<comboChance){
    const rest=pool.filter(k=>k!==first);
    return [first, rest[Math.floor(Math.random()*rest.length)]];
  }
  return [first];
}
// Carb always starts from a real staple (rice/bread); the low-density sides (pumpkin/sweet potato/potato)
// only ever ride along as the 2nd item, never picked as the sole carb source.
function _pickCarbKeys(comboChance){
  const first=MEALPREP_CARB_STAPLE[Math.floor(Math.random()*MEALPREP_CARB_STAPLE.length)];
  if(Math.random()<comboChance){
    const pool=MEALPREP_CARB_SIDE.concat(MEALPREP_CARB_STAPLE.filter(k=>k!==first));
    return [first, pool[Math.floor(Math.random()*pool.length)]];
  }
  return [first];
}
function _catTotal(items){
  return items.reduce((s,it)=>({cal:s.cal+it.cal,p:s.p+it.p,c:s.c+it.c,f:s.f+it.f}),{cal:0,p:0,c:0,f:0});
}
function _fmtQty(it){ return it.isCount ? `×${it.qty}` : `${it.qty}g`; }
function _fixedItem(key, qty){
  const item=FDB[key], isCount=_isCountUnit(item.u), base=_baseAmount(item.u);
  return {key, qty, isCount, u:item.u, ..._scaleItem(item, qty, base)};
}

// Solve one ingredient's amount (in its own natural unit) to hit a macro share.
function _solveOne(key, macroKey, targetAmt, clamp){
  const item=FDB[key];
  const isCount=_isCountUnit(item.u), base=_baseAmount(item.u);
  const qtyRaw=item[macroKey]>0?(targetAmt/item[macroKey])*base:base;
  const [step,min,max]=isCount?clamp.count:clamp.g;
  const qty=_clampRound(qtyRaw, step, min, max);
  return {key, qty, isCount, u:item.u, ..._scaleItem(item, qty, base)};
}

// Solve grams/count sequentially: protein first (fixes its own fat/carb contribution), then carb fills
// the remaining carb gap, then fat fills whatever's left after both other sources' own fat is counted.
// Each category can be 1 or 2 ingredients splitting that category's target macro evenly between them.
function solveMealPrepGrams(proteinKeys, carbKeys, fatKeys, target){
  // Protein: solve each item's even share of the protein target, but also cap each by its OWN fat
  // contribution — a fatty cut (e.g. ground beef) needing lots of volume shouldn't blow the fat budget
  // on its own; it's allowed to honestly fall short on protein instead.
  const proteinItems=proteinKeys.map(key=>{
    const item=FDB[key], isCount=_isCountUnit(item.u), base=_baseAmount(item.u);
    const share=target.prot/proteinKeys.length;
    let qtyRaw=item.p>0?(share/item.p)*base:base;
    if(item.f>0) qtyRaw=Math.min(qtyRaw, (target.fat*0.85/proteinKeys.length/item.f)*base);
    const [step,min,max]=isCount?MEALPREP_CLAMP.protein.count:MEALPREP_CLAMP.protein.g;
    const qty=_clampRound(qtyRaw, step, min, max);
    return {key, qty, isCount, u:item.u, ..._scaleItem(item, qty, base)};
  });
  const pTotal=_catTotal(proteinItems);

  const remCarb=Math.max(15, target.carb-pTotal.c);
  const carbItems=carbKeys.map(key=>_solveOne(key, 'c', remCarb/carbKeys.length, MEALPREP_CLAMP.carb));
  const cTotal=_catTotal(carbItems);

  const remFat=Math.max(3, target.fat-pTotal.f-cTotal.f);
  const fatItems=fatKeys.map(key=>_solveOne(key, 'f', remFat/fatKeys.length, MEALPREP_CLAMP.fat));

  return {protein:proteinItems, carb:carbItems, fat:fatItems};
}

// Wraps solveMealPrepGrams: deducts the fixed daily egg (always eaten) and the fixed AM pre-workout
// snack (bread, always 2 slices, not part of the divided batch) from the target first, then solves the
// randomized picks against whatever's left. Egg gets folded into the protein list; snack stays separate.
function generateMealPrepPlan(proteinKeys, carbKeys, fatKeys, target){
  const egg=_fixedItem(MEALPREP_FIXED_EGG.key, MEALPREP_FIXED_EGG.qty);
  const snack=_fixedItem(MEALPREP_FIXED_SNACK.key, MEALPREP_FIXED_SNACK.qty);
  const adjTarget={
    cal:Math.max(200, target.cal-egg.cal-snack.cal),
    prot:Math.max(15, target.prot-egg.p-snack.p),
    carb:Math.max(15, target.carb-egg.c-snack.c),
    fat:Math.max(5, target.fat-egg.f-snack.f),
  };
  const plan=solveMealPrepGrams(proteinKeys, carbKeys, fatKeys, adjTarget);
  plan.protein=[egg, ...plan.protein];
  plan.snack=snack;
  return plan;
}

let _mealPrepResult=null;

function _mealPrepTarget(){
  const t=getMacroTargets();
  const tC=foodLog.reduce((s,f)=>s+f.cal,0), tP=foodLog.reduce((s,f)=>s+f.p,0);
  const tCa=foodLog.reduce((s,f)=>s+f.c,0), tF=foodLog.reduce((s,f)=>s+f.f,0);
  return {cal:Math.max(300,t.cal-tC), prot:Math.max(30,t.prot-tP), carb:Math.max(20,t.carb-tCa), fat:Math.max(10,t.fat-tF)};
}

function spinFoodRoulette(){
  const logged=new Set(foodLog.map(f=>f.meal||'breakfast'));
  const emptySlots=['breakfast','lunch','dinner','snack'].filter(m=>!logged.has(m));
  if(!emptySlots.length){
    showToast('🎲','ครบทุกมื้อแล้ว','วันนี้บันทึกอาหารครบทุกมื้อแล้ว ไม่มีมื้อว่างให้สุ่ม');
    return;
  }
  const target=_mealPrepTarget();
  const proteinKeys=_pickCategoryKeys(MEALPREP_PROTEIN, MEALPREP_COMBO_CHANCE.protein);
  const carbKeys=_pickCarbKeys(MEALPREP_COMBO_CHANCE.carb);
  const fatKeys=_pickCategoryKeys(MEALPREP_FAT, MEALPREP_COMBO_CHANCE.fat);
  const plan=generateMealPrepPlan(proteinKeys,carbKeys,fatKeys,target);
  _mealPrepResult={...plan, target, dish:_pickDish(proteinKeys[0])};
  renderRouletteModal();
  document.getElementById('rouletteModal').classList.add('on');
}

function rerollRouletteSlot(cat){
  if(!_mealPrepResult) return;
  // protein list includes the fixed egg at [0] — exclude it here, it's never re-rolled
  let proteinKeys=_mealPrepResult.protein.filter(it=>it.key!==MEALPREP_FIXED_EGG.key).map(it=>it.key);
  let carbKeys=_mealPrepResult.carb.map(it=>it.key);
  let fatKeys=_mealPrepResult.fat.map(it=>it.key);
  let dish=_mealPrepResult.dish;
  if(cat==='protein'){ proteinKeys=_pickCategoryKeys(MEALPREP_PROTEIN, MEALPREP_COMBO_CHANCE.protein); dish=_pickDish(proteinKeys[0]); }
  if(cat==='carb') carbKeys=_pickCarbKeys(MEALPREP_COMBO_CHANCE.carb);
  if(cat==='fat') fatKeys=_pickCategoryKeys(MEALPREP_FAT, MEALPREP_COMBO_CHANCE.fat);
  const plan=generateMealPrepPlan(proteinKeys,carbKeys,fatKeys,_mealPrepResult.target);
  _mealPrepResult={...plan, target:_mealPrepResult.target, dish};
  renderRouletteModal();
}

function renderRouletteModal(){
  const r=_mealPrepResult;
  const logged=new Set(foodLog.map(f=>f.meal||'breakfast'));
  const emptySlots=['breakfast','lunch','dinner','snack'].filter(m=>!logged.has(m));
  const n=Math.max(1,emptySlots.length);
  const rows=['protein','carb','fat'].map(cat=>{
    const items=r[cat], meta=MEALPREP_META[cat], sub=_catTotal(items);
    const itemLines=items.map(it=>`<div class="rr-name">${it.key} <span class="rr-unit">${_fmtQty(it)}</span></div>`).join('');
    return `<div class="rr-row">
      <div class="rr-meal">${meta.ico} ${meta.label}</div>
      <div class="rr-food">
        ${itemLines}
        <div class="rr-macro">${sub.cal} kcal · P${sub.p} C${sub.c} F${sub.f}</div>
      </div>
      <button class="rr-dice" onclick="rerollRouletteSlot('${cat}')" title="สุ่มใหม่">🎲</button>
    </div>`;
  }).join('');
  const snackRow=`<div class="rr-row">
    <div class="rr-meal">🍞 คงที่</div>
    <div class="rr-food">
      <div class="rr-name">${r.snack.key} <span class="rr-unit">${_fmtQty(r.snack)}</span> <span class="rr-side">เช้า ก่อนออกกำลังกาย</span></div>
      <div class="rr-macro">${r.snack.cal} kcal · P${r.snack.p} C${r.snack.c} F${r.snack.f}</div>
    </div>
  </div>`;
  const allItems=[...r.protein,...r.carb,...r.fat];
  const totals=_catTotal([...allItems, r.snack]);
  const dishEl=document.getElementById('rrDish');
  if(dishEl) dishEl.textContent=`🍽️ เมนูแนะนำ: ${r.dish} คู่ ${r.carb.map(it=>it.key).join(' + ')}`;
  document.getElementById('rouletteRows').innerHTML=rows+snackRow;
  document.getElementById('rrSumCal').textContent=`${totals.cal.toLocaleString()} / ${Math.round(r.target.cal).toLocaleString()} kcal`;
  document.getElementById('rrSumMacro').textContent=`P ${totals.p}/${Math.round(r.target.prot)}g · C ${totals.c}/${Math.round(r.target.carb)}g · F ${totals.f}/${Math.round(r.target.fat)}g`;
  const tipEl=document.getElementById('rrTip');
  if(tipEl){
    const parts=allItems.map(it=>{
      const perQty=it.isCount?Math.max(1,Math.round(it.qty/n)):Math.round(it.qty/n);
      return `${it.isCount?'×'+perQty:perQty+'g'} ${it.key}`;
    }).join(' + ');
    tipEl.textContent=`ทำทีเดียว แบ่งกิน ${n} มื้อ · มื้อละ ~${parts}`;
  }
}

// Log the batch split evenly across today's remaining empty meal slots (same food, portioned) —
// matches "cook once, divide and eat" instead of a different dish per meal.
function confirmRoulette(){
  if(!_mealPrepResult) return;
  const logged=new Set(foodLog.map(f=>f.meal||'breakfast'));
  const slots=['breakfast','lunch','dinner','snack'].filter(m=>!logged.has(m));
  const useSlots=slots.length?slots:['snack'];
  const n=useSlots.length;
  const allItems=[..._mealPrepResult.protein,..._mealPrepResult.carb,..._mealPrepResult.fat];
  allItems.forEach(it=>{
    const base=FDB[it.key], baseAmt=_baseAmount(it.u);
    const qtyPerSlot=it.isCount?Math.max(1,Math.round(it.qty/n)):Math.round(it.qty/n);
    if(qtyPerSlot<=0) return;
    const portion=_scaleItem(base, qtyPerSlot, baseAmt);
    const label=it.isCount?`${it.key} ×${qtyPerSlot}`:`${it.key} ${qtyPerSlot}g`;
    useSlots.forEach(m=>{
      foodLog.push({name:label, cal:portion.cal,p:portion.p,c:portion.c,f:portion.f, meal:m});
    });
  });
  // Fixed AM pre-workout snack — logged once to breakfast, not divided across the day like the rest
  const s=_mealPrepResult.snack;
  foodLog.push({name:`${s.key} ×${s.qty}`, cal:s.cal,p:s.p,c:s.c,f:s.f, meal:'breakfast'});
  saveFoodState(); renderFood(); updateRecentList();
  closeRouletteModal();
  showToast('🎲','เพิ่มเมนูแล้ว!','บันทึก Meal Prep วันนี้เรียบร้อย ไปทำได้เลย!');
}

function closeRouletteModal(){
  document.getElementById('rouletteModal').classList.remove('on');
  _mealPrepResult=null;
}

function renderFood(){
  const tC=foodLog.reduce((s,f)=>s+f.cal,0);
  const tP=foodLog.reduce((s,f)=>s+f.p,0);
  const tCa=foodLog.reduce((s,f)=>s+f.c,0);
  const tF=foodLog.reduce((s,f)=>s+f.f,0);
  const goal=window._calt||2000;
  const exCal=getTodayExerciseCal();
  const rem=goal-tC+exCal;

  // ── Calorie ring (new hero) ──
  const calRing=document.getElementById('calRingFill');
  if(calRing) calRing.style.strokeDashoffset=(414.7-414.7*Math.min(1,tC/goal)).toFixed(1);
  // Color: red when over, orange otherwise
  if(calRing) calRing.style.stroke=rem<0?'var(--red)':'var(--orange)';

  // Calories Remaining display
  const remEl=document.getElementById('calRemaining');
  const formulaEl=document.getElementById('calFormula');
  if(remEl){
    remEl.textContent=Math.abs(rem).toLocaleString();
    remEl.style.color=rem<0?'var(--red)':'var(--t1)';
  }
  if(formulaEl){
    formulaEl.textContent=rem<0
      ?`เกิน ${Math.abs(rem)} kcal`
      :`${goal} − ${tC}${exCal>0?` + ${exCal}🏃`:''} = ${rem} เหลือ`;
  }

  document.getElementById('mCal').textContent=tC;
  document.getElementById('mP').textContent=tP+'g';
  document.getElementById('mC').textContent=tCa+'g';
  document.getElementById('mF').textContent=tF+'g';
  document.getElementById('calLeft').textContent=`${tC.toLocaleString()} / ${goal.toLocaleString()} kcal`;
  document.getElementById('calRight').textContent=rem>=0?`เหลือ ${rem}`:`เกิน ${Math.abs(rem)}`;
  document.getElementById('calRight').style.color=rem>=0?'var(--teal)':'var(--red)';
  document.getElementById('calBarFill').style.width=Math.min(100,Math.round(tC/goal*100))+'%';
  document.getElementById('calBarFill').style.background=rem>=0?'var(--teal)':'var(--red)';

  const _mt=getMacroTargets();
  const carbTarget=_mt.carb;
  const fatTarget=_mt.fat;
  const protTarget=_mt.prot;

  document.getElementById('protIn').textContent=tP;
  document.getElementById('protRight').textContent=tP>=protTarget?'ครบ ✓':`ขาด ${protTarget-tP}g`;
  document.getElementById('protRight').style.color=tP>=protTarget?'var(--green)':'var(--amber)';
  document.getElementById('protBarFill').style.width=Math.min(100,Math.round(tP/protTarget*100))+'%';

  document.getElementById('carbIn').textContent=tCa;
  document.getElementById('carbTargetLbl').textContent=carbTarget+'g';
  const carbOver=tCa-carbTarget;
  document.getElementById('carbRight').textContent=carbOver>0?`เกิน ${carbOver}g`:`ขาด ${Math.abs(carbOver)}g`;
  document.getElementById('carbRight').style.color=carbOver>0?'var(--amber)':'var(--t3)';
  document.getElementById('carbBarFill').style.width=Math.min(100,Math.round(tCa/carbTarget*100))+'%';
  document.getElementById('carbBarFill').style.background=carbOver>0?'var(--amber)':'var(--teal)';

  document.getElementById('fatIn').textContent=tF;
  document.getElementById('fatTargetLbl').textContent=fatTarget+'g';
  const fatOver=tF-fatTarget;
  document.getElementById('fatRight').textContent=fatOver>0?`เกิน ${fatOver}g`:`ขาด ${Math.abs(fatOver)}g`;
  document.getElementById('fatRight').style.color=fatOver>0?'var(--red)':'var(--t3)';
  document.getElementById('fatBarFill').style.width=Math.min(100,Math.round(tF/fatTarget*100))+'%';
  document.getElementById('fatBarFill').style.background=fatOver>0?'var(--red)':'var(--green)';

  // Sync visible macro bars (new design)
  const _set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val;};
  const _setStyle=(id,prop,val)=>{const e=document.getElementById(id);if(e)e.style[prop]=val;};
  _set('protInVis',tP); _set('protRightVis',tP>=protTarget?'ครบ ✓':`ขาด ${protTarget-tP}g`);
  _setStyle('protBarFillVis','width',Math.min(100,Math.round(tP/protTarget*100))+'%');
  _setStyle('protRightVis','color',tP>=protTarget?'var(--green)':'var(--amber)');
  _set('carbInVis',tCa); _set('carbTargetLblVis',carbTarget+'g');
  _set('carbRightVis',carbOver>0?`เกิน ${carbOver}g`:`ขาด ${Math.abs(carbOver)}g`);
  _setStyle('carbBarFillVis','width',Math.min(100,Math.round(tCa/carbTarget*100))+'%');
  _setStyle('carbBarFillVis','background',carbOver>0?'var(--amber)':'var(--teal)');
  _set('fatInVis',tF); _set('fatTargetLblVis',fatTarget+'g');
  _set('fatRightVis',fatOver>0?`เกิน ${fatOver}g`:`ขาด ${Math.abs(fatOver)}g`);
  _setStyle('fatBarFillVis','width',Math.min(100,Math.round(tF/fatTarget*100))+'%');
  _setStyle('fatBarFillVis','background',fatOver>0?'var(--red)':'var(--green)');

  // Low carb toggle sync
  const lcEl=document.getElementById('lowCarbToggle');
  if(lcEl) lcEl.checked=lowCarbMode;
  const lcEl2=document.getElementById('lowCarbToggle2');
  if(lcEl2) lcEl2.checked=lowCarbMode;

  // Update new pill IDs
  _set('calEaten2', tC.toLocaleString());
  _set('calBurned2', exCal||0);

  // Render diary sections (MFP-style)
  const groups={breakfast:[],lunch:[],dinner:[],snack:[]};
  foodLog.forEach((f,i)=>{ const m=f.meal||'breakfast'; if(!groups[m]) groups[m]=[]; groups[m].push({...f,_i:i}); });
  ['breakfast','lunch','dinner','snack'].forEach(m=>{
    const kcalEl=document.getElementById('fds-kcal-'+m);
    const bodyEl=document.getElementById('fds-body-'+m);
    if(!bodyEl) return;
    const mFoods=groups[m];
    const mCal=mFoods.reduce((s,f)=>s+f.cal,0);
    if(kcalEl) kcalEl.textContent=mCal?mCal+' kcal':'—';
    if(!mFoods.length){bodyEl.innerHTML='';return;}
    bodyEl.innerHTML=mFoods.map(f=>`<div class="food-item">
      <div class="fi-left">
        <span class="fi-name" style="color:${f.unk?'var(--amber)':''};">${f.name}${f.unk?' ⚠️':''}</span>
        <span class="fi-macro">${f.cal} kcal · P${f.p}g · C${f.c}g · F${f.f}g</span>
      </div>
      <button class="fi-del" onclick="removeFood(${f._i})">✕</button>
    </div>`).join('');
  });

  // Keep legacy foodList in sync (hidden, compat)
  const list=document.getElementById('foodList');
  if(list) list.innerHTML='';
}

function updateRecentList(){
  const el=document.getElementById('qaList');
  const sec=document.getElementById('qaSection');
  if(!el||!sec) return;
  const recent=JSON.parse(localStorage.getItem('los_recent')||'[]');
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

// ============ FOOD PHOTO AI ============
async function openPhotoFood(){
  const modal=document.getElementById('photoModal');
  const result=document.getElementById('photoResult');
  const canvas=document.getElementById('photoCanvas');
  const video=document.getElementById('photoVideo');
  const snapBtn=document.getElementById('photoSnapBtn');

  canvas.style.display='none';
  video.style.display='block';
  result.textContent='';
  snapBtn.textContent='📸 ถ่าย';
  snapBtn.onclick=snapPhotoFood;
  modal.classList.add('on');

  try{
    photoStream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}
    });
    video.srcObject=photoStream;
    await video.play();
  }catch(e){
    result.textContent='เปิดกล้องไม่ได้: '+e.message;
  }
}

async function snapPhotoFood(){
  const video=document.getElementById('photoVideo');
  const canvas=document.getElementById('photoCanvas');
  const result=document.getElementById('photoResult');
  const snapBtn=document.getElementById('photoSnapBtn');

  canvas.width=video.videoWidth||640;
  canvas.height=video.videoHeight||480;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(video,0,0);

  if(photoStream){photoStream.getTracks().forEach(t=>t.stop());photoStream=null;}
  video.style.display='none';
  canvas.style.display='block';

  result.textContent='🤖 AI กำลังประเมิน...';
  snapBtn.textContent='…';
  snapBtn.disabled=true;

  const key=getApiKey();
  if(!key){
    result.textContent='⚠️ กรุณาใส่ Claude API Key ใน ⚙️ ตั้งค่า ก่อน';
    snapBtn.textContent='📸 ถ่ายใหม่'; snapBtn.disabled=false;
    snapBtn.onclick=()=>{canvas.style.display='none';video.style.display='block';openPhotoFood();};
    return;
  }

  const imageData=canvas.toDataURL('image/jpeg',0.8).split(',')[1];
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':key,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-allow-browser':'true'
      },
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',max_tokens:200,
        messages:[{role:'user',content:[
          {type:'image',source:{type:'base64',media_type:'image/jpeg',data:imageData}},
          {type:'text',text:'ประเมินอาหารในรูปนี้ ตอบ JSON เดียว: {"name":"ชื่ออาหารไทย","cal":int,"p":int,"c":int,"f":int} ต่อ 1 จาน/ชาม ไม่ต้องอธิบายเพิ่ม'}
        ]}]
      })
    });
    if(!res.ok){
      const errData=await res.json().catch(()=>({}));
      throw new Error(_claudeErrorMsg(res.status,errData));
    }
    const d=await res.json();
    const txt=d.content?.[0]?.text||'';
    const m=txt.match(/\{[^}]+\}/);
    if(m){
      const p=JSON.parse(m[0]);
      const name=p.name||'อาหารในรูป';
      const cal=p.cal||0,pr=p.p||0,c=p.c||0,f=p.f||0;
      FDB[name]={cal,p:pr,c,f,u:'จาน'};
      _cacheAiFood(name,cal,pr,c,f,'จาน');
      result.textContent=`✓ ${name} — ${p.cal} kcal · P${p.p}g · C${p.c}g · F${p.f}g`;
      snapBtn.textContent='✓ เพิ่มเลย';
      snapBtn.disabled=false;
      snapBtn.onclick=()=>{quickAdd(name,1);closePhotoFood();};
    } else {
      result.textContent='ประเมินไม่ได้ ลองอีกครั้ง';
      snapBtn.textContent='📸 ถ่ายใหม่'; snapBtn.disabled=false;
      snapBtn.onclick=openPhotoFood;
    }
  }catch(e){
    result.textContent='เกิดข้อผิดพลาด: '+e.message;
    snapBtn.textContent='📸 ถ่ายใหม่'; snapBtn.disabled=false;
    snapBtn.onclick=openPhotoFood;
  }
}

function closePhotoFood(){
  if(photoStream){photoStream.getTracks().forEach(t=>t.stop());photoStream=null;}
  document.getElementById('photoVideo').srcObject=null;
  document.getElementById('photoModal').classList.remove('on');
}

// ============ BARCODE ============
let _bcPending = null;

function runBarcode(){
  const code=document.getElementById('barcodeInp').value.trim();
  if(code) lookupBarcode(code);
  document.getElementById('barcodeInp').value='';
}

async function lookupBarcode(code){
  const hint=document.getElementById('barcodeHint');
  hint.innerHTML='';
  hint.style.color='var(--t3)';
  hint.textContent='🔍 กำลังค้นหา '+code+'...';
  try{
    const res=await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const d=await res.json();
    if(d.status===1&&d.product){
      const p=d.product;
      const name=(p.product_name_th||p.product_name||'สินค้า '+code).substring(0,40);
      const n=p.nutriments||{};
      // ใช้ per 100g เสมอ — แม่นกว่า per serving
      const cal100=Math.round(n['energy-kcal_100g']||n['energy-kcal']||0);
      const prot100=Math.round(n['proteins_100g']||0);
      const carb100=Math.round(n['carbohydrates_100g']||0);
      const fat100=Math.round(n['fat_100g']||0);
      // default qty: serving size ถ้ามี หรือ 100g
      const servStr=p.serving_size||'';
      const servMatch=servStr.match(/(\d+(?:\.\d+)?)/);
      const defaultQty=servMatch?Math.round(parseFloat(servMatch[1])):100;
      _bcPending={name,cal:cal100,p:prot100,c:carb100,f:fat100};
      // แสดง UI ยืนยัน
      hint.innerHTML=`
        <div style="background:var(--s2);border:1px solid var(--bd2);border-radius:var(--r2);padding:8px 10px;font-size:12px;">
          <div style="font-weight:600;color:var(--t1);margin-bottom:4px;">${name}</div>
          <div style="color:var(--t3);margin-bottom:8px;">ข้อมูลต่อ 100g — ${cal100} kcal · P${prot100}g · C${carb100}g · F${fat100}g</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="color:var(--t3);font-size:11px;">กินไปกี่กรัม?</span>
            <input id="bcQtyInp" type="number" value="${defaultQty}" min="1" max="3000"
              style="width:70px;background:var(--s3);border:1px solid var(--bd);border-radius:6px;color:var(--t1);padding:4px 8px;font-size:13px;text-align:center;">
            <span style="color:var(--t3);font-size:11px;">g</span>
            <button onclick="addBarcodeConfirm()"
              style="background:var(--lime);color:#000;border:none;border-radius:6px;padding:5px 14px;font-size:12px;font-weight:700;cursor:pointer;">
              + เพิ่ม
            </button>
            <button onclick="document.getElementById('barcodeHint').innerHTML='';_bcPending=null;"
              style="background:transparent;border:none;color:var(--t3);font-size:12px;cursor:pointer;padding:4px;">
              ยกเลิก
            </button>
          </div>
        </div>`;
    } else {
      hint.textContent='ไม่พบสินค้า barcode: '+code+' (ลองพิมพ์ชื่อในช่องอาหารแทน)';
      hint.style.color='var(--amber)';
    }
  }catch(e){
    hint.textContent='เชื่อมต่อไม่ได้ ลองอีกครั้ง';
    hint.style.color='var(--red)';
  }
}

function addBarcodeConfirm(){
  if(!_bcPending) return;
  const qty=parseFloat(document.getElementById('bcQtyInp')?.value)||100;
  const f=qty/100;
  const {name,cal,p,c,f:fat}=_bcPending;
  const displayName=`${name} (${qty}g)`;
  foodLog.push({name:displayName,cal:Math.round(cal*f),p:Math.round(p*f),c:Math.round(c*f),f:Math.round(fat*f)});
  saveFoodState(); renderFood();
  document.getElementById('barcodeHint').innerHTML='';
  document.getElementById('barcodeInp').value='';
  _bcPending=null;
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
    d.onclick=()=>{waterCount=i<waterCount?i:i+1;saveWater();buildWater();};
    c.appendChild(d);
  }
  const ml=waterCount*250;
  document.getElementById('waterVal').textContent=ml+' ml';
  const pct=Math.min(100,Math.round(ml/3000*100));
  const pf=document.getElementById('waterProgFill');
  const pt=document.getElementById('waterProgTxt');
  if(pf) pf.style.width=pct+'%';
  if(pt) pt.textContent=`${ml.toLocaleString()} / 3,000 ml`;
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
function closeTimer(){
  clearInterval(timerIv);timerRun=false;
  document.getElementById('timerModal').classList.remove('on');
  _setTimerNavDot(false);
}
function _setTimerNavDot(on){
  const btn=document.querySelector('.nbtn[onclick*="today"]');
  if(btn) btn.classList.toggle('nav-running-dot',on);
}
function _playTimerSound(){
  try{
    const ctx=new AudioContext();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.type='sine';osc.frequency.setValueAtTime(880,ctx.currentTime);
    osc.frequency.setValueAtTime(660,ctx.currentTime+0.15);
    osc.frequency.setValueAtTime(880,ctx.currentTime+0.3);
    gain.gain.setValueAtTime(0.35,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.7);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.7);
  }catch(e){}
}
function toggleTimer(){
  if(timerRun){
    clearInterval(timerIv);timerRun=false;
    document.getElementById('timerTogBtn').textContent='ต่อ';
    _setTimerNavDot(false);
    return;
  }
  if(timerSec<=0) timerSec=timerTotal;
  timerRun=true;
  _setTimerNavDot(true);
  document.getElementById('timerTogBtn').textContent='หยุด';
  timerIv=setInterval(()=>{
    timerSec--;
    document.getElementById('timerNum').textContent=fmtDisp(timerSec);
    document.getElementById('timerRing').style.strokeDashoffset=CIRC*(1-timerSec/timerTotal);
    if(timerSec<=0){
      clearInterval(timerIv);timerRun=false;
      _setTimerNavDot(false);
      document.getElementById('timerNum').textContent='✓';
      document.getElementById('timerTogBtn').textContent='เริ่มใหม่';
      document.getElementById('timerTogBtn').style.background='var(--amber)';
      if(navigator.vibrate) navigator.vibrate([300,100,300]);
      _playTimerSound();
      const lbl=document.getElementById('timerLabel')?.textContent||'จับเวลา';
      if(navigator.serviceWorker?.controller)
        navigator.serviceWorker.controller.postMessage({type:'SHOW_NOTIFICATION',title:'⏱ ครบแล้ว!',body:lbl,tag:'timer-done'});
    }
  },1000);
}

// ============ FINANCE ============
const CAT_MAP = [
  {test:/กาแฟ|ชา|นม|ข้าว|อาหาร|ก๋วยเตี๋ยว|หมู|ไก่|เนื้อ|ปลา|ขนม|ผลไม้|ร้าน|ซูชิ|พิซซ่า|บะหมี่|ลาบ|ส้มตำ|ผัด|แกง|ต้มยำ|ไอศกรีม|เบเกอรี่|น้ำปั่น|สมูทตี้|เครื่องดื่ม|น้ำผลไม้|บับเบิ้ล|ชานม|โอเลี้ยง|น้ำส้ม|น้ำมะนาว|เต้าหู้|ซาลาเปา|ปาท่องโก๋|เส้น|ไข่|สเต็ก|โปรตีน|ขนมจีน|ก๋วยจั๊บ|ข้าวต้ม|ต้มข่า|แกงเขียว|พะแนง|มัสมั่น|กะเพรา|ลาบ|หมูย่าง|ไก่ย่าง|ร้านอาหาร|food|drink|cafe|restaurant/i,ico:'🍽️',cat:'อาหาร'},
  {test:/น้ำมัน|แก๊ส|grab|แท็กซี่|taxi|รถ|bts|mrt|ขนส่ง|วิน|ค่าเดินทาง|ที่จอด/,ico:'🚗',cat:'เดินทาง'},
  {test:/เสื้อ|กางเกง|รองเท้า|ห้าง|เครื่องสำอาง|ของใช้|ช้อป|central|โลตัส|makro|bigc/,ico:'🛍️',cat:'ช้อปปิ้ง'},
  {test:/ยา|หมอ|โรงพยาบาล|คลินิก|supplement|วิตามิน|ฟิตเนส|gym/,ico:'💊',cat:'สุขภาพ'},
  {test:/หนัง|เกม|netflix|spotify|concert|ท่องเที่ยว|ดู|youtube|apple|google play/,ico:'🎮',cat:'บันเทิง'},
  {test:/เงินเดือน|salary|โบนัส|ขายของ|รายได้|reseller|commission|รับเงิน|transfer รับ|โอนเข้า|ค่าจ้าง|เงินสด|ค่าที่ปรึกษา/,ico:'💰',cat:'รายรับ',type:'in'},
  {test:/ค่าเช่า|ไฟฟ้า|ประปา|internet|wifi|บ้าน|คอนโด|หอ/,ico:'🏠',cat:'ที่พัก'},
  {test:/โทรศัพท์|มือถือ|dtac|true|ais|dtac/,ico:'📱',cat:'มือถือ'},
];

function categorizeFinance(desc){
  const d=desc.toLowerCase();
  // Check learned memory first (exact word match)
  const words=d.split(/\s+/);
  for(const w of words){
    if(catMemory[w]) return catMemory[w];
  }
  for(const c of CAT_MAP){
    if(c.test.test(d)) return {ico:c.ico,cat:c.cat,type:c.type||'out'};
  }
  return {ico:'📝',cat:'อื่นๆ',type:'out'};
}

function learnCategory(desc, result){
  const words=desc.toLowerCase().split(/\s+/);
  if(words[0]&&words[0].length>1){
    catMemory[words[0]]={ico:result.ico,cat:result.cat,type:result.type};
    saveCatMemory();
  }
}

function changeTxCat(id,cat){
  const tx=financeLog.find(t=>t.id===id);
  if(!tx) return;
  const cats=Object.entries({อาหาร:'🍽️',เดินทาง:'🚗',ช้อปปิ้ง:'🛍️',สุขภาพ:'💊',บันเทิง:'🎮',ที่พัก:'🏠',มือถือ:'📱',อื่นๆ:'📝',รายรับ:'💰'});
  const found=cats.find(([c])=>c===cat);
  if(found){
    const type=cat==='รายรับ'?'in':'out';
    tx.cat=cat; tx.ico=found[1]; tx.type=type;
    learnCategory(tx.desc,{ico:tx.ico,cat,type});
    saveFinance();
    renderMoney();
  }
}

function parseTransaction(text){
  const t=text.trim();
  if(!t) return null;
  // "กาแฟ 80" or "80 กาแฟ" or "+30000 เงินเดือน"
  const m1=t.match(/^([+\-]?\d[\d,]*(?:\.\d+)?)\s+(.+)$/);
  const m2=t.match(/^(.+?)\s+([+\-]?\d[\d,]*(?:\.\d+)?)$/);
  let desc,amount,forceType=null;

  if(m1){
    amount=parseFloat(m1[1].replace(/,/g,''));
    desc=m2?m2[1]:m1[2];
    if(m1[1].startsWith('+')) forceType='in';
    else if(m1[1].startsWith('-')) forceType='out';
    amount=Math.abs(amount);
    desc=m1[2];
  } else if(m2){
    desc=m2[1];
    amount=parseFloat(m2[2].replace(/,/g,''));
    if(m2[2].startsWith('+')) forceType='in';
    else if(m2[2].startsWith('-')) forceType='out';
    amount=Math.abs(amount);
  } else return null;

  if(!amount||isNaN(amount)) return null;
  const {ico,cat,type}=categorizeFinance(desc);
  return {
    id:Date.now().toString()+Math.random().toString(36).slice(2,5),
    date:new Date().toDateString(),
    desc:desc.trim(),
    amount,
    type:forceType||type,
    cat,
    ico
  };
}

function addTransaction(){
  const inp=document.getElementById('moneyInp');
  const tx=parseTransaction(inp.value);
  if(!tx){
    inp.style.borderColor='var(--red)';
    setTimeout(()=>{inp.style.borderColor='';},1000);
    return;
  }
  financeLog.unshift(tx);
  saveFinance();
  inp.value='';
  renderMoney();
}

function removeTransaction(id){
  financeLog=financeLog.filter(t=>t.id!==id);
  saveFinance();
  renderMoney();
}

function setMoneyPeriod(p,el){
  moneyPeriod=p;
  document.querySelectorAll('.mpbtn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  renderMoney();
}

function getMonthStart(){
  const now=new Date();
  const d=moneyBudgetStartDay||1;
  let y=now.getFullYear(), m=now.getMonth();
  if(now.getDate()<d){ m--; if(m<0){m=11;y--;} }
  return new Date(y,m,d);
}

function getFilteredTx(){
  const now=new Date();
  const todayStr=new Date().toDateString();
  const weekAgo=new Date(now.getTime()-7*24*60*60*1000);
  const monthStart=getMonthStart();
  return financeLog.filter(t=>{
    const d=new Date(t.date);
    if(moneyPeriod==='today') return t.date===todayStr;
    if(moneyPeriod==='week') return d>=weekAgo;
    if(moneyPeriod==='month') return d>=monthStart;
    return true;
  });
}

function previewMoneyCategory(val){
  const el=document.getElementById('moneyCatPreview');
  if(!el) return;
  const text=val.trim();
  if(!text){el.style.display='none';el.innerHTML='';return;}
  const r=categorizeFinance(text);
  el.innerHTML=`${r.ico} <span>${r.cat}</span>`;
  el.style.display='flex';
}

function renderMoney(){
  const txs=getFilteredTx();
  const totalIn=txs.filter(t=>t.type==='in').reduce((s,t)=>s+t.amount,0);
  const totalOut=txs.filter(t=>t.type==='out').reduce((s,t)=>s+t.amount,0);
  const bal=totalIn-totalOut;

  document.getElementById('moneyIn').textContent='฿'+totalIn.toLocaleString('th');
  document.getElementById('moneyOut').textContent='฿'+totalOut.toLocaleString('th');
  const balEl=document.getElementById('moneyBal');
  balEl.textContent=(bal>=0?'+':'')+'฿'+Math.abs(bal).toLocaleString('th');
  balEl.style.color=bal>=0?'var(--green)':'var(--red)';

  // ── Daily indicator ──
  const now=new Date();
  const todayStr=now.toDateString();
  const todaySpend=financeLog.filter(t=>t.date===todayStr&&t.type==='out').reduce((s,t)=>s+t.amount,0);
  const dayChip=document.getElementById('moneyDailyChip');
  const dayTxt=document.getElementById('moneyDailyTxt');
  if(dayChip&&dayTxt){
    dayChip.style.display='flex';
    dayTxt.textContent=`วันนี้ใช้ ฿${todaySpend.toLocaleString('th')}`;
  }

  // ── Monthly forecast ──
  const fChip=document.getElementById('moneyForecastChip');
  const fTxt=document.getElementById('moneyForecastTxt');
  if(fChip&&fTxt){
    if(moneyPeriod==='month'&&totalOut>0){
      const dayOfMonth=now.getDate();
      const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
      const forecast=Math.round(totalOut/dayOfMonth*daysInMonth);
      fChip.style.display='flex';
      fTxt.textContent=`ถ้าแบบนี้ต่อ → ฿${forecast.toLocaleString('th')}/เดือน`;
    } else {
      fChip.style.display='none';
    }
  }

  renderBudgetSection();

  const list=document.getElementById('moneyList');
  if(!txs.length){
    list.innerHTML='<div class="empty-food" style="margin-top:12px;">ยังไม่มีรายการ<br><span style="font-size:10px;">พิมพ์รายการแล้วกด Enter</span></div>';
    buildMoneyChart();
    return;
  }

  // Group by date
  const groups={};
  txs.forEach(t=>{
    if(!groups[t.date]) groups[t.date]=[];
    groups[t.date].push(t);
  });

  list.innerHTML=Object.entries(groups).map(([date,items])=>{
    const d=new Date(date);
    const label=d.toDateString()===new Date().toDateString()?'วันนี้':d.toLocaleDateString('th',{day:'numeric',month:'short'});
    const dayIn=items.filter(t=>t.type==='in').reduce((s,t)=>s+t.amount,0);
    const dayOut=items.filter(t=>t.type==='out').reduce((s,t)=>s+t.amount,0);
    return `<div class="money-group">
      <div class="money-group-hd">
        <span class="money-date-lbl">${label}</span>
        <span class="money-day-sum">
          ${dayIn>0?`<span class="c-green">+${dayIn.toLocaleString('th')}</span>`:''}
          ${dayOut>0?`<span class="c-red"> -${dayOut.toLocaleString('th')}</span>`:''}
        </span>
      </div>
      ${items.map(t=>`
        <div class="tx-row">
          <span class="tx-ico">${t.ico}</span>
          <div class="tx-info">
            <span class="tx-desc">${t.desc}</span>
            <select class="tx-cat-sel" onchange="changeTxCat('${t.id}',this.value)">
              ${['อาหาร','เดินทาง','ช้อปปิ้ง','สุขภาพ','บันเทิง','ที่พัก','มือถือ','อื่นๆ','รายรับ'].map(c=>`<option value="${c}" ${c===t.cat?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <span class="tx-amt" style="color:${t.type==='in'?'var(--green)':'var(--t1)'};">${t.type==='in'?'+':'−'}฿${t.amount.toLocaleString('th')}</span>
          <button class="fi-del" onclick="removeTransaction('${t.id}')">✕</button>
        </div>`).join('')}
    </div>`;
  }).join('');
  buildMoneyChart();
  buildMonthlySummary();
}

// ── Finance extras ──
function exportCSV(){
  const h=['วันที่','รายการ','หมวด','ประเภท','จำนวน'];
  const rows=financeLog.map(t=>[`"${t.date}"`,`"${t.desc}"`,`"${t.cat}"`,t.type==='in'?'รายรับ':'รายจ่าย',t.amount]);
  const csv=[h,...rows].map(r=>r.join(',')).join('\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`life-os-finance-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function buildMoneyChart(){
  const el=document.getElementById('moneySpendChart');
  if(!el) return;
  const txs=getFilteredTx().filter(t=>t.type==='out');
  if(!txs.length){el.style.display='none';if(charts.moneyChart){charts.moneyChart.destroy();charts.moneyChart=null;}return;}
  el.style.display='block';
  const cats={};
  txs.forEach(t=>{cats[t.cat]=(cats[t.cat]||0)+t.amount;});
  const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  const labels=sorted.map(([c])=>c);
  const data=sorted.map(([,v])=>v);
  const colors=['var(--amber)','var(--blue)','var(--lime)','var(--purple)','var(--pink)','var(--green)','var(--red)','var(--t2)','var(--t3)'];
  const canvas=document.getElementById('moneyChartCanvas');
  if(!canvas) return;
  if(charts.moneyChart) charts.moneyChart.destroy();
  charts.moneyChart=new Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels,datasets:[{data,backgroundColor:colors.slice(0,data.length),borderRadius:4,borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9},callback:v=>'฿'+v.toLocaleString('th')}},
        y:{grid:{display:false},ticks:{color:'#888894',font:{size:10}}}
      }
    }
  });
}

function buildMonthlySummary(){
  const el=document.getElementById('monthlySummary');
  if(!el||moneyPeriod!=='month'){if(el) el.innerHTML='';return;}
  const start=getMonthStart();
  const label=`${start.getDate()} ${start.toLocaleDateString('th',{month:'short'})} — วันนี้`;
  const txs=financeLog.filter(t=>new Date(t.date)>=start);
  const totalOut=txs.filter(t=>t.type==='out').reduce((s,t)=>s+t.amount,0);
  const totalIn=txs.filter(t=>t.type==='in').reduce((s,t)=>s+t.amount,0);
  const cats={};
  txs.filter(t=>t.type==='out').forEach(t=>{cats[t.cat]=(cats[t.cat]||0)+t.amount;});
  const topCat=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
  el.innerHTML=`<div class="monthly-summary-card">
    <div class="ms-title">📋 สรุปรอบบิล: ${label}</div>
    <div class="ms-row"><span>รายรับ</span><span class="c-green">+฿${totalIn.toLocaleString('th')}</span></div>
    <div class="ms-row"><span>รายจ่าย</span><span class="c-red">−฿${totalOut.toLocaleString('th')}</span></div>
    <div class="ms-row" style="border-top:1px solid var(--bd);padding-top:6px;margin-top:2px;"><span>คงเหลือ</span><span style="font-weight:700;color:${totalIn-totalOut>=0?'var(--green)':'var(--red)'};">${totalIn-totalOut>=0?'+':''}฿${(totalIn-totalOut).toLocaleString('th')}</span></div>
    ${topCat?`<div style="font-size:10px;color:var(--t3);margin-top:6px;">หมวดใช้มากสุด: ${topCat[0]} ฿${topCat[1].toLocaleString('th')}</div>`:''}
  </div>`;
}

// ── Recurring transactions ──
function applyRecurring(){
  if(!recurringTx.length) return;
  const today=new Date(), todayStr=today.toDateString();
  recurringTx.forEach(r=>{
    if(!r.active) return;
    const last=r.lastDate?new Date(r.lastDate):null;
    let shouldAdd=false;
    if(r.period==='daily'&&(!last||last.toDateString()!==todayStr)) shouldAdd=true;
    if(r.period==='monthly'){
      if(!last||(today.getMonth()!==last.getMonth()||today.getFullYear()!==last.getFullYear())){
        if(today.getDate()>=r.dayOfMonth) shouldAdd=true;
      }
    }
    if(r.period==='weekly'){
      if(!last||(today-last)>=7*86400000) shouldAdd=true;
    }
    if(shouldAdd){
      financeLog.unshift({
        id:Date.now().toString()+Math.random().toString(36).slice(2,5),
        date:todayStr,desc:r.desc+'(recurring)',amount:r.amount,type:r.type,cat:r.cat,ico:r.ico
      });
      r.lastDate=todayStr;
    }
  });
  saveRecurring();
  saveFinance();
}

function openRecurringModal(){
  renderRecurringList();
  document.getElementById('recurringModal').classList.add('on');
}
function closeRecurringModal(){document.getElementById('recurringModal').classList.remove('on');}

function addRecurring(){
  const desc=document.getElementById('rec_desc').value.trim();
  const amount=parseFloat(document.getElementById('rec_amount').value);
  const period=document.getElementById('rec_period').value;
  const dayOfMonth=parseInt(document.getElementById('rec_day').value)||1;
  if(!desc||!amount||isNaN(amount)) return;
  const {ico,cat,type}=categorizeFinance(desc);
  recurringTx.push({id:'rec'+Date.now(),desc,amount,period,dayOfMonth,type,cat,ico,active:true,lastDate:null});
  saveRecurring();
  document.getElementById('rec_desc').value='';
  document.getElementById('rec_amount').value='';
  renderRecurringList();
}

function removeRecurring(id){
  recurringTx=recurringTx.filter(r=>r.id!==id);
  saveRecurring();
  renderRecurringList();
}

function renderRecurringList(){
  const el=document.getElementById('recurringList');
  if(!el) return;
  el.innerHTML=recurringTx.length?recurringTx.map(r=>`
    <div class="tx-row">
      <span class="tx-ico">${r.ico}</span>
      <div class="tx-info">
        <span class="tx-desc">${r.desc}</span>
        <span class="tx-cat">${r.cat} · ${r.period==='monthly'?'ทุกวันที่ '+r.dayOfMonth:r.period==='weekly'?'ทุกสัปดาห์':'ทุกวัน'}</span>
      </div>
      <span class="tx-amt" style="color:${r.type==='in'?'var(--green)':'var(--t1)'};">${r.type==='in'?'+':'−'}฿${r.amount.toLocaleString('th')}</span>
      <button class="fi-del" onclick="removeRecurring('${r.id}')">✕</button>
    </div>`).join('')
    :'<div class="empty-food" style="padding:10px 0;">ยังไม่มีรายการประจำ</div>';
}

// ── Receipt photo ──
function openReceiptModal(){
  document.getElementById('receiptResult').textContent='';
  document.getElementById('receiptModal').classList.add('on');
  document.getElementById('receiptCanvas').style.display='none';
  document.getElementById('receiptVideo').style.display='block';
  document.getElementById('receiptSnapBtn').style.display='';
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false})
    .then(s=>{receiptStream=s;document.getElementById('receiptVideo').srcObject=s;})
    .catch(()=>{document.getElementById('receiptResult').textContent='ไม่สามารถเข้าถึงกล้องได้';});
}
function closeReceiptModal(){
  if(receiptStream){receiptStream.getTracks().forEach(t=>t.stop());receiptStream=null;}
  document.getElementById('receiptModal').classList.remove('on');
}
async function snapReceipt(){
  const video=document.getElementById('receiptVideo');
  const canvas=document.getElementById('receiptCanvas');
  const btn=document.getElementById('receiptSnapBtn');
  canvas.width=video.videoWidth||640; canvas.height=video.videoHeight||480;
  canvas.getContext('2d').drawImage(video,0,0);
  video.style.display='none'; canvas.style.display='block';
  btn.style.display='none';
  if(receiptStream){receiptStream.getTracks().forEach(t=>t.stop());receiptStream=null;}
  const key=getApiKey();
  const resultEl=document.getElementById('receiptResult');
  if(!key){resultEl.textContent='⚠️ ต้องใส่ Claude API Key ในตั้งค่าก่อน';return;}
  resultEl.textContent='🤖 กำลังอ่านใบเสร็จ...';
  const b64=canvas.toDataURL('image/jpeg',0.6).split(',')[1];
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',max_tokens:300,
        messages:[{role:'user',content:[
          {type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}},
          {type:'text',text:'อ่านใบเสร็จ/สลิปในรูปนี้ ตอบเป็น JSON เท่านั้น [{desc:"ชื่อรายการ",amount:จำนวนเงิน,type:"in"หรือ"out"}] ถ้าไม่ชัดเจนให้เดาที่สุด ห้ามอธิบายเพิ่ม'}
        ]}]
      })
    });
    if(!res.ok){
      const errData=await res.json().catch(()=>({}));
      throw new Error(_claudeErrorMsg(res.status,errData));
    }
    const data=await res.json();
    const txt=data.content?.[0]?.text||'';
    const m=txt.match(/\[[\s\S]*\]/);
    if(m){
      const items=JSON.parse(m[0]);
      items.forEach(item=>{
        const {ico,cat}=categorizeFinance(item.desc);
        const type=item.type||'out';
        financeLog.unshift({
          id:Date.now().toString()+Math.random().toString(36).slice(2,5),
          date:new Date().toDateString(),desc:item.desc,amount:Math.abs(item.amount),type,cat,ico
        });
      });
      saveFinance();
      renderMoney();
      resultEl.textContent=`✅ บันทึก ${items.length} รายการแล้ว`;
      setTimeout(closeReceiptModal,1200);
    } else { resultEl.textContent='❌ อ่านไม่ได้ ลองถ่ายใหม่ให้ชัดกว่านี้'; }
  }catch(e){ resultEl.textContent='❌ Error: '+e.message; }
}

// ── Budget add/remove ──
function addBudgetCat(){
  const n=document.getElementById('budNewCat')?.value.trim();
  const v=parseInt(document.getElementById('budNewCap')?.value)||0;
  if(!n) return;
  budgetCaps[n]=v;
  saveBudget();
  document.getElementById('budNewCat').value='';
  document.getElementById('budNewCap').value='';
  openBudgetModal();
  renderBudgetSection();
}
function removeBudgetCat(cat){
  delete budgetCaps[cat];
  saveBudget();
  openBudgetModal();
  renderBudgetSection();
}

// ============ GOALS ============
let userGoals=[];

function loadGoals(){
  try{const g=localStorage.getItem('los_goals');if(g) userGoals=JSON.parse(g);}catch(e){}
}
function saveGoals(){localStorage.setItem('los_goals',JSON.stringify(userGoals));fbSaveGoals(userGoals);}

function openGoalForm(){
  document.getElementById('gf_ico').value='';
  document.getElementById('gf_name').value='';
  document.getElementById('gf_current').value='';
  document.getElementById('gf_target').value='';
  document.getElementById('gf_unit').value='';
  document.getElementById('gf_deadline').value='';
  document.getElementById('goalFormModal').classList.add('on');
}
function closeGoalForm(){document.getElementById('goalFormModal').classList.remove('on');}

function submitGoalForm(){
  const name=document.getElementById('gf_name').value.trim();
  const current=parseFloat(document.getElementById('gf_current').value);
  const target=parseFloat(document.getElementById('gf_target').value);
  const unit=document.getElementById('gf_unit').value.trim();
  if(!name||isNaN(current)||isNaN(target)||!unit) return;
  const ico=document.getElementById('gf_ico').value.trim()||'🎯';
  const deadline=document.getElementById('gf_deadline').value||'';
  const goal={
    id:'g'+Date.now(),name,ico,current,target,unit,startVal:current,deadline,
    updates:[{date:new Date().toDateString(),val:current}]
  };
  userGoals.push(goal);
  saveGoals();
  closeGoalForm();
  buildGoals(JSON.parse(localStorage.getItem('los_hist')||'{}'),[]);
}

function openGoalUpdate(id){
  const g=userGoals.find(x=>x.id===id);
  if(!g) return;
  document.getElementById('goalUpdateName').textContent=g.ico+' '+g.name;
  document.getElementById('gu_val').value=g.current;
  document.getElementById('gu_unit_lbl').textContent=g.unit;
  document.getElementById('goalUpdateBtn').onclick=()=>submitGoalUpdate(id);
  document.getElementById('goalUpdateModal').classList.add('on');
}
function closeGoalUpdate(){document.getElementById('goalUpdateModal').classList.remove('on');}

function submitGoalUpdate(id){
  const val=parseFloat(document.getElementById('gu_val').value);
  if(isNaN(val)) return;
  const g=userGoals.find(x=>x.id===id);
  if(!g) return;
  g.current=val;
  g.updates=g.updates||[];
  const todayStr=new Date().toDateString();
  const todayUpdate=g.updates.find(u=>u.date===todayStr);
  if(todayUpdate) todayUpdate.val=val; else g.updates.push({date:todayStr,val});
  saveGoals();
  closeGoalUpdate();
  buildGoals(JSON.parse(localStorage.getItem('los_hist')||'{}'),[]);
}

function deleteGoal(id){
  userGoals=userGoals.filter(g=>g.id!==id);
  saveGoals();
  buildGoals(JSON.parse(localStorage.getItem('los_hist')||'{}'),[]);
}

function projectGoal(g){
  const updates=g.updates||[];
  if(updates.length<2) return null;
  const sorted=[...updates].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const first=sorted[0], last=sorted[sorted.length-1];
  const days=Math.max(1,(new Date(last.date)-new Date(first.date))/86400000);
  const rate=(last.val-first.val)/days;
  const needIncrease=g.target>g.startVal;
  const moving=needIncrease?rate>0:rate<0;
  if(!moving||Math.abs(rate)<0.001) return null;
  const remaining=g.target-g.current;
  const daysLeft=Math.ceil(Math.abs(remaining)/Math.abs(rate));
  if(daysLeft>0&&daysLeft<3650){
    const dt=new Date(); dt.setDate(dt.getDate()+daysLeft);
    return {days:daysLeft,date:dt};
  }
  return null;
}

// ============ REPORT ============
// Match a goal's name to the weightLog field it should auto-sync from
function goalSyncField(name){
  if(name.includes('ไขมันในช่องท้อง')||name.toLowerCase().includes('visceral')) return 'visceral';
  if(name.includes('กล้ามเนื้อ')||name.includes('กล้าม')) return 'muscle';
  if(name.includes('ไขมัน')) return 'fat';
  if(name.includes('น้ำหนัก')) return 'weight';
  return null;
}

// Split a goal's startVal→target into ~5-unit steps (capped 2-6) so progress feels incremental
function goalMilestones(g){
  const range=Math.abs(g.target-g.startVal);
  if(range<1) return [];
  const stepCount=Math.max(2,Math.min(6,Math.round(range/5)));
  const step=range/stepCount;
  const dir=g.target>g.startVal?1:-1;
  return Array.from({length:stepCount},(_,i)=>+(g.startVal+dir*step*(i+1)).toFixed(1));
}

// Fire a celebration toast the first time a new weigh-in crosses a weight-goal milestone
function checkWeightMilestoneCelebration(prevWeight,newWeight){
  if(prevWeight==null) return;
  const wtGoal=userGoals.find(g=>goalSyncField(g.name)==='weight');
  if(!wtGoal) return;
  const needIncrease=wtGoal.target>wtGoal.startVal;
  const milestones=goalMilestones(wtGoal);
  milestones.forEach((m,i)=>{
    const wasCrossed=needIncrease?prevWeight>=m:prevWeight<=m;
    const nowCrossed=needIncrease?newWeight>=m:newWeight<=m;
    if(!wasCrossed&&nowCrossed){
      showToast('🎉',`ผ่านหมุดที่ ${i+1} แล้ว!`,i+1<milestones.length?`เหลืออีก ${milestones.length-i-1} หมุดถึงเป้า ${wtGoal.target}${wtGoal.unit}`:`ถึงเป้าหมาย ${wtGoal.target}${wtGoal.unit} แล้ว!`);
    }
  });
}

// Pace vs a linear start→deadline plan. refDate = date the live `current` value came from.
function getGoalPaceInfo(g,current,refDate){
  if(!g.deadline) return null;
  const startEntry=(g.updates||[])[0];
  if(!startEntry) return null;
  const startDate=new Date(startEntry.date);
  const deadlineDate=new Date(g.deadline);
  const totalDays=(deadlineDate-startDate)/86400000;
  if(totalDays<=0) return null;
  if(refDate){
    const staleDays=Math.floor((new Date()-new Date(refDate))/86400000);
    if(staleDays>10) return{stale:true,staleDays};
  }
  const daysElapsed=Math.max(0,(new Date()-startDate)/86400000);
  const frac=Math.min(1,daysElapsed/totalDays);
  const plannedVal=g.startVal+(g.target-g.startVal)*frac;
  const needIncrease=g.target>g.startVal;
  const diff=needIncrease?(current-plannedVal):(plannedVal-current);
  if(Math.abs(diff)<=0.3) return{status:'ตรงแผน',color:'var(--t2)'};
  if(diff>0) return{status:`เร็วกว่าแผน ${Math.abs(diff).toFixed(1)}${g.unit}`,color:'var(--green)'};
  return{status:`ช้ากว่าแผน ${Math.abs(diff).toFixed(1)}${g.unit}`,color:'var(--amber)'};
}

// Icon per coin-log entry, inferred from its key prefix (icon itself isn't persisted, only used for the toast)
function _coinLogIcon(key){
  if(!key) return '🪙';
  if(key.startsWith('task_')) return '✅';
  if(key==='daily70') return '🎯';
  if(key==='exercise') return '🏃';
  if(key==='food') return '🍽️';
  if(key==='water') return '💧';
  if(key==='mood') return '😊';
  if(key==='sleep') return '🌙';
  if(key.startsWith('weight')) return '⚖️';
  if(key==='streak7'||key==='streak30') return '🔥';
  return '🪙';
}

function renderTravelFundCard(){
  const el=document.getElementById('travelFundCard');
  if(!el) return;
  const totalBaht=Math.floor(coinBalance/COIN_RATE);
  const pending=pendingBaht.toFixed(1);
  const recent=[...coinLog].reverse().slice(0,5);
  el.innerHTML=`<div class="travel-card">
    <div class="travel-hero">
      <div class="travel-hero-ico">🏝️</div>
      <div class="travel-hero-val">฿${totalBaht.toLocaleString('th')}</div>
      <div class="travel-hero-lbl">สะสมทั้งหมด</div>
      <div class="travel-coin-pill">🪙 ${coinBalance.toLocaleString('th')} coin</div>
    </div>
    ${pendingBaht>0?`<div class="travel-pending-card">
      <div class="travel-pending-top">
        <span class="travel-pending-ico">✈️</span>
        <div>
          <div class="travel-pending-lbl">รอโอนเข้าบัญชีท่องเที่ยว</div>
          <div class="travel-pending-val">฿${pending}</div>
        </div>
      </div>
      <button class="travel-confirm-btn" onclick="confirmCoinTransfer()">ยืนยันโอนแล้ว ✓</button>
    </div>`:`<div class="travel-pending-empty">${coinBalance>0?'โอนล่าสุดแล้ว ✓ ทำต่อเพื่อสะสมรอบใหม่':'ทำ routine/บันทึกอะไรก็ได้ในแอปเพื่อเริ่มสะสม coin'}</div>`}
    ${recent.length?`<div class="travel-log-title">กิจกรรมล่าสุด</div>
    <div class="travel-log">
      ${recent.map(c=>`<div class="travel-log-row">
        <span class="travel-log-ico">${_coinLogIcon(c.key)}</span>
        <span class="travel-log-lbl">${c.label}</span>
        <span class="travel-log-amt">+${c.amount}</span>
      </div>`).join('')}
    </div>`:''}
  </div>`;
}

function buildGoals(hist, dates){
  loadGoals();
  const el=document.getElementById('goalSection');
  if(!el) return;

  // avg task completion from passed dates or last 7 days
  const checkDates=dates.length?dates:(()=>{const d=[];for(let i=6;i>=0;i--){const x=new Date();x.setDate(x.getDate()-i);d.push(x.toDateString());}return d;})();
  const taskVals=checkDates.map(d=>hist[d]?.task||0).filter(v=>v>0);
  const avgTask=taskVals.length?Math.round(taskVals.reduce((a,b)=>a+b,0)/taskVals.length):0;
  const momentum=avgTask>=75?{txt:'momentum ดี 🟢',c:'var(--green)'}:avgTask>=50?{txt:'ทำต่อเนื่องได้ดีขึ้น 🟡',c:'var(--amber)'}:{txt:'ต้องสม่ำเสมอกว่านี้ 🔴',c:'var(--red)'};

  if(!userGoals.length){
    el.innerHTML=`<div class="goal-empty">
      <div style="font-size:28px;margin-bottom:8px;">🎯</div>
      <div style="font-size:13px;font-weight:600;color:var(--t1);margin-bottom:4px;">ยังไม่มีเป้าหมาย</div>
      <div style="font-size:11px;color:var(--t3);line-height:1.6;">กด <strong style="color:var(--lime);">+ เพิ่ม</strong> เพื่อตั้งเป้าหมายชีวิต<br>เช่น ลดน้ำหนัก 75→68kg · ออมเงิน · วิ่ง 5km</div>
    </div>`;
    return;
  }

  // Sort: weight goal first (unit=kg, losing weight), then others
  const sorted=[...userGoals].sort((a,b)=>{
    const aIsWt=a.unit==='kg'&&a.target<a.startVal;
    const bIsWt=b.unit==='kg'&&b.target<b.startVal;
    return bIsWt-aIsWt;
  });

  const latestW=weightLog.length?[...weightLog].sort((a,b)=>new Date(b.date)-new Date(a.date))[0]:null;

  el.innerHTML=sorted.map(g=>{
    const syncField=goalSyncField(g.name);
    const liveVal=syncField&&latestW&&latestW[syncField]!=null?latestW[syncField]:null;
    const current=liveVal!=null?liveVal:g.current;

    const needIncrease=g.target>g.startVal;
    const totalRange=Math.abs(g.target-g.startVal)||1;
    const progress=needIncrease?current-g.startVal:g.startVal-current;
    const pct=Math.min(100,Math.max(0,Math.round(progress/totalRange*100)));
    const met=needIncrease?current>=g.target:current<=g.target;
    const proj=projectGoal(g);
    const deadlineTxt=g.deadline?` · ครบ ${new Date(g.deadline).toLocaleDateString('th',{day:'numeric',month:'short',year:'2-digit'})}`:'';
    const projTxt=proj?`คาดถึงเป้าใน ~${proj.days} วัน (${proj.date.toLocaleDateString('th',{day:'numeric',month:'short'})})`:'';
    const remaining=Math.abs(g.target-current);

    const isWtGoal=syncField==='weight'&&g.target<g.startVal;
    const syncedHint=liveVal!=null?` <span style="font-size:9px;color:var(--t3);">(ล่าสุด ${liveVal}${g.unit})</span>`:'';

    const milestones=goalMilestones(g);
    const crossedCount=milestones.filter(m=>needIncrease?current>=m:current<=m).length;
    const milestoneHtml=milestones.length?`
      <div class="goal-milestones">
        ${milestones.map((m,i)=>`<span class="goal-mstone-dot${i<crossedCount?' done':''}"></span>`).join('')}
        <span class="goal-mstone-lbl">หมุดที่ ${crossedCount}/${milestones.length}</span>
      </div>`:'';

    const refDate=liveVal!=null?latestW.date:((g.updates&&g.updates.length)?g.updates[g.updates.length-1].date:null);
    const paceInfo=getGoalPaceInfo(g,current,refDate);
    const paceHtml=paceInfo?(paceInfo.stale
      ?`<div class="goal-pace" style="color:var(--t3);">⚠️ ไม่ได้อัปเดตมา ${paceInfo.staleDays} วัน — ประเมิน pace ไม่ได้แม่นยำ</div>`
      :`<div class="goal-pace" style="color:${paceInfo.color};">${paceInfo.status}</div>`):'';

    return `<div class="goal-card${isWtGoal?' goal-wt-primary':''}">
      ${isWtGoal?`<div class="goal-wt-banner">⚖️ เป้าหมายหลัก — ลดน้ำหนัก</div>`:''}
      <div class="goal-hd">
        <span class="goal-ico">${g.ico}</span>
        <div class="goal-info">
          <div class="goal-name">${g.name}${syncedHint}</div>
          <div class="goal-nums">${current}${g.unit} → เป้า ${g.target}${g.unit}${deadlineTxt}</div>
        </div>
        <div class="goal-actions">
          <button class="goal-upd-btn" onclick="openGoalUpdate('${g.id}')">อัปเดต</button>
          <button class="fi-del" onclick="deleteGoal('${g.id}')">✕</button>
        </div>
      </div>
      <div class="goal-prog-row">
        <div class="goal-bar-wrap"><div class="goal-bar"><div class="goal-fill" style="width:${pct}%;background:${met?'var(--green)':isWtGoal?'var(--lime)':'var(--blue)'};"></div></div></div>
        <span class="goal-pct-lbl" style="color:${met?'var(--green)':'var(--t2)'};">${met?'✓':pct+'%'}</span>
      </div>
      ${milestoneHtml}
      ${paceHtml}
      <div class="goal-footer">
        ${met?`<span style="color:var(--green);">✓ ถึงเป้าแล้ว! ยอดเยี่ยมมาก</span>`:`<span>ยังต้อง ${remaining}${g.unit}</span> ${projTxt?`· <span style="color:var(--amber);">${projTxt}</span>`:''}`}
      </div>
    </div>`;
  }).join('')+`<div class="goal-momentum">
    <span style="font-size:11px;color:var(--t2);">routine เฉลี่ย ${avgTask||'—'}% ต่อวัน</span>
    <span style="font-size:11px;color:${momentum.c};">${avgTask?momentum.txt:'—'}</span>
  </div>`;
}

function setRP(p,el){
  reportPeriod=p;
  document.querySelectorAll('.rtab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  buildReport();
}

function buildReport(){
  const hist=JSON.parse(localStorage.getItem('los_hist')||'{}');
  const count=reportPeriod==='week'?7:30;

  // Build current & previous period date arrays
  const dates=[],labels=[],prevDates=[];
  for(let i=count-1;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    dates.push(d.toDateString());
    labels.push(reportPeriod==='week'?DAY_TH[d.getDay()].substring(0,2):String(d.getDate()));
  }
  for(let i=count*2-1;i>=count;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    prevDates.push(d.toDateString());
  }

  // Current period data from hist
  const calData=dates.map(d=>hist[d]?.cal||0);
  const protData=dates.map(d=>hist[d]?.prot||0);
  const taskData=dates.map(d=>hist[d]?.task||0);

  // Exercise & sleep data (not in hist — from separate logs)
  const exData=dates.map(d=>exerciseLog.filter(e=>e.date===d).reduce((s,e)=>s+(e.duration||0),0));
  const sleepData=dates.map(d=>{const sl=sleepLog[d];return sl?calcSleepHours(sl.bedtime,sl.wakeTime):0;});

  // Previous period data
  const prevCalData=prevDates.map(d=>hist[d]?.cal||0);
  const prevProtData=prevDates.map(d=>hist[d]?.prot||0);
  const prevExData=prevDates.map(d=>exerciseLog.filter(e=>e.date===d).reduce((s,e)=>s+(e.duration||0),0));
  const prevSleepData=prevDates.map(d=>{const sl=sleepLog[d];return sl?calcSleepHours(sl.bedtime,sl.wakeTime):0;});

  // Helpers
  const nz=arr=>arr.filter(v=>v>0);
  const avg=arr=>nz(arr).length?Math.round(nz(arr).reduce((a,b)=>a+b,0)/nz(arr).length):0;
  const avgF=(arr,dec=1)=>{const a=nz(arr);return a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(dec):0;};

  // Streak — count back from today regardless of period
  let streak=0;
  for(let i=0;i<365;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    if((hist[d.toDateString()]?.task||0)>0) streak++;
    else break;
  }
  const el_sn=document.getElementById('streakNum');
  const el_ss=document.getElementById('streakSub');
  if(el_sn) el_sn.textContent=streak;
  if(el_ss) el_ss.textContent=streak>0?`${reportPeriod==='week'?'สัปดาห์':'เดือน'}นี้`:'ยังไม่มีข้อมูล';

  // Period avg health score (simplified per-day calc)
  const scores=dates.map(d=>{
    const mood=moodLog[d]||0;
    const recov=mood?Math.round(mood/5*30):0;
    const exMin=exerciseLog.filter(e=>e.date===d).reduce((s,e)=>s+(e.duration||0),0);
    const exPt=Math.min(35,Math.round(exMin/90*35));
    const sl=sleepLog[d];
    let slPt=0;
    if(sl){const h=calcSleepHours(sl.bedtime,sl.wakeTime);slPt=Math.max(0,Math.min(20,Math.round(20-Math.abs(h-7.5)*2.5+(sl.quality-3))));}
    let medPt=15;
    if(medList.length){const taken=(medTaken[d]||[]).filter(id=>medList.some(m=>m.id===id)).length;medPt=Math.round(taken/medList.length*15);}
    const total=recov+exPt+slPt+medPt;
    return total>0?total:null;
  }).filter(v=>v!==null);
  const avgScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  const el_as=document.getElementById('rptAvgScore');
  if(el_as) el_as.textContent=avgScore||'—';

  // Averages
  const avgCalVal=avg(calData);
  const avgProtVal=avg(protData);
  const avgExVal=avg(exData);
  const avgSleepVal=parseFloat(avgF(sleepData));
  const prevAvgCal=avg(prevCalData);
  const prevAvgProt=avg(prevProtData);
  const prevAvgEx=avg(prevExData);
  const prevAvgSleep=parseFloat(avgF(prevSleepData));

  // Legacy hidden IDs (keep for external code referencing them)
  const _s=id=>document.getElementById(id);
  if(_s('avgCal')) _s('avgCal').textContent=avgCalVal||'—';
  if(_s('avgProt')) _s('avgProt').textContent=avgProtVal?(avgProtVal+'g'):'—';
  if(_s('avgTask')) _s('avgTask').textContent=avg(taskData)?(avg(taskData)+'%'):'—';

  // Trend HTML builder
  const trendHtml=(curr,prev,higherBetter=true)=>{
    if(!curr||!prev) return `<span style="color:var(--t3);font-size:9px;">—</span>`;
    const diff=curr-prev;
    const pct=Math.round(Math.abs(diff)/Math.max(1,prev)*100);
    if(pct<3) return `<span style="color:var(--t3);font-size:9px;">≈</span>`;
    const good=(diff>0)===higherBetter;
    const arrow=diff>0?'↑':'↓';
    return `<span style="color:${good?'var(--green)':'var(--red)'};font-size:10px;font-weight:700;">${arrow}${pct}%</span>`;
  };

  // Period header
  const el_vs=document.getElementById('rptVsBadge');
  if(el_vs) el_vs.textContent=reportPeriod==='week'?'vs สัปดาห์ที่แล้ว':'vs เดือนที่แล้ว';

  // Tile values
  if(_s('rptAvgCal')) _s('rptAvgCal').textContent=avgCalVal||'—';
  if(_s('rptAvgProt')) _s('rptAvgProt').textContent=avgProtVal?(avgProtVal+'g'):'—';
  if(_s('rptAvgEx')) _s('rptAvgEx').textContent=avgExVal?(avgExVal+'m'):'—';
  if(_s('rptAvgSleep')) _s('rptAvgSleep').textContent=avgSleepVal?(avgSleepVal+'h'):'—';
  if(_s('trendCal')) _s('trendCal').innerHTML=trendHtml(avgCalVal,prevAvgCal,false);
  if(_s('trendProt')) _s('trendProt').innerHTML=trendHtml(avgProtVal,prevAvgProt,true);
  if(_s('trendEx')) _s('trendEx').innerHTML=trendHtml(avgExVal,prevAvgEx,true);
  if(_s('trendSleep')) _s('trendSleep').innerHTML=trendHtml(avgSleepVal,prevAvgSleep,true);

  buildGoals(hist,dates);
  renderRoadmap();
  renderTravelFundCard();
  buildWeeklyReview(hist,dates);
  buildMoneySummary(dates);

  // ── Weight trend line chart ──
  const wtInPeriod=weightLog.filter(w=>dates.includes(w.date)).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(charts['weightChart']){charts['weightChart'].destroy();delete charts['weightChart'];}
  const wtCanvas=document.getElementById('weightChart');
  if(wtCanvas){
    if(wtInPeriod.length>=2){
      const wtGoal=userGoals.find(g=>g.unit==='kg'&&g.target<g.startVal);
      const wtLabels=wtInPeriod.map(w=>new Date(w.date).toLocaleDateString('th',{day:'numeric',month:'short'}));
      const wtVals=wtInPeriod.map(w=>w.weight);
      const wtDatasets=[{
        label:'น้ำหนัก',data:wtVals,
        borderColor:'rgba(184,240,0,0.9)',backgroundColor:'rgba(184,240,0,0.06)',
        borderWidth:2,pointBackgroundColor:'rgba(184,240,0,1)',pointRadius:3,tension:0.3,fill:true
      }];
      if(wtGoal) wtDatasets.push({label:'เป้า '+wtGoal.target+'kg',data:wtInPeriod.map(()=>wtGoal.target),borderColor:'rgba(240,160,32,0.5)',borderWidth:1.5,borderDash:[5,5],pointRadius:0,fill:false,tension:0});
      charts['weightChart']=new Chart(wtCanvas.getContext('2d'),{
        type:'line',data:{labels:wtLabels,datasets:wtDatasets},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:!!wtGoal,labels:{color:'#6a6a75',font:{size:9},boxWidth:12}}},
          scales:{x:{grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9}}},
            y:{grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9}}}}}
      });
    } else {
      // Show empty state message on canvas
      const ctx=wtCanvas.getContext('2d');
      ctx.clearRect(0,0,wtCanvas.width,wtCanvas.height);
      const parent=wtCanvas.closest('.chart-card');
      if(parent&&!parent.querySelector('.chart-empty')){
        const em=document.createElement('div');em.className='chart-empty';
        em.textContent='บันทึกน้ำหนักอย่างน้อย 2 วันเพื่อดูกราฟ';
        parent.appendChild(em);
      }
    }
  }

  // ── Calorie bar chart ──
  const barCfg=(data,color,target)=>{
    const ds=[{data,backgroundColor:data.map(v=>v>0?color.replace('1)','0.6)'):'rgba(34,34,40,0.5)'),
      borderColor:data.map(v=>v>0?color:'transparent'),borderWidth:1,borderRadius:3}];
    if(target) ds.push({type:'line',data:dates.map(()=>target),borderColor:'rgba(184,240,0,0.35)',borderWidth:1.5,borderDash:[4,4],pointRadius:0,fill:false,tension:0});
    return{type:'bar',data:{labels,datasets:ds},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9}}},
          y:{grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9}}}}}};
  };
  if(charts['calChart']) charts['calChart'].destroy();
  charts['calChart']=new Chart(document.getElementById('calChart').getContext('2d'),
    barCfg(calData,'rgba(240,160,32,1)',getCalTarget(new Date().getDay())));

  // ── Mood trend line chart ──
  const moodVals2=dates.map(d=>moodLog[d]||null);
  if(charts['moodChart']){charts['moodChart'].destroy();delete charts['moodChart'];}
  const moodCanvas=document.getElementById('moodChart');
  if(moodCanvas){
    const hasAnyMood=moodVals2.some(v=>v!==null);
    if(hasAnyMood){
      const MOOD_CLR=['','#ef4444','#f97316','#eab308','#84cc16','#22c55e'];
      charts['moodChart']=new Chart(moodCanvas.getContext('2d'),{
        type:'line',
        data:{labels,datasets:[{
          label:'อารมณ์',data:moodVals2,
          borderColor:'rgba(138,120,240,0.9)',backgroundColor:'rgba(138,120,240,0.08)',
          borderWidth:2,pointBackgroundColor:moodVals2.map(v=>v?MOOD_CLR[v]:'transparent'),
          pointRadius:moodVals2.map(v=>v?4:0),pointHoverRadius:6,
          tension:0.3,fill:true,spanGaps:true
        }]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},
            tooltip:{callbacks:{label:ctx=>{const v=ctx.raw;return v?['','เศร้า','หดหู่','ปกติ','ดี','ยอดเยี่ยม'][v]:'';}}},
          },
          scales:{
            x:{grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9}}},
            y:{min:0,max:5,grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9},stepSize:1,
              callback:v=>['','😞','😕','😐','😊','😁'][v]||''}}
          }
        }
      });
    } else {
      const ctx2=moodCanvas.getContext('2d');
      ctx2.clearRect(0,0,moodCanvas.width,moodCanvas.height);
      const parent2=moodCanvas.closest('.chart-card');
      if(parent2&&!parent2.querySelector('.chart-empty')){
        const em2=document.createElement('div');em2.className='chart-empty';
        em2.textContent='บันทึกอารมณ์เพื่อดูกราฟ';parent2.appendChild(em2);
      }
    }
  }

  // ── Sleep trend chart ──
  const sleepHrsChart=dates.map(d=>{const sl=sleepLog[d];return sl?parseFloat(calcSleepHours(sl.bedtime,sl.wakeTime).toFixed(1)):null;});
  const sleepQChart=dates.map(d=>sleepLog[d]?.quality||null);
  if(charts['sleepChart']){charts['sleepChart'].destroy();delete charts['sleepChart'];}
  const sleepCanvas=document.getElementById('sleepChart');
  if(sleepCanvas){
    const hasAnySleep=sleepHrsChart.some(v=>v!==null);
    if(hasAnySleep){
      charts['sleepChart']=new Chart(sleepCanvas.getContext('2d'),{
        type:'bar',
        data:{labels,datasets:[
          {type:'bar',label:'ชั่วโมง',data:sleepHrsChart,
           backgroundColor:sleepHrsChart.map(v=>v===null?'transparent':v>=7?'rgba(138,120,240,0.55)':v>=6?'rgba(240,160,32,0.55)':'rgba(240,80,80,0.45)'),
           borderColor:sleepHrsChart.map(v=>v===null?'transparent':v>=7?'rgba(138,120,240,0.9)':v>=6?'rgba(240,160,32,0.9)':'rgba(240,80,80,0.8)'),
           borderWidth:1,borderRadius:3,yAxisID:'y'},
          {type:'line',label:'คุณภาพ',data:sleepQChart,
           borderColor:'rgba(96,165,250,0.8)',backgroundColor:'transparent',
           borderWidth:1.5,pointBackgroundColor:'rgba(96,165,250,1)',
           pointRadius:sleepQChart.map(v=>v?3:0),tension:0.3,spanGaps:true,yAxisID:'y2'}
        ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:true,labels:{color:'#6a6a75',font:{size:9},boxWidth:10}}},
          scales:{
            x:{grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9}}},
            y:{min:0,max:10,grid:{color:'rgba(42,42,50,0.5)'},ticks:{color:'#4a4a55',font:{size:9}},
               title:{display:true,text:'h',color:'#4a4a55',font:{size:8}}},
            y2:{position:'right',min:0,max:5,grid:{display:false},
               ticks:{color:'#4a4a55',font:{size:9},stepSize:1},
               title:{display:true,text:'★',color:'#4a4a55',font:{size:8}}}
          }
        }
      });
    } else {
      const ctxSl=sleepCanvas.getContext('2d');
      ctxSl.clearRect(0,0,sleepCanvas.width,sleepCanvas.height);
      const parentSl=sleepCanvas.closest('.chart-card');
      if(parentSl&&!parentSl.querySelector('.chart-empty')){
        const emSl=document.createElement('div');emSl.className='chart-empty';
        emSl.textContent='บันทึกการนอนเพื่อดูกราฟ';parentSl.appendChild(emSl);
      }
    }
  }

  // Destroy legacy hidden charts
  ['protChart','waterChart','taskChart'].forEach(id=>{if(charts[id]){charts[id].destroy();delete charts[id];}});
}

function buildMoneySummary(dates){
  const el=document.getElementById('rptMoneySummary');
  if(!el) return;
  const txs=financeLog.filter(t=>dates.includes(t.date));
  if(!txs.length){
    el.innerHTML=`<div class="rpt-money-card"><div class="rpt-money-title">💳 การเงิน${reportPeriod==='week'?'สัปดาห์':'เดือน'}นี้</div><div style="text-align:center;color:var(--t3);font-size:12px;padding:12px 0;">ยังไม่มีรายการ</div></div>`;
    return;
  }
  const income=txs.filter(t=>t.type==='in').reduce((s,t)=>s+t.amount,0);
  const expense=txs.filter(t=>t.type==='out').reduce((s,t)=>s+t.amount,0);
  const balance=income-expense;
  const catMap={};
  txs.filter(t=>t.type==='out').forEach(t=>{catMap[t.cat]=(catMap[t.cat]||0)+t.amount;});
  const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
  el.innerHTML=`<div class="rpt-money-card">
    <div class="rpt-money-title">💳 การเงิน${reportPeriod==='week'?'สัปดาห์':'เดือน'}นี้</div>
    <div class="rpt-money-row">
      <div class="rpt-money-item">
        <div class="rpt-money-val" style="color:var(--green);">+${income.toLocaleString()}</div>
        <div class="rpt-money-lbl">รายรับ</div>
      </div>
      <div class="rpt-money-sep"></div>
      <div class="rpt-money-item">
        <div class="rpt-money-val" style="color:var(--red);">−${expense.toLocaleString()}</div>
        <div class="rpt-money-lbl">รายจ่าย</div>
      </div>
      <div class="rpt-money-sep"></div>
      <div class="rpt-money-item">
        <div class="rpt-money-val" style="color:${balance>=0?'var(--lime)':'var(--amber)'};">${balance>=0?'+':''}${balance.toLocaleString()}</div>
        <div class="rpt-money-lbl">ยอดสุทธิ</div>
      </div>
    </div>
    ${topCat?`<div class="rpt-money-top">หมวดสูงสุด: <strong style="color:var(--amber);">${topCat[0]}</strong> · ${topCat[1].toLocaleString()} บาท</div>`:''}
  </div>`;
}

// ============ NOTIFICATIONS ============
function getApiKey(){return localStorage.getItem('claude_api_key')||'';}

function _claudeErrorMsg(status,data){
  if(status===401) return 'API Key ไม่ถูกต้อง — ตรวจสอบใน ⚙️ ตั้งค่า';
  if(status===403) return 'API Key ไม่มีสิทธิ์เรียกใช้ (เช็คใน console.anthropic.com)';
  if(status===429) return 'เรียกถี่เกินไป หรือเครดิตหมด ลองใหม่อีกครั้ง';
  if(status>=500) return 'Anthropic server มีปัญหาชั่วคราว ลองใหม่อีกครั้ง';
  return data?.error?.message||('เกิดข้อผิดพลาด ('+status+')');
}

// Cache AI-estimated food nutrition into customFoods so repeat lookups don't re-call the API
function _cacheAiFood(name,cal,p,c,f,u){
  const existing=customFoods.find(cf=>cf.name===name);
  if(existing){ Object.assign(existing,{cal,p,c,f,u}); }
  else{ customFoods.push({id:'cf'+Date.now(),name,cal,p,c,f,u}); }
  localStorage.setItem('los_custom_foods',JSON.stringify(customFoods));
}
function saveApiKey(){
  const k=document.getElementById('apiKeyInp').value.trim();
  localStorage.setItem('claude_api_key',k);
}

function openSettings(){
  loadNotifSettings();
  const k=getApiKey();
  if(k) document.getElementById('apiKeyInp').value=k;
  document.getElementById('settingsPanel').classList.add('on');
}
function closeSettings(){document.getElementById('settingsPanel').classList.remove('on');}

function exportAllData(){
  try{
    const hist=JSON.parse(localStorage.getItem('los_hist')||'{}');
    const payload={
      exportDate:new Date().toISOString(),
      version:'iam-v21',
      hist,
      weightLog,
      moodLog,
      sleepLog,
      exerciseLog,
      medList,
      medTaken,
      foodLog,
      financeLog,
      budgetCaps,
      waterCount,
      illnessLog,
      userGoals,
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const d=new Date();
    a.href=url;
    a.download=`iam-backup-${d.toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾','Export สำเร็จ',`iam-backup-${d.toISOString().slice(0,10)}.json`);
  }catch(e){showToast('⚠️','Export ล้มเหลว',e.message);}
}

const FIXED_NOTIFS=[
  {key:'morning', label:'ตื่นนอน 07:00'},
  {key:'water',   label:'น้ำ (09:30 · 11:30 · 14:30 · 16:30 · 19:30)'},
  {key:'lunch',   label:'มื้อกลางวัน 12:00'},
  {key:'night',   label:'Skincare คืน 19:45'},
  {key:'sleep',   label:'นอน 22:30'},
  {key:'finance', label:'บันทึกการเงิน 20:30'},
  {key:'weight',  label:'ชั่งน้ำหนัก (อา. ถ้ายังไม่ชั่งมา 7 วัน)'},
];
function _getHiddenNotifs(){
  try{return new Set(JSON.parse(localStorage.getItem('los_hidden_notifs')||'[]'));}catch{return new Set();}
}
function renderFixedNotifList(){
  const el=document.getElementById('fixedNotifList');
  if(!el) return;
  const hidden=_getHiddenNotifs();
  const s=JSON.parse(localStorage.getItem('los_notif')||'{}');
  const visible=FIXED_NOTIFS.filter(n=>!hidden.has(n.key));
  if(!visible.length){
    el.innerHTML=`<div style="font-size:11px;color:var(--t3);padding:4px 0;">ไม่มีการแจ้งเตือนที่ตั้งค่าไว้ <button onclick="resetFixedNotifs()" style="background:none;border:none;color:var(--orange);font-size:11px;cursor:pointer;padding:0;">รีเซต</button></div>`;
    return;
  }
  el.innerHTML=visible.map((n,i)=>`
    <div class="notif-row" style="${i===visible.length-1?'border-bottom:none;':''}">
      <span style="flex:1;">${n.label}</span>
      <label class="toggle" style="flex-shrink:0;"><input type="checkbox" id="nt_${n.key}" ${s[n.key]?'checked':''} onchange="saveNotifSettings()"><span class="tg-slider"></span></label>
      <button onclick="deleteFixedNotif('${n.key}')" style="background:none;border:none;color:var(--t3);font-size:14px;cursor:pointer;padding:2px 4px;flex-shrink:0;line-height:1;" title="ลบ">✕</button>
    </div>`).join('');
}
function deleteFixedNotif(key){
  const hidden=_getHiddenNotifs();
  hidden.add(key);
  localStorage.setItem('los_hidden_notifs',JSON.stringify([...hidden]));
  renderFixedNotifList();
}
function resetFixedNotifs(){
  localStorage.removeItem('los_hidden_notifs');
  renderFixedNotifList();
}

function saveNotifSettings(){
  const hidden=_getHiddenNotifs();
  const keys=FIXED_NOTIFS.map(n=>n.key).filter(k=>!hidden.has(k));
  const s={};
  keys.forEach(k=>{s[k]=document.getElementById('nt_'+k)?.checked||false;});
  localStorage.setItem('los_notif',JSON.stringify(s));
  const sd=document.getElementById('budgetStartDay');
  if(sd){moneyBudgetStartDay=parseInt(sd.value)||1;localStorage.setItem('los_budget_start',moneyBudgetStartDay);}
  const hasAny=Object.values(s).some(v=>v);
  if(hasAny&&Notification.permission==='default'){
    Notification.requestPermission();
  }
}

function loadNotifSettings(){
  try{
    renderFixedNotifList();
    const sd=document.getElementById('budgetStartDay');
    if(sd) sd.value=moneyBudgetStartDay||1;
  }catch(e){}
}

const NOTIF_TIMES={
  '07:00':{key:'morning',title:'🌅 ถึงเวลาตื่นนอนแล้ว',body:'ดื่มน้ำ 500ml · กินมื้อเช้า · Skincare เช้า'},
  '09:30':{key:'water',title:'💧 ดื่มน้ำ',body:'ถึงเวลาดื่มน้ำ 250ml แล้ว'},
  '11:30':{key:'water',title:'💧 ดื่มน้ำ',body:'ก่อนมื้อกลางวัน — ดื่มน้ำ 250ml'},
  '12:00':{key:'lunch',title:'🍱 มื้อกลางวัน',body:'โปรตีน + ผัก · ลดข้าวขาว'},
  '14:30':{key:'water',title:'💧 ดื่มน้ำ',body:'บ่ายแล้ว — ดื่มน้ำ 250ml'},
  '16:30':{key:'water',title:'💧 ดื่มน้ำ',body:'เย็นแล้ว — ดื่มน้ำ 250ml'},
  '19:30':{key:'water',title:'💧 ดื่มน้ำ',body:'ก่อนค่ำ — ดื่มน้ำ 250ml'},
  '19:45':{key:'shower_pm',title:'🚿 อาบน้ำ + Skincare คืน',body:'อาบน้ำ · ทาครีมตัว · ดูแลผิวหน้า'},
  '22:30':{key:'sleep',title:'🛌 ถึงเวลานอน',body:'ปิดหน้าจอ · ห้องมืด เย็น เงียบ'},
  '20:30':{key:'finance',title:'💰 บันทึกรายรับ-รายจ่าย',body:'จดรายการวันนี้ก่อนลืม'},
};

async function sendNotification(title, body, icon){
  icon=icon||'/icons/icon-192.png';
  if(!('Notification' in window)) return;
  if(Notification.permission!=='granted') return;
  try{
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.ready;
      // Use SW showNotification (works in background on Android PWA)
      await reg.showNotification(title,{
        body, icon, badge:icon,
        vibrate:[200,100,200],
        tag:'iam-notif',
        renotify:true
      });
      return;
    }
  }catch(e){ /* fall through */ }
  // Fallback: page-context notification
  try{ new Notification(title,{body,icon}); }catch(e2){}
}

function checkNotifications(){
  if(!('Notification' in window)||Notification.permission!=='granted') return;
  const now=new Date();
  const hm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const notif=NOTIF_TIMES[hm];
  if(notif&&!notifSentToday.has(hm)){
    const s=JSON.parse(localStorage.getItem('los_notif')||'{}');
    const hidden=_getHiddenNotifs();
    if(s[notif.key]&&!hidden.has(notif.key)){
      notifSentToday.add(hm);
      sendNotification(notif.title,notif.body);
    }
  }
  checkMedNotifs();
  checkWeightReminder(now);
  checkLowWaterReminder(now);
  checkCoinTransferReminder(now);
}

function checkCoinTransferReminder(now){
  if(now.getDay()!==1) return; // ทุกวันจันทร์
  const key='coin_transfer_reminder_'+now.toDateString();
  if(notifSentToday.has(key)) return;
  if(pendingBaht>0){
    notifSentToday.add(key);
    sendNotification('🏝️ ไปโอนเงินเที่ยวกันเถอะ',`สัปดาห์นี้สะสมได้ ฿${pendingBaht.toFixed(1)} บาท ไปโอนเข้าบัญชีท่องเที่ยวได้เลย!`);
  }
}

function checkLowWaterReminder(now){
  const s=JSON.parse(localStorage.getItem('los_notif')||'{}');
  if(!s.water) return;
  const key='low_water_reminder_'+now.toDateString();
  if(notifSentToday.has(key)) return;
  const latest=weightLog.length?[...weightLog].sort((a,b)=>new Date(b.date)-new Date(a.date))[0]:null;
  if(latest&&latest.water&&latest.water<50&&(now-new Date(latest.date))<3*86400000){
    notifSentToday.add(key);
    sendNotification('💧 น้ำในร่างกายต่ำ',`น้ำในร่างกายวัดได้ ${latest.water}% (ต่ำกว่ามาตรฐาน) ดื่มน้ำเพิ่มวันนี้นะ`);
  }
}

function checkWeightReminder(now){
  const s=JSON.parse(localStorage.getItem('los_notif')||'{}');
  if(!s.weight) return;
  if(now.getDay()!==0) return;  // only Sunday
  const key='weight_reminder_'+now.toDateString();
  if(notifSentToday.has(key)) return;
  const lastWt=weightLog.length?[...weightLog].sort((a,b)=>new Date(b.date)-new Date(a.date))[0]:null;
  if(!lastWt||(now-new Date(lastWt.date))>7*86400000){
    notifSentToday.add(key);
    sendNotification('⚖️ ชั่งน้ำหนักด้วยนะ','ไม่ได้ชั่งมาสักพักแล้ว บันทึกใน Health เพื่อดูความคืบหน้า');
  }
}

function testNotification(){
  if(Notification.permission==='default'){
    Notification.requestPermission().then(p=>{
      if(p==='granted') sendNotification('🔔 Iam — ทดสอบ','การแจ้งเตือนทำงานปกติ ✓');
    });
  } else if(Notification.permission==='granted'){
    sendNotification('🔔 Iam — ทดสอบ','การแจ้งเตือนทำงานปกติ ✓');
  } else {
    showToast('⚠️','แจ้งเตือนถูกบล็อก','กรุณาเปิดใน Settings ของ browser');
  }
}

// ============ HEALTH ============
const DEFAULT_MEDS=[
  {id:'med1',name:'Finasteride 1mg',time:'07:00',ico:'💊'},
];

const DEFAULT_BUDGET={'อาหาร':8000,'เดินทาง':3000,'ช้อปปิ้ง':2000,'บันเทิง':1000,'สุขภาพ':2000,'ที่พัก':9000,'มือถือ':500,'อื่นๆ':2000};

function loadHealth(){
  try{
    const w=localStorage.getItem('los_weight');if(w) weightLog=JSON.parse(w);
    const uh=localStorage.getItem('los_height');if(uh) userHeight=parseFloat(uh);
    const cb=localStorage.getItem('los_coins');if(cb) coinBalance=parseFloat(cb)||0;
    const pb=localStorage.getItem('los_pending_baht');if(pb) pendingBaht=parseFloat(pb)||0;
    const cl=localStorage.getItem('los_coin_log');if(cl) coinLog=JSON.parse(cl);
    const sbg=localStorage.getItem('los_streak_bonus');if(sbg) streakBonusGiven=JSON.parse(sbg);
    const m=localStorage.getItem('los_mood');if(m) moodLog=JSON.parse(m);
    const ml=localStorage.getItem('los_meds');
    medList=ml?JSON.parse(ml):[...DEFAULT_MEDS];
    const mt=localStorage.getItem('los_med_taken');if(mt) medTaken=JSON.parse(mt);
    const bc=localStorage.getItem('los_budget');
    budgetCaps=bc?JSON.parse(bc):{...DEFAULT_BUDGET};
    const il=localStorage.getItem('los_illness');if(il) illnessLog=JSON.parse(il);
    const cm=localStorage.getItem('los_cat_memory');if(cm) catMemory=JSON.parse(cm);
    const rt=localStorage.getItem('los_recurring');if(rt) recurringTx=JSON.parse(rt);
    const bd=localStorage.getItem('los_budget_start');if(bd) moneyBudgetStartDay=parseInt(bd)||1;
    // New state
    const sl=localStorage.getItem('los_sleep');if(sl) sleepLog=JSON.parse(sl);
    const el=localStorage.getItem('los_exercise');if(el) exerciseLog=JSON.parse(el);
    const lc=localStorage.getItem('los_lowcarb');if(lc) lowCarbMode=JSON.parse(lc);
    const ifs=localStorage.getItem('los_if');if(ifs) ifSettings=JSON.parse(ifs);
    const cf=localStorage.getItem('los_custom_foods');if(cf) customFoods=JSON.parse(cf);
    const cm2=localStorage.getItem('los_custom_meals');if(cm2) customMeals=JSON.parse(cm2);
    const cr=localStorage.getItem('los_custom_recipes');if(cr) customRecipes=JSON.parse(cr);
    // Add custom foods to FDB
    customFoods.forEach(f=>{ FDB[f.name]={cal:f.cal,p:f.p,c:f.c,f:f.f,u:f.u||'ที่'};});
  }catch(e){ medList=[...DEFAULT_MEDS]; budgetCaps={...DEFAULT_BUDGET}; }
}

// ============ COINS (gamification → travel fund) ============
const COIN_RATE=100; // 100 coin = 1 บาท — วันเทพ (ครบ task+ออกกำลังกาย+กิน) ควรได้ ~70 บาท
function _coinPayload(){return{coinBalance,pendingBaht,coinLog,streakBonusGiven};}

function hasEarnedToday(key){
  return coinLog.some(c=>c.date===TODAY&&c.key===key);
}

// key = stable id used for once-per-day dedup, label = human-readable toast text
function earnCoins(amount,key,label,icon){
  coinBalance+=amount;
  pendingBaht+=amount/COIN_RATE;
  coinLog.push({date:TODAY,amount,key,label});
  if(coinLog.length>200) coinLog=coinLog.slice(-200);
  localStorage.setItem('los_coins',coinBalance);
  localStorage.setItem('los_pending_baht',pendingBaht);
  localStorage.setItem('los_coin_log',JSON.stringify(coinLog));
  if(typeof fbSaveCoins==='function') fbSaveCoins(_coinPayload());
  renderCoinBadge();
  showToast(icon||'🪙',`+${amount} coin!`,label);
}

function renderCoinBadge(){
  const el=document.getElementById('hdrCoinBaht');
  if(el) el.textContent='฿'+Math.floor(coinBalance/COIN_RATE);
}

function checkStreakBonus(streak){
  if(streak<=0){
    if(streakBonusGiven.s7||streakBonusGiven.s30){
      streakBonusGiven={s7:false,s30:false};
      localStorage.setItem('los_streak_bonus',JSON.stringify(streakBonusGiven));
    }
    return;
  }
  if(streak>=7&&!streakBonusGiven.s7){
    streakBonusGiven.s7=true;
    localStorage.setItem('los_streak_bonus',JSON.stringify(streakBonusGiven));
    earnCoins(3000,'streak7','ทำต่อเนื่อง 7 วัน!','🔥');
  }
  if(streak>=30&&!streakBonusGiven.s30){
    streakBonusGiven.s30=true;
    localStorage.setItem('los_streak_bonus',JSON.stringify(streakBonusGiven));
    earnCoins(15000,'streak30','ทำต่อเนื่อง 30 วัน!','🏆');
  }
}

// น้ำหนักให้ coin แค่สัปดาห์ละครั้ง (ผู้ใช้ไม่อยากชั่งทุกวันเพื่อ farm coin)
function tryEarnWeeklyWeightCoin(){
  const last=localStorage.getItem('los_last_weight_coin_date');
  const daysSince=last?(new Date()-new Date(last))/86400000:999;
  if(daysSince>=7){
    localStorage.setItem('los_last_weight_coin_date',new Date().toISOString());
    earnCoins(1500,'weight_'+TODAY,'ชั่งน้ำหนักประจำสัปดาห์','⚖️');
  }
}

function confirmCoinTransfer(){
  if(pendingBaht<=0) return;
  pendingBaht=0;
  localStorage.setItem('los_pending_baht',0);
  if(typeof fbSaveCoins==='function') fbSaveCoins(_coinPayload());
  renderTravelFundCard();
  showToast('✅','ยืนยันโอนแล้ว','เคลียร์ยอดรอโอนเรียบร้อย');
}

function _healthPayload(){return{weightLog,moodLog,illnessLog,medList,medTaken,sleepLog};}
function _moneyPayload(){return{txLog:financeLog,budgetCaps,catMemory,recurringTx,startDay:moneyBudgetStartDay};}

function saveWeightLog(){localStorage.setItem('los_weight',JSON.stringify(weightLog));fbSaveHealth(_healthPayload());}
function saveUserHeight(){
  const v=parseFloat(document.getElementById('heightInp')?.value);
  if(!v||v<100||v>250) return;
  userHeight=v;
  localStorage.setItem('los_height',v);
  renderHealth();
}
function saveMoodLog(){localStorage.setItem('los_mood',JSON.stringify(moodLog));fbSaveHealth(_healthPayload());}
function saveMeds(){localStorage.setItem('los_meds',JSON.stringify(medList));fbSaveHealth(_healthPayload());}
function saveMedTaken(){localStorage.setItem('los_med_taken',JSON.stringify(medTaken));fbSaveHealth(_healthPayload());}
function saveBudget(){localStorage.setItem('los_budget',JSON.stringify(budgetCaps));fbSaveMoney(_moneyPayload());}
function saveIllness(){localStorage.setItem('los_illness',JSON.stringify(illnessLog));fbSaveHealth(_healthPayload());}
function saveCatMemory(){localStorage.setItem('los_cat_memory',JSON.stringify(catMemory));fbSaveMoney(_moneyPayload());}
function saveRecurring(){localStorage.setItem('los_recurring',JSON.stringify(recurringTx));fbSaveMoney(_moneyPayload());}

// ── Weight ──
function toggleFullScan(){
  const row=document.getElementById('fullScanRow');
  const btn=document.getElementById('fullScanToggleBtn');
  if(!row) return;
  const on=row.style.display==='none';
  row.style.display=on?'flex':'none';
  if(btn) btn.textContent=on?'− ซ่อนข้อมูลสแกน':'+ ข้อมูลสแกนเพิ่มเติม';
}
function logWeight(){
  const v=parseFloat(document.getElementById('wtInp')?.value);
  if(isNaN(v)||v<20||v>300) return;
  const prevWeight=weightLog.length?[...weightLog].sort((a,b)=>new Date(b.date)-new Date(a.date))[0].weight:null;
  const fat=parseFloat(document.getElementById('wtFatInp')?.value);
  const muscle=parseFloat(document.getElementById('wtMuscleInp')?.value);
  const water=parseFloat(document.getElementById('wtWaterInp')?.value);
  const bone=parseFloat(document.getElementById('wtBoneInp')?.value);
  const visceral=parseFloat(document.getElementById('wtVisceralInp')?.value);
  const bmr=parseFloat(document.getElementById('wtBmrInp')?.value);
  const todayStr=new Date().toDateString();
  const ex=weightLog.findIndex(x=>x.date===todayStr);
  const entry={date:todayStr,weight:v};
  if(!isNaN(fat)&&fat>0) entry.fat=fat;
  if(!isNaN(muscle)&&muscle>0) entry.muscle=muscle;
  if(!isNaN(water)&&water>0) entry.water=water;
  if(!isNaN(bone)&&bone>0) entry.bone=bone;
  if(!isNaN(visceral)&&visceral>0) entry.visceral=visceral;
  if(!isNaN(bmr)&&bmr>0) entry.bmr=bmr;
  if(ex>=0) weightLog[ex]=entry; else weightLog.unshift(entry);
  saveWeightLog();
  document.getElementById('wtInp').value='';
  const fEl=document.getElementById('wtFatInp');if(fEl)fEl.value='';
  const mEl=document.getElementById('wtMuscleInp');if(mEl)mEl.value='';
  ['wtWaterInp','wtBoneInp','wtVisceralInp','wtBmrInp'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  renderHealth();
  checkWeightMilestoneCelebration(prevWeight,v);
  tryEarnWeeklyWeightCoin();
}

// ── Mood ──
function logMood(score){
  moodLog[TODAY]=score;
  saveMoodLog();
  renderHealth();
  if(!hasEarnedToday('mood')) earnCoins(500,'mood','บันทึกอารมณ์วันนี้','😊');
}

const MOOD_EMOJI=['','😴','😐','😊','💪','🔥'];
const MOOD_LBL=['','อ่อนแรง','พอไหว','โอเค','ดีมาก','สุดยอด!'];

// ── Meds ──
function toggleMedTaken(id){
  if(!medTaken[TODAY]) medTaken[TODAY]=[];
  const idx=medTaken[TODAY].indexOf(id);
  if(idx>=0) medTaken[TODAY].splice(idx,1);
  else medTaken[TODAY].push(id);
  saveMedTaken();
  renderHealth();
  if(id==='med1') _syncFinasterideTask();
}

function openMedModal(){
  renderMedManage();
  document.getElementById('medModal').classList.add('on');
}
function closeMedModal(){document.getElementById('medModal').classList.remove('on');}

function addMed(){
  const name=document.getElementById('med_name_inp').value.trim();
  const time=document.getElementById('med_time_inp').value||'08:00';
  const ico=document.getElementById('med_ico_inp').value.trim()||'💊';
  if(!name) return;
  medList.push({id:'med'+Date.now(),name,time,ico});
  saveMeds();
  document.getElementById('med_name_inp').value='';
  document.getElementById('med_time_inp').value='';
  document.getElementById('med_ico_inp').value='';
  renderMedManage();
  renderHealth();
}

function deleteMed(id){
  medList=medList.filter(m=>m.id!==id);
  saveMeds();
  renderMedManage();
  renderHealth();
}

function renderMedManage(){
  const el=document.getElementById('medManageList');
  if(!el) return;
  el.innerHTML=medList.map(m=>`
    <div class="med-manage-row">
      <span>${m.ico} ${m.name}</span>
      <span style="font-family:var(--mono);font-size:10px;color:var(--t3);">${m.time}</span>
      <button class="fi-del" onclick="deleteMed('${m.id}')">✕</button>
    </div>`).join('');
}

// ── Illness tracking ──
const SICK_SEV=['','😴 เล็กน้อย','😷 พอทนได้','🤒 ค่อนข้างแย่','🥵 แย่มาก','💀 ทรมานมาก'];

function openSickModal(){
  const cur=illnessLog.find(i=>!i.end);
  if(cur){
    endSick(); return;
  }
  document.getElementById('sickName').value='';
  document.getElementById('sickSev').value='2';
  document.querySelectorAll('.sev-btn').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.sev-btn')[1]?.classList.add('on');
  document.getElementById('sickModal').classList.add('on');
}
function closeSickModal(){document.getElementById('sickModal').classList.remove('on');}

function selectSev(v){
  document.getElementById('sickSev').value=v;
  document.querySelectorAll('.sev-btn').forEach((b,i)=>b.classList.toggle('on',i+1===v));
}

function startSick(){
  const name=document.getElementById('sickName').value.trim()||'ไม่ระบุ';
  const sev=parseInt(document.getElementById('sickSev').value)||2;
  illnessLog.push({id:'ill'+Date.now(),start:TODAY,end:null,name,sev});
  saveIllness();
  closeSickModal();
  renderIllnessCard();
}

function endSick(){
  const cur=illnessLog.find(i=>!i.end);
  if(cur){ cur.end=TODAY; saveIllness(); renderIllnessCard(); }
}

function deleteSickEntry(id){
  illnessLog=illnessLog.filter(i=>i.id!==id);
  saveIllness();
  renderIllnessCard();
}

function resetIllness(){
  if(!confirm('ล้างประวัติการป่วยทั้งหมด?')) return;
  illnessLog=[];
  saveIllness();
  renderIllnessCard();
}

function renderIllnessCard(){
  const el=document.getElementById('illnessCard');
  if(!el) return;
  const cur=illnessLog.find(i=>!i.end);
  const ended=illnessLog.filter(i=>i.end);
  const totalTimes=illnessLog.length;
  const avgDays=ended.length?
    (ended.reduce((s,i)=>s+(new Date(i.end)-new Date(i.start))/86400000+1,0)/ended.length).toFixed(1):0;
  const thisYear=illnessLog.filter(i=>new Date(i.start).getFullYear()===new Date().getFullYear()).length;
  const sickDays=cur?Math.round((new Date()-new Date(cur.start))/86400000)+1:0;

  const recent=[...illnessLog].sort((a,b)=>new Date(b.start)-new Date(a.start)).slice(0,5);

  el.innerHTML=`
    <div class="health-card-hd">
      <span class="health-card-title">🤒 การป่วย</span>
      <div style="display:flex;gap:5px;">
        <button class="med-check ${cur?'on':''}" onclick="openSickModal()">
          ${cur?`😷 ป่วยอยู่ ${sickDays}วัน — หาย`:'+ บันทึกป่วย'}
        </button>
        <button class="fi-del" style="font-size:10px;color:var(--t3);" onclick="resetIllness()">ล้าง</button>
      </div>
    </div>
    ${cur?`<div class="sick-current">
      <span>${SICK_SEV[cur.sev||2]}</span>
      <span style="color:var(--t2);">${cur.name||'ไม่ระบุ'}</span>
      <span style="color:var(--t3);font-size:10px;">ตั้งแต่ ${new Date(cur.start).toLocaleDateString('th',{day:'numeric',month:'short'})}</span>
    </div>`:''}
    <div class="sick-stats" style="margin:8px 0;">
      <div class="sick-stat"><div class="ws-val c-amber">${thisYear}</div><div class="ws-lbl">ครั้งปีนี้</div></div>
      <div class="sick-stat"><div class="ws-val c-amber">${avgDays||'—'}</div><div class="ws-lbl">วันเฉลี่ย</div></div>
      <div class="sick-stat"><div class="ws-val c-amber">${totalTimes}</div><div class="ws-lbl">รวมทั้งหมด</div></div>
    </div>
    ${recent.length?`<div class="sick-history">
      ${recent.map(i=>`<div class="sick-hist-row">
        <span class="sick-sev-ico">${SICK_SEV[i.sev||2].split(' ')[0]}</span>
        <div class="sick-hist-info">
          <span class="sick-hist-name">${i.name||'ไม่ระบุ'}</span>
          <span class="sick-hist-date">${new Date(i.start).toLocaleDateString('th',{day:'numeric',month:'short'})}${i.end?' → '+new Date(i.end).toLocaleDateString('th',{day:'numeric',month:'short'}):'— ยังป่วย'} · ${SICK_SEV[i.sev||2].split(' ').slice(1).join(' ')}</span>
        </div>
        <button class="fi-del" onclick="deleteSickEntry('${i.id}')">✕</button>
      </div>`).join('')}
    </div>`:''}`;
}

// ── Render Health page ──
function renderHealth(){
  const hInp=document.getElementById('heightInp');
  if(hInp&&userHeight) hInp.value=userHeight;
  renderHealthScore();
  renderHealthTiles();
  renderMoodCard();
  renderWeightCard();
  renderSleepCard();
  renderWeightPrediction();
  renderIllnessCard();
  renderMedCard();
}

function renderMoodCard(){
  const el=document.getElementById('moodRow');
  if(!el) return;
  const cur=moodLog[TODAY]||0;
  document.getElementById('moodResult').textContent=cur?`${MOOD_EMOJI[cur]} ${MOOD_LBL[cur]} (วันนี้)`:'เลือกระดับพลังงานของวันนี้';
  el.querySelectorAll('.mood-btn').forEach((b,i)=>{
    b.classList.toggle('on',i+1===cur);
  });
}

// ── Body composition status thresholds (rough, informational — not medical advice) ──
function bcStatus(key,val){
  if(val==null||isNaN(val)) return null;
  switch(key){
    case 'bmi':
      if(val<18.5) return{label:'ต่ำ',color:'var(--amber)'};
      if(val<23) return{label:'มาตรฐาน',color:'var(--green)'};
      return{label:'สูง',color:'var(--red)'};
    case 'fat':
      if(val<10) return{label:'ต่ำ',color:'var(--amber)'};
      if(val<20) return{label:'มาตรฐาน',color:'var(--green)'};
      return{label:'สูง',color:'var(--red)'};
    case 'water':
      if(val<50) return{label:'ต่ำ',color:'var(--amber)'};
      if(val<=65) return{label:'มาตรฐาน',color:'var(--green)'};
      return{label:'ยอดเยี่ยม',color:'var(--blue)'};
    case 'musclePct':
      if(val<45) return{label:'ต่ำ',color:'var(--amber)'};
      if(val<=60) return{label:'มาตรฐาน',color:'var(--green)'};
      return{label:'ยอดเยี่ยม',color:'var(--blue)'};
    case 'bonePct':
      if(val<3) return{label:'ต่ำ',color:'var(--amber)'};
      if(val<=5) return{label:'มาตรฐาน',color:'var(--green)'};
      return{label:'ยอดเยี่ยม',color:'var(--blue)'};
    case 'visceral':
      if(val<=9) return{label:'มาตรฐาน',color:'var(--green)'};
      return{label:'สูง',color:val>=15?'var(--red)':'var(--amber)'};
    case 'bmr':
      if(val<2000) return{label:'ต่ำ',color:'var(--amber)'};
      return{label:'มาตรฐาน',color:'var(--green)'};
    default: return null;
  }
}

function buildBodyCompGrid(entry,weight){
  if(!entry||!weight) return '';
  const cell=(lbl,val,unit,status)=>`
    <div class="bc-cell">
      <div class="bc-cell-lbl">${lbl}</div>
      <div class="bc-cell-val">${val}<span class="bc-cell-unit">${unit}</span></div>
      ${status?`<div class="bc-cell-status" style="color:${status.color};">${status.label}</div>`:''}
    </div>`;
  const cells=[];
  const bmi=userHeight?weight/((userHeight/100)**2):null;
  cells.push(bmi?cell('BMI',bmi.toFixed(1),'',bcStatus('bmi',bmi)):cell('BMI','—','',{label:'ตั้งส่วนสูงในตั้งค่า',color:'var(--t3)'}));
  if(entry.fat) cells.push(cell('ไขมัน',entry.fat,'%',bcStatus('fat',entry.fat)));
  if(entry.water) cells.push(cell('น้ำ',entry.water,'%',bcStatus('water',entry.water)));
  if(entry.muscle) cells.push(cell('กล้ามเนื้อ',entry.muscle,'%',bcStatus('musclePct',entry.muscle)));
  if(entry.bone) cells.push(cell('กระดูก',entry.bone,'%',bcStatus('bonePct',entry.bone)));
  if(entry.visceral) cells.push(cell('ไขมันช่องท้อง',entry.visceral,'',bcStatus('visceral',entry.visceral)));
  if(entry.bmr) cells.push(cell('BMR',entry.bmr,'kcal',bcStatus('bmr',entry.bmr)));
  if(cells.length<=1) return '';
  return `<div class="bc-grid">${cells.join('')}</div>`;
}

function renderWeightCard(){
  const wtEl=document.getElementById('wtToday');
  const statsEl=document.getElementById('wtStats');
  if(!wtEl||!statsEl) return;

  const todayEntry=weightLog.find(x=>x.date===TODAY);
  if(todayEntry){
    wtEl.textContent=todayEntry.weight+'kg';
    // Pre-fill body comp inputs with latest values
    const fEl=document.getElementById('wtFatInp');
    const mEl=document.getElementById('wtMuscleInp');
    if(fEl&&todayEntry.fat) fEl.placeholder=todayEntry.fat+'%';
    if(mEl&&todayEntry.muscle) mEl.placeholder=todayEntry.muscle+'%';
  } else { wtEl.textContent='—'; }

  if(!weightLog.length){statsEl.innerHTML='<div style="font-size:11px;color:var(--t3);">บันทึกน้ำหนักวันนี้ก่อนเลย</div>';return;}

  const sorted=[...weightLog].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const first=sorted[0], last=sorted[sorted.length-1];
  const change=last.weight-first.weight;
  const days=Math.max(1,(new Date(last.date)-new Date(first.date))/86400000);
  const rate=change/days;

  // Body composition from latest entry that has any scan data
  const latestComp=[...sorted].reverse().find(x=>x.fat||x.muscle||x.water||x.bone||x.visceral||x.bmr);
  const compHtml=latestComp?buildBodyCompGrid(latestComp,last.weight):'';

  // Goal weight from userGoals
  const wtGoal=userGoals.find(g=>g.unit==='kg'&&g.target<g.startVal);
  const goalWeight=wtGoal?wtGoal.target:null;

  let goalHtml='';
  if(goalWeight){
    const remaining=last.weight-goalWeight;
    const pct=Math.max(0,Math.min(100,Math.round((wtGoal.startVal-last.weight)/(wtGoal.startVal-goalWeight)*100)));
    const daysLeft=rate<0?Math.ceil(remaining/Math.abs(rate)):null;
    goalHtml=`
      <div class="wt-goal-row">
        <span style="color:var(--t2);">เป้า ${goalWeight}kg</span>
        <span style="color:${remaining<=0?'var(--green)':'var(--t3)'};">${remaining<=0?'✓ ถึงเป้า':'เหลือ '+remaining.toFixed(1)+'kg'}</span>
      </div>
      <div style="height:5px;background:var(--s3);border-radius:4px;overflow:hidden;margin:5px 0;">
        <div style="height:100%;width:${pct}%;background:var(--lime);border-radius:4px;transition:width .4s;"></div>
      </div>
      ${daysLeft&&daysLeft>0?`<div style="font-size:10px;color:var(--amber);">แนวโน้ม: ถึงเป้าใน ~${daysLeft} วัน</div>`:''}`;
  }

  statsEl.innerHTML=`
    <div class="wt-summary">
      <span>เริ่มต้น: <b>${first.weight}kg</b></span>
      <span>ล่าสุด: <b>${last.weight}kg</b></span>
      <span style="color:${change<0?'var(--green)':'var(--red)'};">${change>0?'+':''}${change.toFixed(1)}kg</span>
    </div>${compHtml}${goalHtml}`;
}

const ROADMAP_PHASES=[
  {id:1,ico:'🔑',name:'Foundation',th:'สร้างพื้นฐาน',color:'var(--blue)',
   desc:'สร้าง routine ที่ทำได้ต่อเนื่อง 14 วัน',
   tips:['ทำ task ให้ได้ ≥70%/วัน','บันทึกอาหารทุกมื้อ','ดื่มน้ำให้ครบ 3000ml']},
  {id:2,ico:'🔥',name:'Lean Out',th:'ลดไขมัน',color:'var(--amber)',
   desc:'Caloric deficit + Protein สูง + Cardio สม่ำเสมอ',
   tips:['อยู่ใน calorie target ทุกวัน','Protein ตามเป้า lean mass','เล่นบาสหรือ cardio 3x/สัปดาห์'],
   wtRange:{from:0,to:0.79}},
  {id:3,ico:'💪',name:'Build',th:'สร้างกล้าม',color:'var(--lime)',
   desc:'Progressive overload + Protein สูง + Recovery ดี',
   tips:['ยิม Upper/Lower สม่ำเสมอ','Protein ตามเป้า lean mass','นอนหลับพักผ่อนให้ครบ 7-8 ชม.'],
   wtRange:{from:0.79,to:1}},
  {id:4,ico:'🏆',name:'Athletic',th:'หุ่น Athletic',color:'var(--green)',
   desc:'Peak performance — ทุกตัวชี้วัดอยู่ในเป้าต่อเนื่อง',
   tips:['Routine ≥80% ทุกวัน','ควบคุมอาหารได้สม่ำเสมอ','ร่างกายแข็งแรง พลังงานเต็ม']},
];

function renderRoadmap(){
  const el=document.getElementById('roadmapContent');
  if(!el) return;

  const hist=JSON.parse(localStorage.getItem('los_hist')||'{}');
  const last14=[],last30=[];
  for(let i=0;i<30;i++){const d=new Date();d.setDate(d.getDate()-i);last30.push(d.toDateString());if(i<14) last14.push(d.toDateString());}
  const taskVals14=last14.map(d=>hist[d]?.task||0).filter(v=>v>0);
  const taskAvg14=taskVals14.length?taskVals14.reduce((a,b)=>a+b)/taskVals14.length:0;
  const taskVals30=last30.map(d=>hist[d]?.task||0).filter(v=>v>0);
  const taskAvg30=taskVals30.length?taskVals30.reduce((a,b)=>a+b)/taskVals30.length:0;
  const protVals30=last30.map(d=>hist[d]?.prot||0).filter(v=>v>0);
  const protAvg30=protVals30.length?protVals30.reduce((a,b)=>a+b)/protVals30.length:0;
  const latestWeight=weightLog.length?[...weightLog].sort((a,b)=>new Date(b.date)-new Date(a.date))[0].weight:null;
  const wtGoal=userGoals.find(g=>g.unit==='kg'&&g.target<(g.startVal||999));
  const weightReached=wtGoal&&latestWeight?latestWeight<=wtGoal.target:false;

  const phaseStatus=[
    taskAvg14>=70,   // Phase 1 done
    weightReached,   // Phase 2 done
    protAvg30>=120,  // Phase 3 done
    taskAvg30>=80,   // Phase 4 done
  ];
  const currentPhase=phaseStatus.findIndex(x=>!x);
  const activeIdx=currentPhase<0?3:currentPhase;

  // Real weight/date range for a phase, from the actual weight goal (start→deadline linear split)
  const wtStartEntry=wtGoal?(wtGoal.updates||[])[0]:null;
  const rangeHtmlFor=(p)=>{
    if(!p.wtRange||!wtGoal||!wtStartEntry||!wtGoal.deadline) return '';
    const wAt=frac=>+(wtGoal.startVal-(wtGoal.startVal-wtGoal.target)*frac).toFixed(1);
    const start=new Date(wtStartEntry.date), end=new Date(wtGoal.deadline);
    if(end<=start) return '';
    const dAt=frac=>new Date(start.getTime()+(end-start)*frac);
    const wFrom=wAt(p.wtRange.from), wTo=wAt(p.wtRange.to);
    const dateTo=dAt(p.wtRange.to).toLocaleDateString('th',{day:'numeric',month:'short',year:'2-digit'});
    return `<div class="roadmap-range">ช่วงนี้: ${wFrom}→${wTo}kg · ถึง ~${dateTo}</div>`;
  };

  el.innerHTML=ROADMAP_PHASES.map((p,i)=>{
    const done=phaseStatus[i];
    const active=i===activeIdx;
    const locked=i>activeIdx;
    return `<div class="roadmap-phase ${active?'active':''} ${done?'done':''} ${locked?'locked':''}">
      <div class="roadmap-hd">
        <span class="roadmap-ico">${done?'✓':p.ico}</span>
        <div class="roadmap-info">
          <div class="roadmap-name">Phase ${p.id}: ${p.th}</div>
          <div class="roadmap-desc">${p.desc}</div>
        </div>
        <span class="roadmap-status" style="color:${done?'var(--green)':active?p.color:'var(--t3)'};">${done?'สำเร็จ':active?'กำลังทำ':'รอก่อน'}</span>
      </div>
      ${active?rangeHtmlFor(p):''}
      ${active?`<div class="roadmap-tips">${p.tips.map(t=>`<div class="roadmap-tip">▸ ${t}</div>`).join('')}</div>`:''}
    </div>`;
  }).join('');
}

function renderMedCard(){
  const el=document.getElementById('medListToday');
  if(!el) return;
  const taken=medTaken[TODAY]||[];
  el.innerHTML=medList.map(m=>`
    <div class="med-row ${taken.includes(m.id)?'taken':''}">
      <span class="med-ico">${m.ico}</span>
      <div class="med-info">
        <span class="med-name">${m.name}</span>
        <span class="med-time">${m.time}</span>
      </div>
      <button class="med-check ${taken.includes(m.id)?'on':''}" onclick="toggleMedTaken('${m.id}')">
        ${taken.includes(m.id)?'✓':'กิน'}
      </button>
    </div>`).join('');
  const doneCount=taken.filter(id=>medList.some(m=>m.id===id)).length;
  const totalEl=document.getElementById('medProgress');
  if(totalEl) totalEl.textContent=`${doneCount}/${medList.length} รายการ`;
}

// ── Sleep helpers ──
function calcSleepHours(bedtime,wakeTime){
  const[bh,bm]=bedtime.split(':').map(Number);
  const[wh,wm]=wakeTime.split(':').map(Number);
  let bedMin=bh*60+bm,wakeMin=wh*60+wm;
  if(wakeMin<=bedMin) wakeMin+=1440;
  return(wakeMin-bedMin)/60;
}

function selectSleepQuality(q,el){
  const qEl=document.getElementById('sleepQualityVal');
  if(qEl) qEl.value=q;
  document.querySelectorAll('.sleep-q-btn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
}

function logSleep(){
  const bed=document.getElementById('sleepBedtime')?.value;
  const wake=document.getElementById('sleepWakeTime')?.value;
  const q=parseInt(document.getElementById('sleepQualityVal')?.value)||3;
  if(!bed||!wake) return;
  sleepLog[TODAY]={bedtime:bed,wakeTime:wake,quality:q};
  saveSleepLog();
  renderHealth();
  const h=calcSleepHours(bed,wake);
  showToast('🌙','บันทึกการนอนแล้ว',`${h.toFixed(1)} ชม. · คุณภาพ ${q}/5`);
}

function deleteSleep(dateStr){
  delete sleepLog[dateStr];
  saveSleepLog();
  renderHealth();
}

function saveSleepLog(){
  localStorage.setItem('los_sleep',JSON.stringify(sleepLog));
  fbSaveHealth(_healthPayload());
}

// ── Health Score ──
function calcHealthScore(){
  // Recovery (Mood): 30 pts
  const moodToday=moodLog[TODAY]||0;
  const recovPts=moodToday?Math.round(moodToday/5*30):0;

  // Exercise: 35 pts
  const todayEx=exerciseLog.filter(e=>e.date===TODAY);
  const exMin=todayEx.reduce((s,e)=>s+(e.duration||0),0);
  const exPts=Math.min(35,Math.round(exMin/90*35));

  // Sleep: 20 pts
  const sl=sleepLog[TODAY];
  let slPts=0;
  if(sl){
    const h=calcSleepHours(sl.bedtime,sl.wakeTime);
    slPts=Math.max(0,Math.min(20,Math.round(20-Math.abs(h-7.5)*2.5+(sl.quality-3))));
  }

  // Meds: 15 pts (full if no meds)
  let medPts=15;
  if(medList.length){
    const taken=(medTaken[TODAY]||[]).filter(id=>medList.some(m=>m.id===id)).length;
    medPts=Math.round(taken/medList.length*15);
  }

  return{total:recovPts+exPts+slPts+medPts,recovPts,exPts,slPts,medPts,exMin,moodToday,sl};
}

function renderHealthScore(){
  const s=calcHealthScore();
  const CIRC=175.9;

  const scoreEl=document.getElementById('healthScore');
  const gradeEl=document.getElementById('healthGrade');
  if(!scoreEl) return;

  let grade,clr;
  if(s.total>=80){grade='ดีมาก';clr='var(--green)';}
  else if(s.total>=60){grade='โอเค';clr='var(--teal)';}
  else if(s.total>=40){grade='พอใช้';clr='var(--amber)';}
  else{grade='ต้องปรับ';clr='var(--red)';}

  scoreEl.textContent=s.total;
  scoreEl.style.color=clr;
  if(gradeEl){gradeEl.textContent=grade;gradeEl.style.color=clr;}

  // Recovery ring
  const rRing=document.getElementById('scoreRingRecovery');
  if(rRing) rRing.style.strokeDashoffset=(CIRC*(1-s.recovPts/30)).toFixed(1);
  const rSub=document.getElementById('recoverySub');
  if(rSub) rSub.textContent=s.moodToday?MOOD_EMOJI[s.moodToday]:'—';

  // Exercise ring
  const eRing=document.getElementById('scoreRingExercise');
  if(eRing) eRing.style.strokeDashoffset=(CIRC*(1-s.exPts/35)).toFixed(1);
  const eSub=document.getElementById('exerciseSub');
  if(eSub) eSub.textContent=s.exMin?s.exMin+'m':'—';

  // Sleep ring
  const slRing=document.getElementById('scoreRingSleep');
  if(slRing) slRing.style.strokeDashoffset=(CIRC*(1-s.slPts/20)).toFixed(1);
  const slSub=document.getElementById('sleepSub');
  if(slSub){
    if(s.sl){const h=calcSleepHours(s.sl.bedtime,s.sl.wakeTime);slSub.textContent=h.toFixed(1)+'h';}
    else slSub.textContent='—';
  }
}

// ── Health Metric Tiles ──
function renderHealthTiles(){
  const _el=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};

  // Weight
  const latest=weightLog.length?[...weightLog].sort((a,b)=>new Date(b.date)-new Date(a.date))[0]:null;
  _el('tileWeightVal',latest?latest.weight+'kg':'—');
  if(latest){
    const sorted=[...weightLog].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const recent=sorted.slice(-7);
    if(recent.length>=2){
      const chg=recent[recent.length-1].weight-recent[0].weight;
      _el('tileWeightSub',(chg>=0?'+':'')+chg.toFixed(1)+'kg/wk');
    } else {
      _el('tileWeightSub',new Date(latest.date).toLocaleDateString('th',{day:'numeric',month:'short'}));
    }
  } else _el('tileWeightSub','ยังไม่บันทึก');

  // Body fat
  const sortedW=[...weightLog].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const latestFat=sortedW.find(x=>x.fat);
  _el('tileFatVal',latestFat?latestFat.fat+'%':'—');
  const latestMus=sortedW.find(x=>x.muscle);
  _el('tileFatSub',latestMus?'กล้าม '+latestMus.muscle+'%':'% body fat');

  // Exercise
  const todayEx=exerciseLog.filter(e=>e.date===TODAY);
  const exMin=todayEx.reduce((s,e)=>s+(e.duration||0),0);
  const exCal=todayEx.reduce((s,e)=>s+(e.caloriesBurned||0),0);
  _el('tileExerciseVal',exMin?exMin+'m':'—');
  _el('tileExerciseSub',exCal?'-'+exCal+' kcal':'วันนี้');

  // Sleep
  const sl=sleepLog[TODAY];
  if(sl){
    const h=calcSleepHours(sl.bedtime,sl.wakeTime);
    _el('tileSleepVal',h.toFixed(1)+'h');
    _el('tileSleepSub','★'+sl.quality+'/5 คุณภาพ');
  } else {
    _el('tileSleepVal','—');
    _el('tileSleepSub','ยังไม่บันทึก');
  }

  // Meds
  if(medList.length){
    const taken=(medTaken[TODAY]||[]).filter(id=>medList.some(m=>m.id===id)).length;
    _el('tileMedsVal',taken+'/'+medList.length);
    _el('tileMedsSub',taken===medList.length?'ครบแล้ว ✓':'ยังไม่ครบ');
    const mv=document.getElementById('tileMedsVal');
    if(mv) mv.style.color=taken===medList.length?'var(--green)':'var(--purple)';
  } else {
    _el('tileMedsVal','—');_el('tileMedsSub','ไม่มียา');
  }

  // Mood
  const mood=moodLog[TODAY]||0;
  _el('tileMoodVal',mood?MOOD_EMOJI[mood]:'—');
  _el('tileMoodSub',mood?MOOD_LBL[mood]:'วันนี้');
}

// ── Sleep Card ──
function renderSleepCard(){
  const todayEl=document.getElementById('sleepTodayDisplay');
  const sl=sleepLog[TODAY];

  if(todayEl){
    if(sl){
      const h=calcSleepHours(sl.bedtime,sl.wakeTime);
      todayEl.textContent=h.toFixed(1)+'h · ★'+sl.quality;
      const bedEl=document.getElementById('sleepBedtime');
      const wakeEl=document.getElementById('sleepWakeTime');
      if(bedEl) bedEl.value=sl.bedtime;
      if(wakeEl) wakeEl.value=sl.wakeTime;
      document.querySelectorAll('.sleep-q-btn').forEach((b,i)=>b.classList.toggle('on',i+1===sl.quality));
      const qEl=document.getElementById('sleepQualityVal');
      if(qEl) qEl.value=sl.quality;
    } else {
      todayEl.textContent='—';
    }
  }

  const listEl=document.getElementById('sleepLogList');
  if(!listEl) return;

  const hist=[];
  for(let i=1;i<=10;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=d.toDateString();
    if(sleepLog[ds]) hist.push({dateStr:ds,...sleepLog[ds]});
    if(hist.length>=5) break;
  }

  if(!hist.length){
    listEl.innerHTML='<div style="font-size:11px;color:var(--t3);text-align:center;padding:8px 0;">ยังไม่มีประวัติการนอน — บันทึกทุกวันเพื่อดูแนวโน้ม</div>';
    return;
  }

  listEl.innerHTML=hist.map(s=>{
    const h=calcSleepHours(s.bedtime,s.wakeTime);
    const d=new Date(s.dateStr);
    const hClr=h>=7&&h<=9?'var(--blue)':h>=6?'var(--amber)':'var(--red)';
    return`<div class="sleep-log-item">
      <span style="font-size:11px;color:var(--t3);min-width:26px;">${DAY_TH[d.getDay()].substring(0,2)}</span>
      <span class="sleep-log-hours" style="color:${hClr};">${h.toFixed(1)}h</span>
      <span class="sleep-log-time">${s.bedtime} → ${s.wakeTime}</span>
      <span class="sleep-log-quality">★${s.quality}/5</span>
      <button class="fi-del" onclick="deleteSleep('${s.dateStr}')">✕</button>
    </div>`;
  }).join('');
}

// ── Weight Prediction ──
function renderWeightPrediction(){
  const el=document.getElementById('wtPredictSection');
  if(!el) return;

  if(weightLog.length<2){
    el.innerHTML='<div style="font-size:11px;color:var(--t3);text-align:center;padding:12px 0;line-height:1.8;">บันทึกน้ำหนักอย่างน้อย 2 วัน<br>เพื่อดูการทำนายและแนวโน้ม</div>';
    return;
  }

  const sorted=[...weightLog].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const latest=sorted[sorted.length-1];
  const w=latest.weight;

  // Trend from last 14 days (or all data if less)
  const recent=sorted.filter(x=>(new Date()-new Date(x.date))<=14*86400000);
  const td=recent.length>=2?recent:sorted;
  const tDays=Math.max(1,(new Date(td[td.length-1].date)-new Date(td[0].date))/86400000);
  const dailyChg=(td[td.length-1].weight-td[0].weight)/tDays;
  const weekChg=dailyChg*7;

  // BMR Mifflin-St Jeor: Male, 173cm, 29yr → BMR = 10w + 6.25*173 - 5*29 + 5 = 10w + 941.25
  const BMR=Math.round(10*w+941.25);
  const TDEE=Math.round(BMR*1.55);

  // Avg calories last 7 days
  const hist=JSON.parse(localStorage.getItem('los_hist')||'{}');
  const calDays=[];
  for(let i=1;i<=7;i++){const d=new Date();d.setDate(d.getDate()-i);const c=hist[d.toDateString()]?.cal;if(c>0)calDays.push(c);}
  const avgCal=calDays.length?Math.round(calDays.reduce((a,b)=>a+b)/calDays.length):0;

  // Goal
  const goals=typeof userGoals!=='undefined'?userGoals:[];
  const wtGoal=goals.find(g=>g.unit==='kg'&&g.target<(g.startVal||999));
  const goalW=wtGoal?wtGoal.target:null;
  const remaining=goalW?w-goalW:null;
  const daysToGoal=goalW&&Math.abs(dailyChg)>0.001&&remaining>0&&dailyChg<0
    ?Math.ceil(remaining/Math.abs(dailyChg)):null;

  const chgClr=weekChg<=0?'var(--green)':'var(--red)';

  el.innerHTML=`
    <div class="h-predict-grid">
      <div class="h-predict-item">
        <div class="h-predict-val" style="color:var(--lime);">${w}kg</div>
        <div class="h-predict-lbl">น้ำหนักล่าสุด</div>
      </div>
      <div class="h-predict-item">
        <div class="h-predict-val" style="color:${chgClr};">${weekChg>=0?'+':''}${weekChg.toFixed(2)}kg</div>
        <div class="h-predict-lbl">แนวโน้ม/สัปดาห์</div>
      </div>
      ${goalW?`
      <div class="h-predict-item">
        <div class="h-predict-val" style="color:var(--orange);">${goalW}kg</div>
        <div class="h-predict-lbl">เป้าหมาย</div>
      </div>
      <div class="h-predict-item">
        <div class="h-predict-val" style="color:${daysToGoal&&daysToGoal<365?'var(--teal)':'var(--t3)'};">${daysToGoal&&daysToGoal<365?daysToGoal+'d':'—'}</div>
        <div class="h-predict-lbl">ถึงเป้าใน</div>
      </div>`:`
      <div class="h-predict-item" style="grid-column:1/-1;">
        <div class="h-predict-val" style="color:var(--t2);">${(w+dailyChg*30).toFixed(1)}kg</div>
        <div class="h-predict-lbl">ทำนาย 30 วัน</div>
      </div>`}
    </div>
    <div class="h-predict-cal-row">
      <span style="color:var(--t3);font-size:10px;">BMR ${BMR} · TDEE ~${TDEE} kcal${avgCal?' · กินเฉลี่ย '+avgCal+' kcal':''}</span>
      ${avgCal?`<span style="color:${avgCal<TDEE?'var(--green)':'var(--amber)'};font-size:10px;">${avgCal<TDEE?'Deficit':'Surplus'} ~${Math.abs(TDEE-avgCal)} kcal → ${(Math.abs(TDEE-avgCal)/7700*30).toFixed(1)}kg/เดือน</span>`:'<span style="color:var(--t3);font-size:10px;">บันทึกอาหารทุกวันเพื่อดูการทำนาย</span>'}
    </div>`;
}

// ── Budget ──
function renderBudgetSection(){
  const el=document.getElementById('budgetSection');
  if(!el) return;
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const monthTx=financeLog.filter(t=>t.type==='out'&&new Date(t.date)>=monthStart);
  const catSpend={};
  monthTx.forEach(t=>{catSpend[t.cat]=(catSpend[t.cat]||0)+t.amount;});

  const cats=Object.keys(budgetCaps);
  if(!cats.length){el.innerHTML='';return;}

  el.innerHTML=`<div class="budget-grid">${cats.map(cat=>{
    const spent=catSpend[cat]||0;
    const cap=budgetCaps[cat]||0;
    const pct=cap?Math.min(100,Math.round(spent/cap*100)):0;
    const over=spent>cap;
    const warn=pct>=80&&!over;
    return `<div class="budget-row">
      <div class="budget-cat-row">
        <span class="budget-cat">${cat}</span>
        <span class="budget-nums" style="color:${over?'var(--red)':warn?'var(--amber)':'var(--t2)'};">${spent.toLocaleString('th')} / ${cap.toLocaleString('th')}฿</span>
      </div>
      <div class="bud-bar-bg"><div class="bud-bar-fill" style="width:${pct}%;background:${over?'var(--red)':warn?'var(--amber)':'var(--lime)'};"></div></div>
    </div>`;
  }).join('')}</div>`;
}

function openBudgetModal(){
  const el=document.getElementById('budgetForm');
  if(!el) return;
  const cats=Object.keys(budgetCaps).length?budgetCaps:DEFAULT_BUDGET;
  el.innerHTML=Object.entries(cats).map(([cat,cap])=>`
    <div class="budget-edit-row">
      <span style="font-size:12px;flex:1;">${cat}</span>
      <input type="number" class="food-inp" style="width:80px;padding:6px 8px;font-size:12px;font-family:var(--mono);"
        value="${cap}" onchange="budgetCaps['${cat}']=parseInt(this.value)||0;saveBudget();">
      <span style="font-size:11px;color:var(--t3);">฿</span>
      <button class="fi-del" onclick="removeBudgetCat('${cat}')">✕</button>
    </div>`).join('');
  document.getElementById('budgetModal').classList.add('on');
}
function closeBudgetModal(){saveBudget();renderBudgetSection();document.getElementById('budgetModal').classList.remove('on');}

// ── Weekly Review ──
function buildWeeklyReview(hist, passedDates){
  const el=document.getElementById('weeklyReview');
  if(!el) return;
  // Use passed dates, or default to last 7 days
  const dates=passedDates&&passedDates.length?passedDates:(()=>{
    const d=[];for(let i=6;i>=0;i--){const x=new Date();x.setDate(x.getDate()-i);d.push(x.toDateString());}return d;
  })();

  const taskVals=dates.map(d=>hist[d]?.task||0);
  const calVals=dates.map(d=>hist[d]?.cal||0);
  const protVals=dates.map(d=>hist[d]?.prot||0);
  const moodVals=dates.map(d=>moodLog[d]||0);
  const sleepHrs=dates.map(d=>{const sl=sleepLog[d];return sl?calcSleepHours(sl.bedtime,sl.wakeTime):0;});
  const exMins=dates.map(d=>exerciseLog.filter(e=>e.date===d).reduce((s,e)=>s+(e.duration||0),0));

  const nz=arr=>arr.filter(v=>v>0);
  const mean=arr=>nz(arr).length?nz(arr).reduce((a,b)=>a+b,0)/nz(arr).length:0;

  const avgTask=mean(taskVals);
  const avgProt=mean(protVals);
  const avgMood=mean(moodVals);
  const avgSleep=mean(sleepHrs);
  const avgEx=mean(exMins);
  const daysLogged=calVals.filter(v=>v>0).length;

  // Build Oura-style insight cards
  const insights=[];

  // Routine
  if(avgTask>=80) insights.push({c:'green',h:'Routine ดีมาก',b:`เฉลี่ย ${Math.round(avgTask)}% — ยอดเยี่ยม`});
  else if(avgTask>=60) insights.push({c:'yellow',h:'Routine ได้ดี',b:`เฉลี่ย ${Math.round(avgTask)}% — เพิ่มได้อีก`});
  else if(avgTask>0) insights.push({c:'red',h:'Routine ต่ำกว่าเป้า',b:`เฉลี่ย ${Math.round(avgTask)}% — ลอง skip แทน miss`});

  // Protein
  if(avgProt>=120) insights.push({c:'green',h:'โปรตีนครบเป้า',b:`เฉลี่ย ${Math.round(avgProt)}g/วัน`});
  else if(avgProt>0) insights.push({c:'red',h:'โปรตีนต่ำกว่าเป้า',b:`เฉลี่ย ${Math.round(avgProt)}g (เป้า 120g)`});

  // Sleep
  if(avgSleep>=7) insights.push({c:'green',h:'นอนหลับดี',b:`เฉลี่ย ${avgSleep.toFixed(1)}h/คืน`});
  else if(avgSleep>=6) insights.push({c:'yellow',h:'นอนนิดน้อย',b:`เฉลี่ย ${avgSleep.toFixed(1)}h (เป้า 7–9h)`});
  else if(avgSleep>0) insights.push({c:'red',h:'พักผ่อนไม่เพียงพอ',b:`เฉลี่ย ${avgSleep.toFixed(1)}h — ลองนอนเร็วขึ้น`});

  // Exercise
  if(avgEx>=45) insights.push({c:'green',h:'ออกกำลังกายสม่ำเสมอ',b:`เฉลี่ย ${Math.round(avgEx)}m/วัน`});
  else if(avgEx>0) insights.push({c:'yellow',h:'ออกกำลังกายน้อย',b:`เฉลี่ย ${Math.round(avgEx)}m/วัน (เป้า 45m)`});

  // Mood
  if(avgMood>=4) insights.push({c:'green',h:'พลังงานดี',b:`${MOOD_LBL[Math.round(avgMood)]} · เฉลี่ย ${avgMood.toFixed(1)}/5`});
  else if(avgMood>0&&avgMood<3) insights.push({c:'yellow',h:'พลังงานต่ำ',b:`${MOOD_LBL[Math.round(avgMood)]} · เฉลี่ย ${avgMood.toFixed(1)}/5`});

  // Food logging
  if(!daysLogged) insights.push({c:'yellow',h:'ยังไม่บันทึกอาหาร',b:`เริ่มบันทึกทุกวันเพื่อดู insight`});
  else if(daysLogged<dates.length*0.5) insights.push({c:'yellow',h:'บันทึกอาหารไม่สม่ำเสมอ',b:`บันทึก ${daysLogged}/${dates.length} วัน`});

  if(!insights.length) insights.push({c:'yellow',h:'เริ่มบันทึกข้อมูล',b:'ใช้แอปครบ 7 วันเพื่อดูสรุป'});

  const cmap={
    green:{bg:'rgba(74,222,128,0.08)',bd:'rgba(74,222,128,0.25)',dot:'var(--green)'},
    yellow:{bg:'rgba(240,160,32,0.08)',bd:'rgba(240,160,32,0.25)',dot:'var(--amber)'},
    red:{bg:'rgba(240,80,80,0.08)',bd:'rgba(240,80,80,0.25)',dot:'var(--red)'}
  };

  el.innerHTML=`<div class="rpt-insights-wrap">
    <div class="rpt-insights-hdr">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--amber);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Insights</span>
    </div>
    <div class="rpt-insights-list">
      ${insights.slice(0,5).map(ins=>{const c=cmap[ins.c];return `<div class="rpt-insight-card" style="background:${c.bg};border-color:${c.bd};"><div class="rpt-ins-dot" style="background:${c.dot};"></div><div class="rpt-ins-body"><div class="rpt-ins-h">${ins.h}</div><div class="rpt-ins-b">${ins.b}</div></div></div>`;}).join('')}
    </div>
  </div>`;
}

// ── Check notifications for meds ──
function checkMedNotifs(){
  if(!('Notification' in window)||Notification.permission!=='granted') return;
  const now=new Date();
  const hm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  medList.forEach(m=>{
    const key=`med_${m.id}_${hm}`;
    if(m.time===hm&&!notifSentToday.has(key)){
      const taken=(medTaken[TODAY]||[]).includes(m.id);
      if(!taken){
        notifSentToday.add(key);
        new Notification(`${m.ico} ถึงเวลา${m.name}`,{body:'กด "กิน" ใน HEALTH เพื่อบันทึก',icon:'icons/icon-192.png'});
      }
    }
  });
}

// ============ NAV ============
window.showPg=function(name){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nbtn').forEach(b=>b.classList.remove('on'));
  document.getElementById('pg-'+name)?.classList.add('on');
  const idx={today:0,food:1,money:2,health:3,report:4};
  document.querySelectorAll('.nbtn')[idx[name]]?.classList.add('on');
  if(name==='report') setTimeout(buildReport,50);
  if(name==='food'){updateCalTarget(new Date().getDay());renderFood();buildWater();updateRecentList();}
  if(name==='money'){ renderMoney(); _fbPullMeta('money'); }
  if(name==='health'){ renderHealth(); renderExerciseLog(); _fbPullMeta('health'); }
  if(name==='report'){ _fbPullMeta('health'); _fbPullMeta('money'); }
};

// ═══════════════════════════════════════
// NEW FEATURES
// ═══════════════════════════════════════

// ── Toast notifications ──────────────────
function showToast(ico, title, body, duration){
  const c=document.getElementById('toastContainer');
  if(!c) return;
  const t=document.createElement('div');
  t.className='toast';
  t.innerHTML=`<span class="toast-ico">${ico}</span><div class="toast-info"><div class="toast-title">${title}</div>${body?`<div class="toast-body">${body}</div>`:''}</div><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  c.appendChild(t);
  setTimeout(()=>t.remove(),(duration||3500));
}

// ── Meal selector ────────────────────────
function selectMeal(meal, el){
  currentMeal=meal;
  document.querySelectorAll('.meal-tab').forEach(b=>b.classList.remove('on'));
  if(el) el.classList.add('on');
  // Sync diary section highlight
  document.querySelectorAll('.fd-section').forEach(s=>s.classList.remove('active'));
  document.getElementById('fds-'+meal)?.classList.add('active');
}

function selectMealFocus(meal){
  currentMeal=meal;
  document.querySelectorAll('.meal-tab').forEach(b=>b.classList.remove('on'));
  document.getElementById('mt_'+meal)?.classList.add('on');
  document.querySelectorAll('.fd-section').forEach(s=>s.classList.remove('active'));
  document.getElementById('fds-'+meal)?.classList.add('active');
  const inp=document.getElementById('foodInp');
  if(inp){inp.focus();inp.scrollIntoView({behavior:'smooth',block:'center'});}
}

// ── Low Carb toggle ──────────────────────
function toggleLowCarb(){
  lowCarbMode=document.getElementById('lowCarbToggle')?.checked||false;
  localStorage.setItem('los_lowcarb',JSON.stringify(lowCarbMode));
  renderFood();
  showToast('🥑','Low Carb Mode',lowCarbMode?'เปิดแล้ว — แป้งเป้าหมาย ≤50g':'ปิดแล้ว');
}

// ── IF (Intermittent Fasting) tracker ────
function openIfSettings(){
  const m=document.getElementById('ifModal');
  if(!m) return;
  document.getElementById('ifEnabled').checked=ifSettings.enabled;
  document.getElementById('ifStart').value=ifSettings.start;
  document.getElementById('ifEnd').value=ifSettings.end;
  m.classList.add('on');
}
function closeIfSettings(){
  document.getElementById('ifModal')?.classList.remove('on');
}
function saveIfSettings(){
  ifSettings.enabled=document.getElementById('ifEnabled')?.checked||false;
  ifSettings.start=document.getElementById('ifStart')?.value||'12:00';
  ifSettings.end=document.getElementById('ifEnd')?.value||'20:00';
  localStorage.setItem('los_if',JSON.stringify(ifSettings));
  updateIfDisplay();
}
function initIFTimer(){
  updateIfDisplay();
  if(ifTimerIv) clearInterval(ifTimerIv);
  ifTimerIv=setInterval(updateIfDisplay,60000);
}
function updateIfDisplay(){
  const bar=document.getElementById('ifBar');
  if(!bar) return;
  if(!ifSettings.enabled){bar.style.display='none';return;}
  bar.style.display='flex';
  const now=new Date();
  const cur=now.getHours()*60+now.getMinutes();
  const [sh,sm]=ifSettings.start.split(':').map(Number);
  const [eh,em]=ifSettings.end.split(':').map(Number);
  const startMin=sh*60+sm, endMin=eh*60+em;
  const inWindow=cur>=startMin&&cur<endMin;
  const label=document.getElementById('ifLabel');
  const countdown=document.getElementById('ifCountdown');
  const icon=document.getElementById('ifIcon');
  bar.className='if-bar'+(inWindow?' eating':' fasting');
  if(inWindow){
    const remain=endMin-cur;
    icon.textContent='🟢';
    label.textContent='หน้าต่างกินอาหารเปิดอยู่ — หยุดกินใน';
    countdown.textContent=`${Math.floor(remain/60)}:${String(remain%60).padStart(2,'0')}`;
  } else {
    const next=cur<startMin?startMin-cur:(1440-cur+startMin);
    icon.textContent='⏳';
    label.textContent='กำลัง Fast — เริ่มกินได้ใน';
    countdown.textContent=`${Math.floor(next/60)}:${String(next%60).padStart(2,'0')}`;
  }
}

// ── Exercise Logging ─────────────────────
const EX_CAL_RATES={gym:5,basketball:7,cardio:8,other:5}; // kcal/min estimate

function openExerciseModal(){
  currentExType='gym';
  document.querySelectorAll('.ex-type-btn').forEach((b,i)=>b.classList.toggle('on',i===0));
  document.getElementById('exNotes').value='';
  document.getElementById('exDuration').value='';
  document.getElementById('exCalPreview').textContent='';
  document.getElementById('exerciseModal').classList.add('on');
}
function closeExerciseModal(){document.getElementById('exerciseModal')?.classList.remove('on');}

function selectExType(type, el){
  currentExType=type;
  document.querySelectorAll('.ex-type-btn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  updateExCalPreview();
}
function updateExCalPreview(){
  const dur=parseInt(document.getElementById('exDuration')?.value)||0;
  const el=document.getElementById('exCalPreview');
  if(!el) return;
  if(!dur){el.textContent='';return;}
  const est=Math.round(dur*(EX_CAL_RATES[currentExType]||5));
  el.textContent=`ประมาณ ${est} kcal (${dur} นาที)`;
}
function submitExercise(){
  const dur=parseInt(document.getElementById('exDuration')?.value)||0;
  const notes=document.getElementById('exNotes')?.value.trim()||'';
  if(!dur&&!notes){closeExerciseModal();return;}
  const cal=Math.round(dur*(EX_CAL_RATES[currentExType]||5));
  const typeLabels={gym:'🏋️ ยิม',basketball:'🏀 บาส',cardio:'🏃 คาร์ดิโอ',other:'⚡ อื่นๆ'};
  exerciseLog.push({
    id:'ex'+Date.now(),date:TODAY,
    type:currentExType,typeName:typeLabels[currentExType],
    notes,duration:dur,caloriesBurned:cal
  });
  localStorage.setItem('los_exercise',JSON.stringify(exerciseLog));
  closeExerciseModal();
  renderExerciseLog();
  renderFood();
  showToast('🏃','บันทึกแล้ว!',`${typeLabels[currentExType]} ${dur} นาที — เผา ${cal} kcal`);
  if(!hasEarnedToday('exercise')) earnCoins(1500,'exercise','ออกกำลังกายวันนี้','🏃');
}
function renderExerciseLog(){
  const el=document.getElementById('exerciseLogToday');
  const calEl=document.getElementById('exerciseCalToday');
  if(!el) return;
  const todayEx=exerciseLog.filter(e=>e.date===TODAY);
  if(!todayEx.length){
    el.innerHTML='<div style="font-size:12px;color:var(--t3);padding:6px 0;">ยังไม่บันทึกการออกกำลังกายวันนี้</div>';
    if(calEl) calEl.textContent='';
    return;
  }
  el.innerHTML=todayEx.map(e=>`<div class="exercise-card">
    <div class="ex-log-row">
      <span class="ex-log-ico">${e.typeName?.split(' ')[0]||'🏃'}</span>
      <div class="ex-log-info">
        <div class="ex-log-name">${e.notes||e.typeName||''}</div>
        <div class="ex-log-meta">${e.duration?e.duration+' นาที':''}</div>
      </div>
      <span class="ex-log-cal">−${e.caloriesBurned} kcal</span>
      <button class="fi-del" onclick="deleteExercise('${e.id}')">✕</button>
    </div>
  </div>`).join('');
  const total=todayEx.reduce((s,e)=>s+(e.caloriesBurned||0),0);
  if(calEl) calEl.textContent=`รวมเผา ${total} kcal วันนี้`;
}
function deleteExercise(id){
  exerciseLog=exerciseLog.filter(e=>e.id!==id);
  localStorage.setItem('los_exercise',JSON.stringify(exerciseLog));
  renderExerciseLog();
  renderFood();
}

// ── My Foods ─────────────────────────────
function openMyFoodsModal(){
  renderMyFoodsList();
  document.getElementById('myFoodsModal')?.classList.add('on');
}
function closeMyFoodsModal(){document.getElementById('myFoodsModal')?.classList.remove('on');}
function addCustomFood(){
  const name=document.getElementById('mf_name')?.value.trim();
  const cal=parseInt(document.getElementById('mf_cal')?.value)||0;
  const p=parseInt(document.getElementById('mf_p')?.value)||0;
  const c=parseInt(document.getElementById('mf_c')?.value)||0;
  const f=parseInt(document.getElementById('mf_f')?.value)||0;
  const u=document.getElementById('mf_unit')?.value.trim()||'ที่';
  if(!name) return;
  customFoods.push({id:'cf'+Date.now(),name,cal,p,c,f,u});
  FDB[name]={cal,p,c,f,u};
  localStorage.setItem('los_custom_foods',JSON.stringify(customFoods));
  ['mf_name','mf_cal','mf_p','mf_c','mf_f','mf_unit'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  renderMyFoodsList();
  showToast('🥗','เพิ่มอาหารแล้ว',name);
}
function deleteCustomFood(id){
  customFoods=customFoods.filter(f=>f.id!==id);
  localStorage.setItem('los_custom_foods',JSON.stringify(customFoods));
  renderMyFoodsList();
}
function renderMyFoodsList(){
  const el=document.getElementById('myFoodsList');
  if(!el) return;
  if(!customFoods.length){el.innerHTML='<div class="empty-food" style="padding:12px 0;">ยังไม่มีอาหาร</div>';return;}
  el.innerHTML=customFoods.map(f=>`<div class="custom-food-row">
    <div class="cf-info">
      <div class="cf-name">${f.name}</div>
      <div class="cf-macro">${f.cal} kcal · P${f.p}g · C${f.c}g · F${f.f}g / ${f.u}</div>
    </div>
    <button class="cf-add" onclick="quickAdd('${f.name}',1);closeMyFoodsModal();">+</button>
    <button class="fi-del" onclick="deleteCustomFood('${f.id}')">✕</button>
  </div>`).join('');
}

// ── My Meals ─────────────────────────────
function openMyMealsModal(){
  mealIngredientsList=[];
  renderMyMealsList();
  document.getElementById('myMealsModal')?.classList.add('on');
  document.getElementById('meal_name').value='';
  document.getElementById('meal_food_inp').value='';
  document.getElementById('mealIngredients').innerHTML='';
}
function closeMyMealsModal(){
  document.getElementById('myMealsModal')?.classList.remove('on');
  document.getElementById('mealFoodSuggest')?.classList.remove('on');
}
function onMealFoodInput(val){
  const el=document.getElementById('mealFoodSuggest');
  if(!val.trim()){el.classList.remove('on');return;}
  const res=searchFDB(val.trim());
  if(!res.length){el.classList.remove('on');return;}
  el.innerHTML=res.map(r=>`<div class="suggest-item" onclick="addToMealIngredient('${r.key}')">
    <div class="si-info"><div class="si-name">${r.key}</div><div class="si-macro">${r.cal} kcal · P${r.p}g</div></div>
  </div>`).join('');
  el.classList.add('on');
}
function addToMealIngredient(key){
  const d=FDB[key];
  if(!d) return;
  mealIngredientsList.push({key,cal:d.cal,p:d.p,c:d.c,f:d.f,u:d.u});
  document.getElementById('meal_food_inp').value='';
  document.getElementById('mealFoodSuggest').classList.remove('on');
  const el=document.getElementById('mealIngredients');
  el.innerHTML=mealIngredientsList.map((item,i)=>`<div style="font-size:11px;color:var(--t2);padding:2px 0;display:flex;justify-content:space-between;">
    <span>${item.key}</span><button class="fi-del" style="width:18px;height:18px;font-size:9px;" onclick="removeMealIngredient(${i})">✕</button>
  </div>`).join('');
}
function removeMealIngredient(i){
  mealIngredientsList.splice(i,1);
  addToMealIngredient && document.getElementById('mealIngredients') && (()=>{
    document.getElementById('mealIngredients').innerHTML=mealIngredientsList.map((item,j)=>`<div style="font-size:11px;color:var(--t2);padding:2px 0;display:flex;justify-content:space-between;">
      <span>${item.key}</span><button class="fi-del" style="width:18px;height:18px;font-size:9px;" onclick="removeMealIngredient(${j})">✕</button>
    </div>`).join('');
  })();
}
function saveCustomMeal(){
  const name=document.getElementById('meal_name')?.value.trim();
  if(!name||!mealIngredientsList.length) return;
  customMeals.push({id:'cm'+Date.now(),name,foods:[...mealIngredientsList]});
  localStorage.setItem('los_custom_meals',JSON.stringify(customMeals));
  mealIngredientsList=[];
  closeMyMealsModal();
  showToast('🍱','บันทึกมื้อแล้ว',name);
}
function addCustomMealToLog(id){
  const meal=customMeals.find(m=>m.id===id);
  if(!meal) return;
  meal.foods.forEach(f=>{
    foodLog.push({name:`${f.key} (${f.u})`,cal:f.cal,p:f.p,c:f.c,f:f.f,meal:currentMeal});
  });
  saveFoodState();renderFood();
  closeMyMealsModal();
  showToast('🍱','เพิ่มมื้ออาหารแล้ว',meal.name);
}
function deleteCustomMeal(id){
  customMeals=customMeals.filter(m=>m.id!==id);
  localStorage.setItem('los_custom_meals',JSON.stringify(customMeals));
  renderMyMealsList();
}
function renderMyMealsList(){
  const el=document.getElementById('myMealsList');
  if(!el) return;
  if(!customMeals.length){el.innerHTML='<div class="empty-food" style="padding:12px 0;">ยังไม่มีมื้ออาหาร</div>';return;}
  el.innerHTML=customMeals.map(m=>{
    const total=m.foods.reduce((s,f)=>s+f.cal,0);
    return `<div class="custom-food-row">
      <div class="cf-info">
        <div class="cf-name">${m.name}</div>
        <div class="cf-macro">${total} kcal · ${m.foods.length} รายการ</div>
      </div>
      <button class="cf-add" onclick="addCustomMealToLog('${m.id}')">+</button>
      <button class="fi-del" onclick="deleteCustomMeal('${m.id}')">✕</button>
    </div>`;
  }).join('');
}

// ── My Recipes ────────────────────────────
function openMyRecipesModal(){
  recipeIngredientsList=[];
  renderMyRecipesList();
  document.getElementById('myRecipesModal')?.classList.add('on');
  document.getElementById('recipe_name').value='';
  document.getElementById('recipe_servings').value='1';
  document.getElementById('recipeIngredients').innerHTML='';
}
function closeMyRecipesModal(){document.getElementById('myRecipesModal')?.classList.remove('on');}
function addRecipeIngredient(){
  const name=document.getElementById('ri_name')?.value.trim();
  const cal=parseInt(document.getElementById('ri_cal')?.value)||0;
  const p=parseInt(document.getElementById('ri_p')?.value)||0;
  const c=parseInt(document.getElementById('ri_c')?.value)||0;
  const f=parseInt(document.getElementById('ri_f')?.value)||0;
  if(!name) return;
  recipeIngredientsList.push({name,cal,p,c,f});
  ['ri_name','ri_cal','ri_p','ri_c','ri_f'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const el=document.getElementById('recipeIngredients');
  el.innerHTML=recipeIngredientsList.map((item,i)=>`<div style="font-size:11px;color:var(--t2);padding:2px 0;display:flex;justify-content:space-between;">
    <span>${item.name} (${item.cal}kcal)</span>
    <button class="fi-del" style="width:18px;height:18px;font-size:9px;" onclick="recipeIngredientsList.splice(${i},1);addRecipeIngredient()&&0">✕</button>
  </div>`).join('');
}
function saveCustomRecipe(){
  const name=document.getElementById('recipe_name')?.value.trim();
  const servings=parseInt(document.getElementById('recipe_servings')?.value)||1;
  if(!name||!recipeIngredientsList.length) return;
  const total={cal:0,p:0,c:0,f:0};
  recipeIngredientsList.forEach(i=>{total.cal+=i.cal;total.p+=i.p;total.c+=i.c;total.f+=i.f;});
  const perServing={cal:Math.round(total.cal/servings),p:Math.round(total.p/servings),c:Math.round(total.c/servings),f:Math.round(total.f/servings)};
  customRecipes.push({id:'rc'+Date.now(),name,servings,perServing,ingredients:[...recipeIngredientsList]});
  localStorage.setItem('los_custom_recipes',JSON.stringify(customRecipes));
  FDB[name]={...perServing,u:'serving'};
  recipeIngredientsList=[];
  closeMyRecipesModal();
  showToast('📖','บันทึกสูตรแล้ว',`${name} — ${perServing.cal} kcal/serving`);
}
function deleteCustomRecipe(id){
  customRecipes=customRecipes.filter(r=>r.id!==id);
  localStorage.setItem('los_custom_recipes',JSON.stringify(customRecipes));
  renderMyRecipesList();
}
function renderMyRecipesList(){
  const el=document.getElementById('myRecipesList');
  if(!el) return;
  if(!customRecipes.length){el.innerHTML='<div class="empty-food" style="padding:12px 0;">ยังไม่มีสูตรอาหาร</div>';return;}
  el.innerHTML=customRecipes.map(r=>`<div class="custom-food-row">
    <div class="cf-info">
      <div class="cf-name">${r.name}</div>
      <div class="cf-macro">${r.perServing.cal} kcal/serving · ${r.servings} servings</div>
    </div>
    <button class="cf-add" onclick="quickAdd('${r.name}',1);closeMyRecipesModal();">+</button>
    <button class="fi-del" onclick="deleteCustomRecipe('${r.id}')">✕</button>
  </div>`).join('');
}

// ── Settings helpers ──────────────────────
window.saveNotifSettings=function(){
  const keys=['morning','water','lunch','night','sleep','finance','weight'];
  const s={};
  keys.forEach(k=>{s[k]=document.getElementById('nt_'+k)?.checked||false;});
  localStorage.setItem('los_notif',JSON.stringify(s));
  const sd=document.getElementById('budgetStartDay');
  if(sd){moneyBudgetStartDay=parseInt(sd.value)||1;localStorage.setItem('los_budget_start',moneyBudgetStartDay);}
  const hasAny=keys.some(k=>s[k]);
  if(hasAny&&Notification.permission==='default') Notification.requestPermission();
};

window.loadNotifSettings=function(){
  try{
    const s=JSON.parse(localStorage.getItem('los_notif')||'{}');
    ['morning','water','lunch','night','sleep','finance','weight'].forEach(k=>{
      const el=document.getElementById('nt_'+k);
      if(el) el.checked=s[k]||false;
    });
    const sd=document.getElementById('budgetStartDay');
    if(sd) sd.value=moneyBudgetStartDay||1;
  }catch(e){}
};

// ── Custom Notifications ─────────────────────────────
let customNotifs=[];

function _loadCustomNotifs(){
  try{ customNotifs=JSON.parse(localStorage.getItem('los_custom_notifs')||'[]'); }catch(e){ customNotifs=[]; }
}
function _saveCustomNotifs(){
  localStorage.setItem('los_custom_notifs',JSON.stringify(customNotifs));
}

function renderCustomNotifList(){
  const el=document.getElementById('customNotifList');
  if(!el) return;
  if(!customNotifs.length){
    el.innerHTML='<div style="font-size:11px;color:var(--t3);margin-bottom:8px;text-align:center;">ยังไม่มีการแจ้งเตือนเพิ่มเติม</div>';
    return;
  }
  el.innerHTML=customNotifs.map(n=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd);">
      <div>
        <span style="font-family:var(--mono);font-size:12px;color:var(--teal);">${n.time}</span>
        <span style="font-size:12px;color:var(--t1);margin-left:8px;">${n.title}</span>
      </div>
      <button onclick="deleteCustomNotif('${n.id}')"
        style="background:none;border:none;color:var(--red);font-size:16px;cursor:pointer;padding:2px 6px;">×</button>
    </div>`).join('');
}

function addCustomNotif(){
  const timeEl=document.getElementById('cnTime');
  const titleEl=document.getElementById('cnTitle');
  const time=timeEl?.value;
  const title=titleEl?.value.trim();
  if(!time||!title){ showToast('⚠️','กรุณากรอกเวลาและชื่อ',''); return; }
  customNotifs.push({id:'cn'+Date.now(),time,title,enabled:true});
  _saveCustomNotifs();
  if(timeEl) timeEl.value='';
  if(titleEl) titleEl.value='';
  renderCustomNotifList();
  if(Notification.permission==='default') Notification.requestPermission();
}

function deleteCustomNotif(id){
  customNotifs=customNotifs.filter(n=>n.id!==id);
  _saveCustomNotifs();
  renderCustomNotifList();
}

// Hook custom notifs into checkNotifications
const _origCheckNotifications=window.checkNotifications||null;
window._checkCustomNotifs=function(hm){
  customNotifs.forEach(n=>{
    if(!n.enabled) return;
    if(n.time!==hm) return;
    const key='cn_'+n.id+'_'+new Date().toDateString();
    if(notifSentToday.has(key)) return;
    notifSentToday.add(key);
    sendNotification('🔔 '+n.title,'');
  });
};

// Patch loadNotifSettings to also render custom notifs
const _prevLoadNotif=window.loadNotifSettings;
window.loadNotifSettings=function(){
  if(_prevLoadNotif) _prevLoadNotif();
  _loadCustomNotifs();
  renderCustomNotifList();
};

// Patch checkNotifications to include custom ones
const _prevCheckNotif_=checkNotifications;
window.checkNotifications=function(){
  _prevCheckNotif_();
  const now=new Date();
  const hm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  window._checkCustomNotifs(hm);
};

// ── .fit / .tcx File Import ───────────────────────────
async function importFitFile(e){
  const file=e.target.files[0];
  if(!file) return;
  // Reset input so same file can be picked again
  e.target.value='';
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='tcx') await _parseTcx(file);
  else if(ext==='fit') await _parseFit(file);
  else showToast('⚠️','ไฟล์ไม่รองรับ','ใช้ .tcx หรือ .fit เท่านั้น');
}

async function _parseTcx(file){
  try{
    const text=await file.text();
    const doc=new DOMParser().parseFromString(text,'text/xml');
    const sport=(doc.querySelector('Activity')?.getAttribute('Sport')||'Other').toLowerCase();
    const lapTimes=[...doc.querySelectorAll('TotalTimeSeconds')].map(el=>parseFloat(el.textContent)||0);
    const totalSec=lapTimes.reduce((s,v)=>s+v,0);
    const totalMin=Math.max(1,Math.round(totalSec/60));
    const totalCal=[...doc.querySelectorAll('Calories')].reduce((s,el)=>s+(parseInt(el.textContent)||0),0);
    const dist=[...doc.querySelectorAll('DistanceMeters')].reduce((s,el)=>s+(parseFloat(el.textContent)||0),0);
    // Map sport → our types
    const sportMap={running:'cardio',cycling:'cardio',walking:'cardio',biking:'cardio',basketball:'basketball',other:'other'};
    const type=sportMap[sport]||'gym';
    const name=file.name.replace(/\.tcx$/i,'');
    // Fill the form
    _fillExerciseForm(type, name, totalMin, totalCal||0);
    showToast('📂','นำเข้าสำเร็จ',`${name} · ${totalMin} นาที${dist?` · ${(dist/1000).toFixed(1)} km`:''}`);
  }catch(err){
    showToast('❌','อ่านไฟล์ .tcx ไม่ได้','ตรวจสอบรูปแบบไฟล์');
  }
}

async function _parseFit(file){
  try{
    const buf=await file.arrayBuffer();
    const view=new DataView(buf);
    // .fit: header is 14 bytes, protocol version at [1], data size at [4..8]
    const headerSize=view.getUint8(0);
    if(headerSize<12){showToast('❌','ไฟล์ .fit ไม่รองรับ','ลองส่งออกเป็น .tcx จาก Garmin/Strava');return;}
    // Simple heuristic: scan for session message (mesg_num=18) fields
    // Instead of full FIT protocol, show a prefill dialog for manual correction
    const name=file.name.replace(/\.fit$/i,'');
    // Try to guess duration from file size heuristic (very rough: ~30 bytes/sec)
    const roughMin=Math.round(buf.byteLength/1800)||60;
    _fillExerciseForm('gym', name, roughMin, 0);
    showToast('📂','นำเข้า .fit (ประมาณ)','ตรวจสอบเวลา/ประเภทก่อนกด บันทึก');
  }catch(err){
    showToast('❌','อ่านไฟล์ .fit ไม่ได้','ลองส่งออกเป็น .tcx จาก Garmin Connect');
  }
}

function _fillExerciseForm(type, name, durationMin, caloriesHint){
  // Select type button
  const btnMap={gym:0,basketball:1,cardio:2,other:3};
  const btns=document.querySelectorAll('.ex-type-btn');
  btns.forEach(b=>b.classList.remove('on'));
  if(btns[btnMap[type]||0]) btns[btnMap[type]||0].classList.add('on');
  currentExType=type;
  const noteEl=document.getElementById('exNotes');
  const durEl=document.getElementById('exDuration');
  const previewEl=document.getElementById('exCalPreview');
  if(noteEl) noteEl.value=name;
  if(durEl){ durEl.value=durationMin; updateExCalPreview(); }
  if(caloriesHint&&previewEl) previewEl.textContent=`ประมาณ ${caloriesHint} kcal (จากไฟล์)`;
}

// ── progLbl alias ──
const _origUpdateProgress=window.updateProgress||function(){};

// ============ BOOT ============
_loadCustomNotifs();
init();
