# Student Dashboard - دليل التشغيل

## 🚀 التشغيل السريع

### الخطوة 1: تثبيت Node.js (مرة واحدة فقط)
- حمّل وثبّت Node.js من [nodejs.org](https://nodejs.org)
- اختر النسخة **LTS**

### الخطوة 2: تشغيل التطبيق
```bash
# انتقل لمجلد المشروع
cd StudentDashBoard

# ثبّت المتطلبات (مرة واحدة)
npm install

# شغّل التطبيق
npm run dev
```

أو ببساطة **اضغط مرتين** على ملف `start.bat` 🎯

---

## 📱 الوصول من أجهزة أخرى (الجوال / الآيباد)

التطبيق يعمل على `0.0.0.0:5173`، أي جهاز متصل بنفس الـ WiFi يمكنه الوصول عبر:

```
http://[IP_جهازك]:5173
```

لمعرفة IP جهازك:
```powershell
# Windows PowerShell
ipconfig | findstr "IPv4"
```

---

## ⚙️ إعداد الـ APIs

### Gemini API (للمساعد الذكي)
1. افتح [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. أنشئ API Key مجاني
3. ضعه في التطبيق: **المزيد → مفاتيح API → Gemini API Key**

### Google Drive (للتخزين)
1. افتح [console.cloud.google.com](https://console.cloud.google.com)
2. أنشئ مشروعاً جديداً
3. فعّل **Google Drive API**
4. أنشئ **OAuth 2.0 Client ID** (نوع Web Application)
5. أضف `http://localhost:5173` كـ Authorized JavaScript origin
6. انسخ الـ Client ID وضعه في التطبيق: **المزيد → مفاتيح API**

---

## 🏗️ Tech Stack

| المكوّن | التقنية |
|---------|---------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3 |
| State | Zustand |
| Database | Dexie.js (IndexedDB) |
| Icons | Lucide React |
| AI | Google Gemini API |
| Drive | Google Drive API v3 + OAuth |
| ICS Parser | ical.js |
| Excel | SheetJS (xlsx) |

---

## 📁 هيكل المشروع

```
src/
├── components/
│   ├── ai/          # المساعد الذكي
│   ├── calendar/    # التقويم
│   ├── home/        # الرئيسية
│   ├── layout/      # شريط التنقل
│   ├── more/        # الإعدادات
│   ├── storage/     # التخزين
│   ├── tasks/       # المهام
│   └── ui/          # مكونات مشتركة
├── lib/
│   ├── db.ts        # قاعدة البيانات (Dexie/IndexedDB)
│   └── utils.ts     # خوارزميات + مساعدات
└── store/
    └── index.ts     # إدارة الحالة (Zustand)
```

---

## 🔒 خوارزمية كتل المذاكرة

عند إضافة اختبار (exam)، يولّد النظام تلقائياً مهمتَي مذاكرة:
- **اليوم الأول**: يومان قبل الاختبار
- **اليوم الثاني**: يوم واحد قبل الاختبار

هذه الكتل مقفلة (🔒) ولا يمكن حذفها إلا بحذف الاختبار.
