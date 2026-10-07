# Iam v5 — งานส่งต่อ (handoff)

อัปเดต 2026-10-05 · branch `v5-rebuild` · เจ้าของโปรเจกต์พูดไทย **ตอบเป็นภาษาไทยเสมอ**

## คืออะไร
แอปส่วนตัวผู้ใช้คนเดียว: เลขา + เทรนเนอร์ + ผู้จัดการเงิน + โค้ช AI ที่บันทึก/เตือนจริง Android เท่านั้น
Vite + TypeScript + Preact 10 (**ห้ามอัป Preact 11**: ไม่รับตัวเลข px) + @preact/signals, ห่อด้วย Capacitor 8
- เว็บ: https://lift-os-53d36.web.app (Firebase Hosting) — **APK โหลด UI จากเว็บนี้** (`app/capacitor.config.ts` server.url)
- ข้อมูลผู้ใช้อยู่ใน localStorage ของเครื่อง (prefix `iam5:`) ไม่ sync ออนไลน์ (ตั้งใจ) มี backup/restore JSON ในโปรไฟล์

## โครงสร้าง
- `app/src/domain/*` ตรรกะ (plan, training, food, money, body, sleep, meds, reminders, coach, coachTools, pantry, notif, exerciseInfo)
- `app/src/screens/*` หน้าจอ, `app/src/ui/*` ส่วนประกอบ, `app/src/store/*` (persist, collection = soft delete/undo, nav, ui)
- `app/src/native.ts` สะพาน Capacitor (แจ้งเตือนในเครื่อง, อ่านแจ้งเตือนธนาคาร), `app/src/health.ts` Health Connect
- `app/android/` โค้ด Java ปลั๊กอิน `NotificationCapture`
- เอกสาร: `docs/REBUILD_PLAN.md`, `docs/design-briefs/*`

## คำสั่ง
```bash
cd app && npm run dev               # พัฒนา (port 5173)
npx tsc --noEmit                    # เช็กชนิด (ต้องผ่านก่อน)
npm run build                       # ออก app/dist
# deploy เว็บ (UI ในแอปอัปเดตเองตอนเปิดแอปใหม่ ไม่ต้องลง APK)
firebase deploy --only hosting --project lift-os-53d36    # รันจาก app/ ก็ได้ (หา firebase.json ที่ราก)
# สร้าง APK (ต้องทำเมื่อแก้โค้ด Android/ปลั๊กอิน/manifest เท่านั้น)
export JAVA_HOME=$(ls -d ~/.iam-toolchain/jdk*/Contents/Home | head -1) ANDROID_HOME=~/.iam-toolchain/android-sdk
npx cap sync android && cd android && ./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../dist-apk/Iam-debug.apk
```
เวอร์ชัน APK ปัจจุบัน 1.4 (versionCode 5, minSdk 26 · เพิ่มปลั๊กอินสแกนบาร์โค้ด ML Kit) — เพิ่ม `versionCode` ทุกครั้งที่ปล่อย APK ใหม่
ผู้ใช้ติดตั้ง APK **ทับของเดิม** ห้ามถอนการติดตั้ง (ข้อมูลหาย)

## กฎที่ต้องรักษา (จากผู้ใช้)
1. ทุกอย่างต้องแก้ได้: แม่แบบ vs แก้เฉพาะวัน ("แค่วันนี้/ทุกครั้งต่อจากนี้"), ลบแบบ soft delete + undo, ห้ามฝังค่าตายตัว
2. AI **ห้ามเขียนทับค่าที่ผู้ใช้ตั้งเอง** เสนอเป็นข้อเสนอก่อน (โค้ชแก้โปรแกรม/เป้าอาหารได้เมื่อผู้ใช้สั่งหรือรับข้อเสนอ และมี undo)
3. ตอบ/UI เป็นภาษาไทย ลดศัพท์อังกฤษ
4. เปลี่ยนหน้าตา = เปลี่ยน layout ไม่ใช่แค่สี; ดีไซน์ "Fresh Light" (โทนสว่าง)
5. ปุ่ม back ต้องปิดป๊อปอัพก่อน แล้วย้อนหน้า แล้วออกจากแอป (`app/src/ui/back.ts`: `useBack`)
6. งบ AI ~100–300 บาท/เดือน, โมเดลเริ่มต้น `claude-sonnet-5-5` (ตั้งใน `domain/ai.ts`)

