// ============ SCHEDULE DATA ============
const DAY_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function makeSched(day) {
  const isWork  = [1,2,3,4,5].includes(day);
  const isBas   = [1,3].includes(day);
  const isNightA = [1,2,4,5].includes(day);
  const isSellon = [1,3,5,6].includes(day);
  const isKeto   = [1,3,5,0].includes(day);

  const nightSkin = isNightA ? 'Retacnyl (คืน A)' : 'Skinoren Rest (คืน B)';
  const bodyName  = isSellon ? 'Sellon 2.5% + Body Moisturizer' : [2,4].includes(day) ? 'Mizumi AHA Body' : 'พักผิวตัว';
  const hairName  = isKeto   ? 'Ketoconazole 2% — ทิ้งไว้ 3 นาที' : 'แชมพูธรรมดา';

  const gymMap = {
    5:'Legs Heavy 🏋️', 6:'Push Heavy 💪', 0:'Pull Heavy 🔥',
    2:'Push — DB+BW 💪', 4:'Pull — DB+BW 🔥'
  };
  const gymSubs = {
    2:[
      {id:'s_wu1',n:'Warm-up: Arm Circle + Shoulder Rotation',sec:30},
      {id:'s_wu2',n:'Warm-up: Wall Slide × 10',sec:0},
      {id:'s_m1',n:'DB Bench Press / Push-up 4×10-12 — พัก 60 วิ',sec:60},
      {id:'s_m2',n:'DB Shoulder Press 3×12 — พัก 60 วิ',sec:60},
      {id:'s_m3',n:'DB Lateral Raise 3×15 — พัก 60 วิ',sec:60},
      {id:'s_m4',n:'DB Incline Press 3×12 — พัก 60 วิ',sec:60},
      {id:'s_m5',n:'Diamond Push-up / Tricep Ext. 3×12 — พัก 60 วิ',sec:60},
      {id:'s_str1',n:'Stretch: Cross-body Shoulder ซ้าย',sec:30},
      {id:'s_str2',n:'Stretch: Cross-body Shoulder ขวา',sec:30},
      {id:'s_str3',n:'Stretch: Chest Doorway',sec:30},
      {id:'s_str4',n:"Stretch: Child's Pose",sec:45},
    ],
    4:[
      {id:'s_wu1',n:'Warm-up: Cat-Cow × 10',sec:0},
      {id:'s_wu2',n:'Warm-up: Thoracic Rotation 10 ครั้ง/ข้าง',sec:0},
      {id:'s_m1',n:'DB Bent-over Row 4×10 — พัก 60 วิ',sec:60},
      {id:'s_m2',n:'DB Single-arm Row 3×12/ข้าง — พัก 60 วิ',sec:60},
      {id:'s_m3',n:'DB Reverse Fly 3×15 — พัก 60 วิ',sec:60},
      {id:'s_m4',n:'DB Bicep Curl 3×12 — พัก 60 วิ',sec:60},
      {id:'s_m5',n:'Inverted Row ใต้โต๊ะ 3×8-10 — พัก 60 วิ',sec:60},
      {id:'s_str1',n:'Stretch: Lat Stretch กำแพง ซ้าย',sec:30},
      {id:'s_str2',n:'Stretch: Lat Stretch กำแพง ขวา',sec:30},
      {id:'s_str3',n:'Stretch: Thread the Needle ซ้าย',sec:30},
      {id:'s_str4',n:'Stretch: Thread the Needle ขวา',sec:30},
    ],
    5:[
      {id:'s_wu1',n:'Warm-up: Leg Swing หน้า-หลัง 15 ครั้ง/ข้าง',sec:0},
      {id:'s_wu2',n:'Warm-up: Hip Circle 10 ครั้ง/ข้าง',sec:0},
      {id:'s_wu3',n:'Warm-up: BW Squat × 15',sec:0},
      {id:'s_m1',n:'Leg Press 4×12 — พัก 60 วิ',sec:60},
      {id:'s_m2',n:'Romanian Deadlift (DB) 3×12 — พัก 60 วิ',sec:60},
      {id:'s_m3',n:'Goblet Squat 3×12 — พัก 60 วิ',sec:60},
      {id:'s_m4',n:'Leg Curl (เครื่อง) 3×15 — พัก 60 วิ',sec:60},
      {id:'s_m5',n:'Calf Raise 4×20 — พัก 45 วิ',sec:45},
      {id:'s_str1',n:'Stretch: Quad ซ้าย',sec:30},
      {id:'s_str2',n:'Stretch: Quad ขวา',sec:30},
      {id:'s_str3',n:'Stretch: Hamstring 40 วิ',sec:40},
      {id:'s_str4',n:'Stretch: Hip Flexor Lunge ซ้าย',sec:30},
      {id:'s_str5',n:'Stretch: Hip Flexor Lunge ขวา',sec:30},
      {id:'s_str6',n:'Stretch: Pigeon Pose ซ้าย',sec:45},
      {id:'s_str7',n:'Stretch: Pigeon Pose ขวา',sec:45},
    ],
    6:[
      {id:'s_m1',n:'DB Bench Press หนัก 4×8 — พัก 90 วิ',sec:90},
      {id:'s_m2',n:'DB Incline Press 3×10 — พัก 90 วิ',sec:90},
      {id:'s_m3',n:'DB Shoulder Press หนัก 4×8 — พัก 90 วิ',sec:90},
      {id:'s_m4',n:'Lateral Raise 3×15 — พัก 60 วิ',sec:60},
      {id:'s_m5',n:'Tricep Pushdown 3×12 — พัก 60 วิ',sec:60},
      {id:'s_m6',n:'Skull Crusher 3×12 — พัก 60 วิ',sec:60},
      {id:'s_str1',n:'Stretch: Chest Doorway',sec:30},
      {id:'s_str2',n:'Stretch: Cross-body Shoulder ซ้าย',sec:30},
      {id:'s_str3',n:'Stretch: Cross-body Shoulder ขวา',sec:30},
    ],
    0:[
      {id:'s_m1',n:'Lat Pulldown หนัก 4×8 — พัก 90 วิ',sec:90},
      {id:'s_m2',n:'Seated Cable Row 4×10 — พัก 90 วิ',sec:90},
      {id:'s_m3',n:'DB Single-arm Row หนัก 3×10/ข้าง — พัก 90 วิ',sec:90},
      {id:'s_m4',n:'Face Pull 3×15 — พัก 60 วิ',sec:60},
      {id:'s_m5',n:'DB Hammer Curl 3×12 — พัก 60 วิ',sec:60},
      {id:'s_str1',n:"Stretch: Lat + Child's Pose",sec:45},
      {id:'s_str2',n:'Stretch: Thread the Needle ซ้าย',sec:30},
      {id:'s_str3',n:'Stretch: Thread the Needle ขวา',sec:30},
    ],
  };

  const s = [];

  s.push({id:'b_wake',t:'07:00',ico:'🌅',name:'ตื่นนอน + เริ่มวัน',subs:[
    {id:'s_w1',n:'ดื่มน้ำ 500ml ก่อนทำอะไร',sec:0},
    {id:'s_w2',n:'Finasteride 1mg + อาหารเช้า',sec:0},
    {id:'s_w3',n:'กินมื้อเช้า — ห้ามข้าม',sec:0},
  ]});

  s.push({id:'b_skin_am',t:'07:15',ico:'✨',name:'Skincare เช้า',subs:[
    {id:'ss1',n:'Cetaphil SA — ล้างหน้า',sec:60},
    {id:'ss2',n:'Benzac 5% — spot treatment (ถ้ามีตุ่ม) รอแห้ง 30 วิ',sec:30},
    {id:'ss3',n:'Clinda M — ตาม Benzac เฉพาะวันที่ใช้ Benzac',sec:0},
    {id:'ss4',n:'Skinoren — ทาบางๆ ทั่วหน้า',sec:0},
    {id:'ss5',n:'Clearnose Moist',sec:0},
    {id:'ss6',n:'Mizumi Matte&Oil SPF ☀️ — ห้ามข้ามแม้อยู่บ้าน',sec:0},
  ]});

  s.push({id:'b_neck_am',t:'07:30',ico:'🧘',name:'ยืดเช้า — คอ/บ่า 8 นาที',subs:[
    {id:'sn1',n:'Chin Tuck — ดึงคางเข้า ค้าง 5 วิ × 10',sec:0},
    {id:'sn2',n:'Neck Side Bend ซ้าย',sec:30},
    {id:'sn3',n:'Neck Side Bend ขวา',sec:30},
    {id:'sn4',n:'Upper Trap Stretch ซ้าย',sec:40},
    {id:'sn5',n:'Upper Trap Stretch ขวา',sec:40},
    {id:'sn6',n:'Levator Scapulae ซ้าย (มองรักแร้)',sec:40},
    {id:'sn7',n:'Levator Scapulae ขวา',sec:40},
    {id:'sn8',n:'Shoulder Roll ไปหน้า × 10',sec:0},
    {id:'sn9',n:'Shoulder Roll ไปหลัง × 10',sec:0},
    {id:'sn10',n:'Cat-Cow × 10 ช้าๆ',sec:0},
    {id:'sn11',n:'Temple + Scalp Massage',sec:120},
  ]});

  if (isBas) {
    s.push({id:'b_ex',t:'08:00',ico:'🏀',name:'บาสเกตบอล + Upper Light',subs:[
      {id:'se1',n:'Warm-up: Ankle Circle 15 ครั้ง/ข้าง',sec:0},
      {id:'se2',n:'Warm-up: High Knee Jog 1 นาที',sec:60},
      {id:'se3',n:'Warm-up: Lateral Shuffle 30 วิ',sec:30},
      {id:'se4',n:'เล่นบาส',sec:0},
      {id:'se5',n:'Upper Light: DB Shoulder Press 2×12 — พัก 60 วิ',sec:60},
      {id:'se6',n:'Upper Light: DB Row 2×12 — พัก 60 วิ',sec:60},
      {id:'se7',n:'Stretch: Quad ซ้าย',sec:30},
      {id:'se8',n:'Stretch: Quad ขวา',sec:30},
      {id:'se9',n:'Stretch: Calf กำแพง ซ้าย',sec:40},
      {id:'se10',n:'Stretch: Calf กำแพง ขวา',sec:40},
      {id:'se11',n:'Stretch: Pigeon Pose ซ้าย',sec:45},
      {id:'se12',n:'Stretch: Pigeon Pose ขวา',sec:45},
    ]});
  } else if (gymMap[day]) {
    const subs = gymSubs[day] || [];
    s.push({id:'b_ex',t:[2,4].includes(day)?'07:45':'08:00',ico:'🏋️',name:gymMap[day],subs});
  }

  if (isWork) {
    s.push({id:'b_work',t:'10:00',ico:'💻',name:'งาน Full Stack',subs:[
      {id:'sw1',n:'เช็ค task วันนี้',sec:0},
      {id:'sw2',n:'20-20-20: มองไกล 20 ฟุต ทุก 20 นาที',sec:0},
      {id:'sw3',n:'ดื่มน้ำ 300ml ระหว่างงาน',sec:0},
      {id:'sw4',n:'ยืดคอ/บ่า 2 นาที ทุกชั่วโมง',sec:120},
    ]});
  } else {
    s.push({id:'b_work',t:'09:00',ico:'📦',name:'งาน Reseller',subs:[
      {id:'sr1',n:'ถ่ายรูปสินค้า',sec:0},
      {id:'sr2',n:'เขียน listing / อัปเดตราคา',sec:0},
      {id:'sr3',n:'จัด inventory',sec:0},
    ]});
  }

  s.push({id:'b_lunch',t:'12:00',ico:'🍱',name:'มื้อกลางวัน + พัก',subs:[
    {id:'sl1',n:'กินข้าว — โปรตีน + ผัก ลดข้าวขาว',sec:0},
    {id:'sl2',n:'เดินเบาๆ 10 นาที',sec:600},
    {id:'sl3',n:'ดื่มน้ำ 250ml',sec:0},
  ]});

  if (isWork) {
    s.push({id:'b_side',t:'18:30',ico:'📦',name:'งานเสริม Reseller',subs:[
      {id:'ssi1',n:'ตอบลูกค้า + อัปเดต listing',sec:0},
      {id:'ssi2',n:'จัดการ order ที่ขายได้',sec:0},
    ]});
  }

  s.push({id:'b_eve',t:'19:00',ico:'🌙',name:'มื้อเย็น — ก่อน 20:00',subs:[
    {id:'se_1',n:'กินข้าวเย็น — ลดคาร์บ เน้นโปรตีน',sec:0},
    {id:'se_2',n:'ดื่มน้ำ 250ml',sec:0},
  ]});

  s.push({id:'b_night',t:'21:00',ico:'🌿',name:'Routine ก่อนนอน',subs:[
    {id:'snt1',n:'ยืดคอ: Chin Tuck × 10',sec:0},
    {id:'snt2',n:'ยืดคอ: Neck Side Bend ซ้าย',sec:30},
    {id:'snt3',n:'ยืดคอ: Neck Side Bend ขวา',sec:30},
    {id:'snt4',n:'ยืดบ่า: Upper Trap ซ้าย',sec:40},
    {id:'snt5',n:'ยืดบ่า: Upper Trap ขวา',sec:40},
    {id:'snt6',n:'ข้อเท้า: Ankle Circle + Alphabet',sec:120},
    {id:'snt7',n:'ข้อเท้า: Single-leg Calf Raise 3×15/ข้าง',sec:0},
    {id:'snt8',n:'ข้อเท้า: Single-leg Stand หลับตา 30 วิ/ข้าง',sec:60},
    {id:'snt9',n:`Skincare คืน — ${nightSkin}`,sec:0},
    {id:'snt9a',n:'ล้างหน้า Cetaphil SA',sec:60},
    {id:'snt9b',n:isNightA?'Cetaphil Lotion buffer บางๆ รอ 5 นาที':'Skinoren ทาบางๆ ทั่วหน้า',sec:isNightA?300:0},
    {id:'snt9c',n:isNightA?'Retacnyl — pea size ทั่วหน้า':'Clearnose Moist',sec:0},
    {id:'snt9d',n:isNightA?'Cetaphil Lotion lock in':'',sec:0},
    {id:'snt10',n:'Minoxidil 5% — ทาหนังศีรษะ',sec:0},
    {id:'snt11',n:'รอ Minoxidil แห้ง',sec:1200},
    {id:'snt12',n:'Nectapharma Hair Serum',sec:0},
    {id:'snt13',n:'Magnesium Glycinate 300mg',sec:0},
    {id:'snt14',n:`อาบน้ำ: ${bodyName}`,sec:[1,3,5,6].includes(day)||[2,4].includes(day)?240:0},
    {id:'snt15',n:`สระผม: ${hairName}`,sec:isKeto?180:0},
  ].filter(x=>x.n!=='')});

  s.push({id:'b_sleep',t:'22:30',ico:'🛌',name:'นอน — เป้า 23:00',subs:[
    {id:'ssl1',n:'ปิดหน้าจอทุกชิ้น',sec:0},
    {id:'ssl2',n:'ห้องมืด + เย็น + เงียบ',sec:0},
  ]});

  return s;
}

// ============ FOOD DATABASE ============
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
  'บะหมี่น้ำ':{cal:350,p:16,c:52,f:8,u:'ชาม'},
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
  'ข้าวขาหมู':{cal:650,p:28,c:60,f:30,u:'จาน'},
  'หมูกรอบ':{cal:450,p:20,c:0,f:40,u:'100g'},
  'ชานม':{cal:300,p:3,c:50,f:8,u:'แก้ว'},
  'กาแฟดำ':{cal:5,p:0,c:1,f:0,u:'แก้ว'},
  'กาแฟลาเต้':{cal:180,p:7,c:25,f:6,u:'แก้ว'},
  'น้ำส้ม':{cal:110,p:1,c:26,f:0,u:'แก้ว'},
  'น้ำอัดลม':{cal:140,p:0,c:36,f:0,u:'กระป๋อง'},
};
