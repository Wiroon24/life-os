# Life OS — Wiroon

Personal life management PWA

## วิธี Deploy บน GitHub Pages

### ขั้นตอน 1 — สร้าง Repository
1. ไปที่ https://github.com/new
2. Repository name: `life-os`
3. เลือก **Public**
4. กด **Create repository**

### ขั้นตอน 2 — Upload ไฟล์
**วิธีง่ายที่สุด (ไม่ต้องใช้ git):**
1. ใน repo ที่เพิ่งสร้าง กด **uploading an existing file**
2. Drag & drop ทุกไฟล์ใน folder นี้ขึ้นไป:
   - `index.html`
   - `app.js`
   - `style.css`
   - `sw.js`
   - `manifest.json`
   - folder `icons/` (ทั้ง icon-192.png และ icon-512.png)
3. กด **Commit changes**

### ขั้นตอน 3 — เปิด GitHub Pages
1. ไปที่ **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → folder: **/ (root)**
4. กด **Save**
5. รอ 1-2 นาที แล้วเปิด `https://wiroon24.github.io/life-os`

### ขั้นตอน 4 — Add to Home Screen
1. เปิด Chrome บน Android
2. เข้า URL `https://wiroon24.github.io/life-os`
3. กด ⋮ → **Add to Home screen**
4. ได้เป็น App เลย! 🎉

## Features
- ✅ TODAY — Timeline อัจฉริยะ พร้อม subtask + countdown timer
- 📷 FOOD — Search อาหาร + Barcode Scanner + Water tracker + Report
- 📊 REPORT — กราฟรายสัปดาห์/เดือน/ปี
- 🔄 PWA — ใช้ได้ offline หลัง load ครั้งแรก
- 💾 Auto-save ทุก session