## บทเรียน/กับดัก
- **อย่า return/await ตัวปลั๊กอิน Capacitor ตรงๆ** (proxy ตอบ `.then` ทำให้ promise ค้าง) ห่อใน object ก่อน — ดู `health.ts`
- `/` ของ Hosting ต้อง `no-cache` (แก้แล้วใน `firebase.json`) ไม่งั้นแอปค้างหน้าเก่า 1 ชม.
- เงินเดือนไม่ใช่ txn; เงินเข้าใกล้เงินเดือนสุทธิรอบวันจ่ายจัดหมวด "เงินเดือน" (transfer) กันนับซ้ำ
- วันเงินเดือน = วันก่อนวันทำการสุดท้ายของเดือน (`paydayIn` ใน money.ts) ยังไม่รู้วันหยุดนักขัตฤกษ์
- ดอกรถเป็นแบบ fixed (โปะไม่ลดดอก) — `rateType: 'fixed'` ใน Debt
- ทดสอบ UI บนมือถือ: ใช้ resize เป็น mobile แล้วคืน desktop; ข้อมูลทดสอบอยู่ใน localStorage ของ dev origin
- commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (หรือของเครื่องมือที่ใช้)

## สถานะ
เสร็จแล้ว: ตาราง/เตือนแก้ได้, ซ้อม+คำแนะนำท่า (รูปสาธิต 30 ท่าใน `app/public/ex`), วิเคราะห์โปรแกรม, โภชนาการ+เหตุผลโปรตีน,
ถ่ายอาหาร (ย้อนหลังได้), เงิน (4 ชนิดหมวด, หลายบัตร, หนี้ fixed/reducing + จำลองโปะรายก้อน), อ่านแจ้งเตือนธนาคาร (เลือกแอปได้),
ยา/สกินแคร์ตามช่วงเวลา, todo/กิจกรรม, เตือนน้ำ, ของในครัว+ใบเสร็จ+meal prep+ต้นทุน, โค้ช AI (เครื่องมือ 14 ตัว: บันทึก/วิเคราะห์/แก้โปรแกรม/เป้าอาหาร/ครัว)

**ค้างอยู่ (เรียงตามความสำคัญ)**
1. **Health Connect ได้ 0 รายการเพราะผู้ใช้ยังไม่ได้ใส่นาฬิกา (Amazfit Bip 3 ผ่าน Zepp)** ไม่ใช่บั๊ก Zepp อนุญาตเขียน HR/HRV/SpO2/อัตราหายใจ/RHR/นอน/องค์ประกอบร่างกายแล้ว
   รอผู้ใช้กด "ตรวจ 7 วัน" (โปรไฟล์ > การเชื่อมต่อ, `auditHealth` ใน health.ts) แล้วเทียบกับแอป Zepp ก่อนทำคะแนน Sleep/Strain/Recovery
   (การ์ด 3 วงในหน้าวันนี้: ผู้ใช้ขอให้เตรียม prompt สำหรับ Claude Design ตอนถึงเวลาออกแบบ)
2. ตัวอ่านแจ้งเตือน TrueMoney Wallet ต้องการตัวอย่างข้อความแจ้งเตือนจริง (ตอนนี้รองรับ KTC, K PLUS/MAKE, SCB, กรุงไทย, กรุงเทพ)
3. ยังไม่ได้ทดสอบบนเครื่องจริง: อ่านใบเสร็จด้วย AI, การเตือนน้ำ/ทวง, ปุ่มเชื่อมใบเสร็จกับแจ้งเตือนธนาคาร
4. ต้นทุน AI ยังไม่มีตัวนับในแอป (เสนอไว้ ยังไม่ทำ), per-task model routing (Haiku สำหรับอ่านรูป) ยังไม่ทำ
5. Firestore sync / proxy ซ่อน API key ยังไม่ทำ (ตอนนี้ key อยู่ในเครื่องผู้ใช้ ตั้งใจ)
6. ยังไม่ได้ push branch ไป GitHub — ทำเมื่อผู้ใช้สั่ง

## ความลับ
ไม่มี API key ในรีโป ผู้ใช้ใส่ Anthropic key ในแอป (โปรไฟล์ > AI) เก็บใน localStorage ห้าม commit key
