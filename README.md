 # BLidaoui TV

تطبيق ويب متجاوب لمشاهدة القنوات القانونية في واجهة عربية RTL، مع:


## التشغيل

```bash
npm install
npm run check
npm run serve
```

ثم افتح الرابط الذي يظهره `serve`.

## ملاحظات قانونية وتقنية

لا يقوم المشروع بجمع أو إعادة نشر روابط القنوات المشفرة أو المحمية بحقوق البث، ولا
يتصفح الإنترنت تلقائياً لاكتشاف روابط غير مرخصة. لإضافة قناة، أضف مصدراً قانونياً
موثقاً إلى مصفوفة `channels` في `app.js`.

## APK

بعد تثبيت Android SDK وضبط `ANDROID_HOME`:

```bash
npm run cap:add:android
npm run cap:sync
cd android && gradle assembleDebug
```

أو استخدم الأمر المختصر `npm run build:apk` بعد فتح جلسة Bash جديدة.

ينتج الملف في `android/app/build/outputs/apk/debug/app-debug.apk`. تعذر إخراج
الملف داخل بيئة التطوير الحالية لأن Android SDK غير مثبت فيها.
