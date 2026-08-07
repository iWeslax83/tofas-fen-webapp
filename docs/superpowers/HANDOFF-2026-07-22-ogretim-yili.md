# Devir Promptu — Öğretim Yılı Geçişi

Aşağıdaki bloğu yeni bir Claude Code oturumuna olduğu gibi yapıştır.

---

Depo: `/home/weslax83/tofas-fen-webapp`. Dal: `fix/admin-reset-user-password-sync`.

Önceki oturumda tasarım ve uygulama planı bitti. Senin işin planı uygulamak.

**Önce şu üç dosyayı oku:**

1. `docs/superpowers/specs/2026-07-22-ogretim-yili-gecisi-design.md` — onaylanmış tasarım
2. `docs/superpowers/plans/2026-07-22-ogretim-yili-gecisi.md` — 12 görevlik uygulama planı, her adımda tam kod var
3. `CLAUDE.md` — proje kuralları

Sonra `superpowers:subagent-driven-development` skill'ini kullanarak planı görev görev uygula. Plan zaten adım adım kod içeriyor; yeniden tasarlama, planı takip et.

**Kapsam:** Sadece öğretim yılı geçişi (Bölüm A). Gemini destekli içe aktarma
(`docs/superpowers/specs/2026-07-22-gemini-destekli-ice-aktarma-design.md`) ayrı bir PR,
bu oturumda ona dokunma.

**Bilmen gereken durum:**

- `docs/superpowers/` `.gitignore:147` ile hariç tutulmuş. Spec ve plan commit edilemez, sadece diskte durur. Bu beklenen davranış.
- `server/src/services/EvciRequestService.ts` üzerinde **bu işle ilgisi olmayan**, commit edilmemiş bir değişiklik var (evci penceresini okul takvimi tatillerinde kapatıyor, +26 satır). **Commit'lerine dahil etme.** `git add -a` veya `git commit -a` kullanma; her commit'te açık dosya yolları ver ve `git diff --cached` ile doğrula.

**Uyulacak kurallar:**

- Commit mesajlarında yapay zekâ atfı, "Claude" adı veya `Co-Authored-By` satırı yok.
- Yeni admin rotaları `authenticateJWT` + `authorizeRoles(['admin'])` arkasında.
- `Note` modeline ve notlarla ilgili sorgulara dokunulmaz.
- `User.sinif` enum'u değişmez; mezunda `'12'` kalır.
- Sunucu testleri: `cd server && npx vitest run <dosya>`. `setup.ts` in-memory MongoDB açıyor, ek kurulum gerekmez.
- İstemci değişikliği `cd client && npx vite build` geçmeden tamam sayılmaz — `moduleResolution: bundler` yüzünden `tsc` temiz çıkıp Rollup patlayabiliyor.
- **Migration'ı üretim veritabanında çalıştırma.** `server/.env` içindeki `MONGODB_URI` canlı Atlas kümesini gösteriyor. `npm run migrate:up` bir dağıtım adımıdır, bu iş kapsamında değil.
- UI için: gradient yok, glassmorphism yok, mor yok, dekoratif emoji yok. Tek vurgu rengi. Yıkıcı işlem onayı native `confirm` ile değil, repodaki özel confirm dialog bileşeniyle.

**Planın iki kritik yeri — atlamak bug üretir:**

- Task 8 terfiyi snapshot bazlı `bulkWrite` ile uyguluyor. Zincirleme `updateMany` (9→10, sonra 10→11) aynı öğrenciyi iki kez terfi ettirir. Planda bunu kontrol eden test var, testi gevşetme.
- Task 3'te `Homework` okuma filtresine `academicYear` eklenince mevcut testler kırılabilir. Sebebi neredeyse kesin olarak fixture'ların `academicYear` taşımaması — fixture'ı düzelt, filtreyi gevşetme.

Her görevin sonunda commit at. Bitince `npm run lint`, `npm run type-check`, `cd server && npm run test`, `cd client && npm run test`, `cd client && npx vite build` çalıştır ve sonuçları olduğu gibi raporla.
