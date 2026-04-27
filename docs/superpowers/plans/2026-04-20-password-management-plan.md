# Şifre Yönetimi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-facing password management system that replaces TCKN-based login with bcrypt-hashed auto-generated passwords, supporting bulk XLS import (Tofaş class-list format), per-user reset/generate, batch activation, and a password audit log.

**Architecture:** New `passwordAdmin` module on the backend (model-service-controller-routes-validator layers, matching the existing `auth` module). New `PasswordManagement` page on the frontend (container + 3 tabs + 2 shared modals + 3 query hooks). Plaintext passwords exist only transiently (generation → response → dismissed modal/download); only bcrypt hashes persist. Existing flat-table bulk import path is removed; parent-child linking parts of `bulkImportService` remain.

**Tech Stack:** Express, Mongoose, ExcelJS (already installed), bcryptjs, express-validator, multer, crypto (Node built-in), React 19, TanStack Query v5, Zustand, React Router 7.5, Tailwind 4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-20-password-management-design.md`

---

## Prerequisites

Before starting, verify:

```bash
cd /home/weslax83/tofas-fen-webapp
node -v                                      # v20+
docker compose ps | grep mongo               # MongoDB running on 27017
ls server/node_modules/exceljs               # exists
ls server/node_modules/express-validator     # exists
ls server/node_modules/xlsx                  # exists (used by parser)
```

If MongoDB isn't running: `docker-compose up -d`.

---

## File Structure

### Backend — created

- `server/src/models/PasswordAuditLog.ts`
- `server/src/models/PasswordImportBatch.ts`
- `server/src/modules/passwordAdmin/passwordGenerator.ts`
- `server/src/modules/passwordAdmin/classListParser.ts`
- `server/src/modules/passwordAdmin/credentialsExporter.ts`
- `server/src/modules/passwordAdmin/passwordAuditService.ts`
- `server/src/modules/passwordAdmin/passwordAdminService.ts`
- `server/src/modules/passwordAdmin/passwordAdminController.ts`
- `server/src/modules/passwordAdmin/passwordAdminRoutes.ts`
- `server/src/modules/passwordAdmin/passwordAdminValidators.ts`
- `server/src/modules/passwordAdmin/__tests__/passwordGenerator.test.ts`
- `server/src/modules/passwordAdmin/__tests__/classListParser.test.ts`
- `server/src/modules/passwordAdmin/__tests__/credentialsExporter.test.ts`
- `server/src/modules/passwordAdmin/__tests__/passwordAuditService.test.ts`
- `server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts`
- `server/src/modules/passwordAdmin/__tests__/passwordAdminRoutes.test.ts`
- `server/src/test/fixtures/class-list-sample.xls` (copy of real file, stripped of PII where possible)

### Backend — modified

- `server/src/models/User.ts` — add `passwordLastSetAt`, `importBatchId`
- `server/src/models/index.ts` — export new models
- `server/src/index.ts` — mount `passwordAdminRoutes` at `/api/admin/passwords`
- `server/src/routes/User.ts` — remove `POST /bulk-import` and unused imports
- `server/src/services/bulkImportService.ts` — remove `parseUserFile`, `validateUserRows`, `bulkCreateUsers` (keep parent-child)

### Frontend — created

- `client/src/pages/Dashboard/PasswordManagement/PasswordManagementPage.tsx`
- `client/src/pages/Dashboard/PasswordManagement/BulkImportTab.tsx`
- `client/src/pages/Dashboard/PasswordManagement/UsersTab.tsx`
- `client/src/pages/Dashboard/PasswordManagement/AuditLogTab.tsx`
- `client/src/pages/Dashboard/PasswordManagement/PasswordRevealModal.tsx`
- `client/src/pages/Dashboard/PasswordManagement/ResetReasonModal.tsx`
- `client/src/pages/Dashboard/PasswordManagement/PendingBatchesList.tsx`
- `client/src/pages/Dashboard/PasswordManagement/hooks/useBulkImport.ts`
- `client/src/pages/Dashboard/PasswordManagement/hooks/useUserPasswordActions.ts`
- `client/src/pages/Dashboard/PasswordManagement/hooks/useAuditLog.ts`

### Frontend — modified

- `client/src/utils/apiEndpoints.ts` — add `PASSWORD_ADMIN` endpoint group
- `client/src/utils/apiService.ts` — add `PasswordAdminService` class; remove `UserService.bulkImportUsers`
- `client/src/App.tsx` — add route `/yonetici/sifre-yonetimi`
- `client/src/pages/Dashboard/AddUserModal.tsx` — add "Şifreyi otomatik üret" checkbox
- Admin sidebar (locate and update) — add menu item, remove old "Toplu İçe Aktar"

### Frontend — deleted

- `client/src/pages/Dashboard/BulkUserImportSection.tsx`

### E2E test — created

- `client/tests/e2e/password-management.spec.ts`

---

## Implementation Order

**Phase 1 — Foundation (backend data + pure functions):** Tasks 1-6
**Phase 2 — Backend services:** Tasks 7-9
**Phase 3 — Backend HTTP:** Tasks 10-13
**Phase 4 — Frontend shared primitives:** Tasks 14-16
**Phase 5 — Frontend tabs:** Tasks 17-20
**Phase 6 — Integration & cleanup:** Tasks 21-25

Each task is independently commitable. The app compiles and tests pass after every commit.

---

## Task 1: PasswordAuditLog model

**Files:**

- Create: `server/src/models/PasswordAuditLog.ts`
- Modify: `server/src/models/index.ts`

- [ ] **Step 1: Create the model file**

```ts
// server/src/models/PasswordAuditLog.ts
import mongoose, { Schema, Document } from 'mongoose';

export type PasswordAuditAction = 'bulk_import' | 'admin_generated' | 'admin_reset';
export type PasswordAuditReason = 'forgot' | 'security' | 'new_user' | 'bulk_import' | 'other';

export const PASSWORD_AUDIT_ACTIONS: PasswordAuditAction[] = [
  'bulk_import',
  'admin_generated',
  'admin_reset',
];
export const PASSWORD_AUDIT_REASONS: PasswordAuditReason[] = [
  'forgot',
  'security',
  'new_user',
  'bulk_import',
  'other',
];

export interface IPasswordAuditLog extends Document {
  userId: string;
  userSnapshot: { id: string; adSoyad: string; rol: string };
  adminId: string;
  adminSnapshot: { id: string; adSoyad: string };
  action: PasswordAuditAction;
  reason: PasswordAuditReason;
  reasonNote?: string;
  batchId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const PasswordAuditLogSchema = new Schema<IPasswordAuditLog>(
  {
    userId: { type: String, required: true, index: true },
    userSnapshot: {
      id: { type: String, required: true },
      adSoyad: { type: String, required: true },
      rol: { type: String, required: true },
    },
    adminId: { type: String, required: true, index: true },
    adminSnapshot: {
      id: { type: String, required: true },
      adSoyad: { type: String, required: true },
    },
    action: { type: String, enum: PASSWORD_AUDIT_ACTIONS, required: true, index: true },
    reason: { type: String, enum: PASSWORD_AUDIT_REASONS, required: true },
    reasonNote: { type: String, maxlength: 280 },
    batchId: { type: String, index: true, sparse: true },
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PasswordAuditLogSchema.index({ userId: 1, createdAt: -1 });
PasswordAuditLogSchema.index({ adminId: 1, createdAt: -1 });
PasswordAuditLogSchema.index({ action: 1, createdAt: -1 });

export const PasswordAuditLog =
  mongoose.models.PasswordAuditLog ||
  mongoose.model<IPasswordAuditLog>('PasswordAuditLog', PasswordAuditLogSchema);
```

- [ ] **Step 2: Export from models index**

Append to `server/src/models/index.ts`:

```ts
export { PasswordAuditLog } from './PasswordAuditLog';
export type {
  IPasswordAuditLog,
  PasswordAuditAction,
  PasswordAuditReason,
} from './PasswordAuditLog';
export { PASSWORD_AUDIT_ACTIONS, PASSWORD_AUDIT_REASONS } from './PasswordAuditLog';
```

- [ ] **Step 3: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/models/PasswordAuditLog.ts server/src/models/index.ts
git commit -m "feat(server): add PasswordAuditLog model"
```

---

## Task 2: PasswordImportBatch model

**Files:**

- Create: `server/src/models/PasswordImportBatch.ts`
- Modify: `server/src/models/index.ts`

- [ ] **Step 1: Create the model file**

```ts
// server/src/models/PasswordImportBatch.ts
import mongoose, { Schema, Document } from 'mongoose';

export type PasswordImportBatchStatus = 'pending' | 'activated' | 'cancelled';

export const PASSWORD_IMPORT_BATCH_STATUSES: PasswordImportBatchStatus[] = [
  'pending',
  'activated',
  'cancelled',
];

export interface IPasswordImportBatch extends Document {
  batchId: string;
  adminId: string;
  userIds: string[];
  totalCount: number;
  status: PasswordImportBatchStatus;
  createdAt: Date;
  activatedAt?: Date;
  cancelledAt?: Date;
}

const PasswordImportBatchSchema = new Schema<IPasswordImportBatch>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    adminId: { type: String, required: true, index: true },
    userIds: [{ type: String }],
    totalCount: { type: Number, required: true },
    status: {
      type: String,
      enum: PASSWORD_IMPORT_BATCH_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    activatedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PasswordImportBatchSchema.index({ status: 1, createdAt: -1 });

export const PasswordImportBatch =
  mongoose.models.PasswordImportBatch ||
  mongoose.model<IPasswordImportBatch>('PasswordImportBatch', PasswordImportBatchSchema);
```

- [ ] **Step 2: Export from models index**

Append to `server/src/models/index.ts`:

```ts
export { PasswordImportBatch } from './PasswordImportBatch';
export type { IPasswordImportBatch, PasswordImportBatchStatus } from './PasswordImportBatch';
export { PASSWORD_IMPORT_BATCH_STATUSES } from './PasswordImportBatch';
```

- [ ] **Step 3: Type-check**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add server/src/models/PasswordImportBatch.ts server/src/models/index.ts
git commit -m "feat(server): add PasswordImportBatch model"
```

---

## Task 3: Extend User model with passwordLastSetAt and importBatchId

**Files:**

- Modify: `server/src/models/User.ts`

- [ ] **Step 1: Add interface fields**

In `server/src/models/User.ts`, inside `IUser` interface (after `loginCount` around line 38):

```ts
  passwordLastSetAt?: Date;
  importBatchId?: string;
```

- [ ] **Step 2: Add schema fields**

In the `UserSchema` definition (after `loginCount` around line 162, before `isActive`):

```ts
    passwordLastSetAt: {
      type: Date,
      index: true,
    },
    importBatchId: {
      type: String,
      sparse: true,
      index: true,
    },
```

- [ ] **Step 3: Add compound index for pending-batch queries**

Near the other compound indexes (around line 223):

```ts
UserSchema.index({ importBatchId: 1, isActive: 1 });
```

- [ ] **Step 4: Type-check**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add server/src/models/User.ts
git commit -m "feat(server): add passwordLastSetAt and importBatchId to User"
```

---

## Task 4: passwordGenerator — random password with rejection sampling

**Files:**

- Create: `server/src/modules/passwordAdmin/passwordGenerator.ts`
- Create: `server/src/modules/passwordAdmin/__tests__/passwordGenerator.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// server/src/modules/passwordAdmin/__tests__/passwordGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { generatePassword, PASSWORD_ALPHABET } from '../passwordGenerator';

describe('generatePassword', () => {
  it('returns an 8-character string by default', () => {
    const pw = generatePassword();
    expect(pw).toHaveLength(8);
  });

  it('only uses characters from the allowed alphabet', () => {
    const allowed = new Set(PASSWORD_ALPHABET);
    for (let i = 0; i < 1000; i++) {
      const pw = generatePassword();
      for (const ch of pw) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it('excludes confusable characters (0, O, o, 1, l, I)', () => {
    const confusable = ['0', 'O', 'o', '1', 'l', 'I'];
    for (const ch of confusable) {
      expect(PASSWORD_ALPHABET).not.toContain(ch);
    }
  });

  it('produces statistically distinct outputs', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      seen.add(generatePassword());
    }
    expect(seen.size).toBeGreaterThan(9990);
  });

  it('supports custom length', () => {
    expect(generatePassword(12)).toHaveLength(12);
    expect(generatePassword(4)).toHaveLength(4);
  });

  it('throws when length is non-positive', () => {
    expect(() => generatePassword(0)).toThrow();
    expect(() => generatePassword(-1)).toThrow();
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordGenerator.test.ts
```

Expected: FAIL with "Cannot find module '../passwordGenerator'".

- [ ] **Step 3: Implement the generator**

```ts
// server/src/modules/passwordAdmin/passwordGenerator.ts
import { randomBytes } from 'crypto';

export const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export const DEFAULT_PASSWORD_LENGTH = 8;

/**
 * Generate a cryptographically random password using rejection sampling
 * to avoid modulo bias. Draws from an alphabet with confusable characters
 * removed (0/O/o, 1/l/I) for ease of dictation.
 */
export function generatePassword(length: number = DEFAULT_PASSWORD_LENGTH): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error(`generatePassword: length must be a positive integer (got ${length})`);
  }

  const n = PASSWORD_ALPHABET.length;
  // Largest multiple of n that fits in a byte; bytes above this are rejected.
  const maxUnbiased = Math.floor(256 / n) * n;
  const out: string[] = [];

  while (out.length < length) {
    // Pull extra bytes to reduce looping from rejections.
    const buf = randomBytes(length * 2);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const b = buf[i];
      if (b < maxUnbiased) {
        out.push(PASSWORD_ALPHABET[b % n]);
      }
    }
  }

  return out.join('');
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordGenerator.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordGenerator.ts server/src/modules/passwordAdmin/__tests__/passwordGenerator.test.ts
git commit -m "feat(server): add passwordGenerator with rejection sampling"
```

---

## Task 5: classListParser — Tofaş multi-block XLS parser

**Files:**

- Create: `server/src/modules/passwordAdmin/classListParser.ts`
- Create: `server/src/modules/passwordAdmin/__tests__/classListParser.test.ts`
- Create: `server/src/test/fixtures/class-list-sample.xls` (copy of real file)

- [ ] **Step 1: Copy the real XLS as a test fixture**

```bash
mkdir -p server/src/test/fixtures
cp "öğrenci tüm liste 20042026.XLS" server/src/test/fixtures/class-list-sample.xls
```

- [ ] **Step 2: Write failing tests**

```ts
// server/src/modules/passwordAdmin/__tests__/classListParser.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseClassListFile } from '../classListParser';

const fixture = () => readFileSync(join(__dirname, '../../../test/fixtures/class-list-sample.xls'));

describe('parseClassListFile', () => {
  it('parses all 444 students from the Tofaş class-list fixture', () => {
    const { rows } = parseClassListFile(fixture());
    expect(rows).toHaveLength(444);
  });

  it('detects all 16 class/section combinations (9A-12D)', () => {
    const { rows } = parseClassListFile(fixture());
    const combos = new Set(rows.map((r) => `${r.sinif}${r.sube}`));
    expect(combos.size).toBe(16);
    for (const sinif of ['9', '10', '11', '12']) {
      for (const sube of ['A', 'B', 'C', 'D']) {
        expect(combos.has(`${sinif}${sube}`)).toBe(true);
      }
    }
  });

  it('joins first and last name with a single space', () => {
    const { rows } = parseClassListFile(fixture());
    for (const r of rows) {
      expect(r.adSoyad).toMatch(/^\S+(\s\S+)+$/);
      expect(r.adSoyad).not.toMatch(/\s{2,}/);
    }
  });

  it('sets rol=student for every row', () => {
    const { rows } = parseClassListFile(fixture());
    expect(rows.every((r) => r.rol === 'student')).toBe(true);
  });

  it('flags pansiyon=true only for rows marked "Yatılı"', () => {
    const { rows } = parseClassListFile(fixture());
    const yatili = rows.filter((r) => r.pansiyon).length;
    expect(yatili).toBe(218);
  });

  it('returns unique string IDs', () => {
    const { rows } = parseClassListFile(fixture());
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(typeof id).toBe('string');
    }
  });

  it('reports parse warnings for empty buffers', () => {
    const { rows, warnings } = parseClassListFile(Buffer.alloc(0));
    expect(rows).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test and verify it fails**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/classListParser.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the parser**

```ts
// server/src/modules/passwordAdmin/classListParser.ts
import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  id: string;
  adSoyad: string;
  rol: 'student';
  sinif: string;
  sube: string;
  pansiyon: boolean;
}

export interface ParseResult {
  rows: ParsedStudentRow[];
  warnings: string[];
}

const CLASS_HEADER_RE = /(\d+)\.\s*Sınıf\s*\/\s*([A-F])/;
const COL_SINO = 0;
const COL_OGRENCI_NO = 1;
const COL_AD = 3;
const COL_SOYAD = 7;
const COL_PANSIYON = 13;

/**
 * Parse a multi-block Tofaş class-list XLS into student rows.
 * Each block starts with a header row like "FL - 9. Sınıf / A Şubesi ... Sınıf Listesi".
 */
export function parseClassListFile(buffer: Buffer): ParseResult {
  const warnings: string[] = [];
  const rows: ParsedStudentRow[] = [];

  if (!buffer || buffer.length === 0) {
    warnings.push('Boş dosya');
    return { rows, warnings };
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    warnings.push(`XLSX okuma hatası: ${err instanceof Error ? err.message : String(err)}`);
    return { rows, warnings };
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    warnings.push('Dosyada sheet bulunamadı');
    return { rows, warnings };
  }
  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  let currentSinif: string | null = null;
  let currentSube: string | null = null;

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    const first = String(row[COL_SINO] ?? '');

    if (first.includes('Sınıf Listesi')) {
      const m = first.match(CLASS_HEADER_RE);
      if (m) {
        currentSinif = m[1];
        currentSube = m[2];
      } else {
        warnings.push(`Satır ${i + 1}: sınıf başlığı tanınamadı`);
        currentSinif = null;
        currentSube = null;
      }
      continue;
    }

    if (typeof row[COL_SINO] !== 'number') continue;
    const ogrenciNo = row[COL_OGRENCI_NO];
    if (ogrenciNo === '' || ogrenciNo === null || ogrenciNo === undefined) continue;

    if (!currentSinif || !currentSube) {
      warnings.push(`Satır ${i + 1}: aktif sınıf bloğu yok, atlandı`);
      continue;
    }

    const ad = String(row[COL_AD] ?? '').trim();
    const soyad = String(row[COL_SOYAD] ?? '').trim();
    if (!ad || !soyad) {
      warnings.push(`Satır ${i + 1}: ad veya soyad boş`);
      continue;
    }
    const adSoyad = `${ad} ${soyad}`.replace(/\s+/g, ' ').trim();

    rows.push({
      id: String(ogrenciNo).trim(),
      adSoyad,
      rol: 'student',
      sinif: currentSinif,
      sube: currentSube,
      pansiyon: String(row[COL_PANSIYON] ?? '').trim() === 'Yatılı',
    });
  }

  return { rows, warnings };
}
```

- [ ] **Step 5: Run tests and verify pass**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/classListParser.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/passwordAdmin/classListParser.ts server/src/modules/passwordAdmin/__tests__/classListParser.test.ts server/src/test/fixtures/class-list-sample.xls
git commit -m "feat(server): add Tofaş class-list XLS parser"
```

---

## Task 6: credentialsExporter — in-memory XLSX builder

**Files:**

- Create: `server/src/modules/passwordAdmin/credentialsExporter.ts`
- Create: `server/src/modules/passwordAdmin/__tests__/credentialsExporter.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// server/src/modules/passwordAdmin/__tests__/credentialsExporter.test.ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildCredentialsXlsx } from '../credentialsExporter';

const sampleRows = [
  {
    id: '202',
    adSoyad: 'AHMET KILIÇKAN',
    rol: 'student',
    sinif: '9',
    sube: 'A',
    pansiyon: false,
    password: 'abc12345',
  },
  {
    id: '204',
    adSoyad: 'ALİ EMRE İŞLER',
    rol: 'student',
    sinif: '9',
    sube: 'A',
    pansiyon: true,
    password: 'xyz67890',
  },
];

describe('buildCredentialsXlsx', () => {
  it('returns a non-empty Buffer', async () => {
    const buf = await buildCredentialsXlsx(sampleRows);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('produces an XLSX with the expected headers and rows', async () => {
    const buf = await buildCredentialsXlsx(sampleRows);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    expect(data).toHaveLength(2);
    expect(Object.keys(data[0])).toEqual([
      'Öğrenci No',
      'Ad Soyad',
      'Rol',
      'Sınıf',
      'Şube',
      'Pansiyon',
      'Şifre',
    ]);
    expect(data[0]['Şifre']).toBe('abc12345');
    expect(data[1]['Pansiyon']).toBe('Evet');
    expect(data[0]['Pansiyon']).toBe('Hayır');
  });

  it('handles an empty row set without throwing', async () => {
    const buf = await buildCredentialsXlsx([]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/credentialsExporter.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the exporter**

```ts
// server/src/modules/passwordAdmin/credentialsExporter.ts
import ExcelJS from 'exceljs';

export interface CredentialsRow {
  id: string;
  adSoyad: string;
  rol: string;
  sinif?: string;
  sube?: string;
  pansiyon: boolean;
  password: string;
}

/**
 * Build an XLSX buffer containing plaintext credentials for a batch.
 * The buffer is produced in-memory and never written to disk.
 */
export async function buildCredentialsXlsx(rows: CredentialsRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Credentials');

  sheet.columns = [
    { header: 'Öğrenci No', key: 'id', width: 14 },
    { header: 'Ad Soyad', key: 'adSoyad', width: 30 },
    { header: 'Rol', key: 'rol', width: 12 },
    { header: 'Sınıf', key: 'sinif', width: 8 },
    { header: 'Şube', key: 'sube', width: 8 },
    { header: 'Pansiyon', key: 'pansiyon', width: 10 },
    { header: 'Şifre', key: 'password', width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  for (const r of rows) {
    sheet.addRow({
      id: r.id,
      adSoyad: r.adSoyad,
      rol: r.rol,
      sinif: r.sinif ?? '',
      sube: r.sube ?? '',
      pansiyon: r.pansiyon ? 'Evet' : 'Hayır',
      password: r.password,
    });
  }

  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr as ArrayBuffer);
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/credentialsExporter.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/passwordAdmin/credentialsExporter.ts server/src/modules/passwordAdmin/__tests__/credentialsExporter.test.ts
git commit -m "feat(server): add credentials XLSX exporter"
```

---

## Task 7: passwordAuditService — log operations

**Files:**

- Create: `server/src/modules/passwordAdmin/passwordAuditService.ts`
- Create: `server/src/modules/passwordAdmin/__tests__/passwordAuditService.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// server/src/modules/passwordAdmin/__tests__/passwordAuditService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { PasswordAuditLog } from '../../../models';
import { recordPasswordEvent, queryAuditLog } from '../passwordAuditService';

beforeEach(async () => {
  await PasswordAuditLog.deleteMany({});
});

describe('recordPasswordEvent', () => {
  it('persists a record with snapshots', async () => {
    await recordPasswordEvent({
      user: { id: 'u1', adSoyad: 'Öğrenci Bir', rol: 'student' },
      admin: { id: 'a1', adSoyad: 'Admin Bir' },
      action: 'admin_reset',
      reason: 'forgot',
    });
    const all = await PasswordAuditLog.find({}).lean();
    expect(all).toHaveLength(1);
    expect(all[0].userSnapshot.adSoyad).toBe('Öğrenci Bir');
    expect(all[0].action).toBe('admin_reset');
  });

  it('rejects a password value passed in any field (guard)', async () => {
    const input: any = {
      user: { id: 'u1', adSoyad: 'x', rol: 'student' },
      admin: { id: 'a1', adSoyad: 'y' },
      action: 'admin_reset',
      reason: 'forgot',
      password: 'LEAKED',
      reasonNote: 'contains password=SECRET leak',
    };
    await expect(recordPasswordEvent(input)).rejects.toThrow(/password/i);
  });
});

describe('queryAuditLog', () => {
  it('filters by userId and paginates', async () => {
    for (let i = 0; i < 5; i++) {
      await recordPasswordEvent({
        user: { id: 'u1', adSoyad: 'x', rol: 'student' },
        admin: { id: 'a1', adSoyad: 'y' },
        action: 'admin_reset',
        reason: 'forgot',
      });
    }
    for (let i = 0; i < 3; i++) {
      await recordPasswordEvent({
        user: { id: 'u2', adSoyad: 'x', rol: 'student' },
        admin: { id: 'a1', adSoyad: 'y' },
        action: 'admin_reset',
        reason: 'security',
      });
    }
    const page = await queryAuditLog({ userId: 'u1', page: 1, limit: 3 });
    expect(page.total).toBe(5);
    expect(page.items).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordAuditService.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

```ts
// server/src/modules/passwordAdmin/passwordAuditService.ts
import {
  PasswordAuditLog,
  IPasswordAuditLog,
  PasswordAuditAction,
  PasswordAuditReason,
} from '../../models';

export interface RecordPasswordEventInput {
  user: { id: string; adSoyad: string; rol: string };
  admin: { id: string; adSoyad: string };
  action: PasswordAuditAction;
  reason: PasswordAuditReason;
  reasonNote?: string;
  batchId?: string;
  ip?: string;
  userAgent?: string;
}

// Guard — a plaintext password must never transit this module.
const FORBIDDEN_KEYS = ['password', 'plaintext', 'sifre', 'pw'];
const FORBIDDEN_NOTE_RE = /password\s*[:=]/i;

function rejectIfSmellsLikePassword(input: Record<string, unknown>) {
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_KEYS.includes(key)) {
      throw new Error(
        `passwordAuditService: forbidden key "${key}" — plaintext passwords cannot be audited`,
      );
    }
  }
  if (typeof input.reasonNote === 'string' && FORBIDDEN_NOTE_RE.test(input.reasonNote)) {
    throw new Error('passwordAuditService: reasonNote appears to contain a password literal');
  }
}

export async function recordPasswordEvent(
  input: RecordPasswordEventInput,
): Promise<IPasswordAuditLog> {
  rejectIfSmellsLikePassword(input as unknown as Record<string, unknown>);
  const doc = await PasswordAuditLog.create({
    userId: input.user.id,
    userSnapshot: input.user,
    adminId: input.admin.id,
    adminSnapshot: input.admin,
    action: input.action,
    reason: input.reason,
    reasonNote: input.reasonNote,
    batchId: input.batchId,
    ip: input.ip,
    userAgent: input.userAgent,
  });
  return doc;
}

export interface QueryAuditLogInput {
  userId?: string;
  adminId?: string;
  action?: PasswordAuditAction;
  reason?: PasswordAuditReason;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface QueryAuditLogResult {
  items: IPasswordAuditLog[];
  total: number;
  page: number;
  limit: number;
}

export async function queryAuditLog(input: QueryAuditLogInput): Promise<QueryAuditLogResult> {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const filter: Record<string, unknown> = {};
  if (input.userId) filter.userId = input.userId;
  if (input.adminId) filter.adminId = input.adminId;
  if (input.action) filter.action = input.action;
  if (input.reason) filter.reason = input.reason;
  if (input.from || input.to) {
    const range: Record<string, Date> = {};
    if (input.from) range.$gte = input.from;
    if (input.to) range.$lte = input.to;
    filter.createdAt = range;
  }
  const [items, total] = await Promise.all([
    PasswordAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PasswordAuditLog.countDocuments(filter),
  ]);
  return { items: items as unknown as IPasswordAuditLog[], total, page, limit };
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordAuditService.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAuditService.ts server/src/modules/passwordAdmin/__tests__/passwordAuditService.test.ts
git commit -m "feat(server): add passwordAuditService with plaintext guard"
```

---

## Task 8: passwordAdminService — single-user reset/generate

**Files:**

- Create: `server/src/modules/passwordAdmin/passwordAdminService.ts`
- Create: `server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { User, PasswordAuditLog } from '../../../models';
import { resetUserPassword, generateUserPassword } from '../passwordAdminService';

async function makeUser(id: string, extra: Record<string, unknown> = {}) {
  return User.create({
    id,
    adSoyad: `User ${id}`,
    rol: 'student',
    sinif: '9',
    sube: 'A',
    isActive: true,
    ...extra,
  });
}

async function makeAdmin(id = 'admin1') {
  return User.create({ id, adSoyad: 'Admin', rol: 'admin', isActive: true });
}

beforeEach(async () => {
  await User.deleteMany({});
  await PasswordAuditLog.deleteMany({});
});

describe('resetUserPassword', () => {
  it('sets a new hashed password, bumps tokenVersion, and records audit', async () => {
    const admin = await makeAdmin();
    const user = await makeUser('u1', { sifre: await bcrypt.hash('old', 10), tokenVersion: 3 });
    const { password } = await resetUserPassword({
      userId: user.id,
      admin: { id: admin.id, adSoyad: admin.adSoyad },
      reason: 'forgot',
    });
    expect(password).toHaveLength(8);
    const after = await User.findOne({ id: 'u1' });
    expect(after!.tokenVersion).toBe(4);
    expect(await bcrypt.compare(password, after!.sifre!)).toBe(true);
    expect(await bcrypt.compare('old', after!.sifre!)).toBe(false);
    const logs = await PasswordAuditLog.find({});
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('admin_reset');
  });

  it('throws when user does not exist', async () => {
    const admin = await makeAdmin();
    await expect(
      resetUserPassword({
        userId: 'missing',
        admin: { id: admin.id, adSoyad: admin.adSoyad },
        reason: 'forgot',
      }),
    ).rejects.toThrow(/bulunamadı/i);
  });
});

describe('generateUserPassword', () => {
  it('sets a password only when passwordLastSetAt is null', async () => {
    const admin = await makeAdmin();
    await makeUser('u2');
    const { password } = await generateUserPassword({
      userId: 'u2',
      admin: { id: admin.id, adSoyad: admin.adSoyad },
      reason: 'new_user',
    });
    expect(password).toHaveLength(8);
    const after = await User.findOne({ id: 'u2' });
    expect(after!.passwordLastSetAt).toBeInstanceOf(Date);
  });

  it('returns 409-signal (throws with code) when user already has a password', async () => {
    const admin = await makeAdmin();
    await makeUser('u3', { passwordLastSetAt: new Date() });
    await expect(
      generateUserPassword({
        userId: 'u3',
        admin: { id: admin.id, adSoyad: admin.adSoyad },
        reason: 'new_user',
      }),
    ).rejects.toMatchObject({ code: 'ALREADY_HAS_PASSWORD' });
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service (first pass: single-user methods)**

```ts
// server/src/modules/passwordAdmin/passwordAdminService.ts
import bcrypt from 'bcryptjs';
import { User, PasswordAuditReason } from '../../models';
import { generatePassword } from './passwordGenerator';
import { recordPasswordEvent } from './passwordAuditService';

const BCRYPT_ROUNDS = 10;

export interface AdminContext {
  id: string;
  adSoyad: string;
  ip?: string;
  userAgent?: string;
}

export interface ResetInput {
  userId: string;
  admin: AdminContext;
  reason: PasswordAuditReason;
  reasonNote?: string;
}

export interface PasswordOperationResult {
  password: string;
  userId: string;
}

async function loadUserOrThrow(userId: string) {
  const user = await User.findOne({ id: userId });
  if (!user) {
    const err: NodeJS.ErrnoException = new Error(`Kullanıcı bulunamadı: ${userId}`);
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  return user;
}

export async function resetUserPassword(input: ResetInput): Promise<PasswordOperationResult> {
  const user = await loadUserOrThrow(input.userId);

  await recordPasswordEvent({
    user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
    admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
    action: 'admin_reset',
    reason: input.reason,
    reasonNote: input.reasonNote,
    ip: input.admin.ip,
    userAgent: input.admin.userAgent,
  });

  const password = generatePassword();
  user.sifre = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordLastSetAt = new Date();
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  return { password, userId: user.id };
}

export async function generateUserPassword(input: ResetInput): Promise<PasswordOperationResult> {
  const user = await loadUserOrThrow(input.userId);
  if (user.passwordLastSetAt) {
    const err: NodeJS.ErrnoException = new Error(
      'Kullanıcının zaten bir şifresi var; reset kullanın',
    );
    err.code = 'ALREADY_HAS_PASSWORD';
    throw err;
  }

  await recordPasswordEvent({
    user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
    admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
    action: 'admin_generated',
    reason: input.reason,
    reasonNote: input.reasonNote,
    ip: input.admin.ip,
    userAgent: input.admin.userAgent,
  });

  const password = generatePassword();
  user.sifre = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordLastSetAt = new Date();
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  return { password, userId: user.id };
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminService.ts server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts
git commit -m "feat(server): add reset/generate password service methods"
```

---

## Task 9: passwordAdminService — bulk import, activate, regenerate, cancel

**Files:**

- Modify: `server/src/modules/passwordAdmin/passwordAdminService.ts`
- Modify: `server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts`

- [ ] **Step 1: Append failing tests**

Add to `passwordAdminService.test.ts` (inside the same file, after existing describe blocks):

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  bulkImportClassList,
  activateImportBatch,
  regenerateImportBatchPasswords,
  cancelImportBatch,
  listPendingBatches,
} from '../passwordAdminService';
import { PasswordImportBatch } from '../../../models';

const fixture = () => readFileSync(join(__dirname, '../../../test/fixtures/class-list-sample.xls'));

describe('bulkImportClassList', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await PasswordAuditLog.deleteMany({});
    await PasswordImportBatch.deleteMany({});
  });

  it('creates inactive users with hashed passwords and returns credentials rows', async () => {
    const admin = await makeAdmin();
    const { batchId, credentialsRows } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    expect(credentialsRows).toHaveLength(444);
    const users = await User.find({ importBatchId: batchId });
    expect(users).toHaveLength(444);
    expect(users.every((u) => u.isActive === false)).toBe(true);
    expect(users.every((u) => typeof u.sifre === 'string' && u.sifre.length > 20)).toBe(true);
    const batch = await PasswordImportBatch.findOne({ batchId });
    expect(batch!.status).toBe('pending');
    expect(batch!.totalCount).toBe(444);
    const logs = await PasswordAuditLog.find({ batchId });
    expect(logs).toHaveLength(444);
  });

  it('skips users whose IDs already exist', async () => {
    const admin = await makeAdmin();
    await makeUser('202');
    const { credentialsRows, skipped } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    expect(skipped).toContain('202');
    expect(credentialsRows.find((r) => r.id === '202')).toBeUndefined();
    expect(credentialsRows).toHaveLength(443);
  });
});

describe('activateImportBatch', () => {
  it('activates all users in the batch', async () => {
    const admin = await makeAdmin();
    const { batchId } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    await activateImportBatch({ batchId, admin: { id: admin.id, adSoyad: admin.adSoyad } });
    const users = await User.find({ importBatchId: batchId });
    expect(users.every((u) => u.isActive)).toBe(true);
    const batch = await PasswordImportBatch.findOne({ batchId });
    expect(batch!.status).toBe('activated');
  });
});

describe('regenerateImportBatchPasswords', () => {
  it('replaces all passwords in a pending batch', async () => {
    const admin = await makeAdmin();
    const { batchId, credentialsRows: first } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    const { credentialsRows: second } = await regenerateImportBatchPasswords({
      batchId,
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    expect(second).toHaveLength(first.length);
    const matches = second.filter((s) =>
      first.some((f) => f.id === s.id && f.password === s.password),
    );
    expect(matches).toHaveLength(0);
  });
});

describe('cancelImportBatch', () => {
  it('removes all users and marks batch cancelled', async () => {
    const admin = await makeAdmin();
    const { batchId } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    await cancelImportBatch({ batchId, admin: { id: admin.id, adSoyad: admin.adSoyad } });
    const remaining = await User.countDocuments({ importBatchId: batchId });
    expect(remaining).toBe(0);
    const batch = await PasswordImportBatch.findOne({ batchId });
    expect(batch!.status).toBe('cancelled');
  });
});

describe('listPendingBatches', () => {
  it('returns only pending batches sorted newest-first', async () => {
    const admin = await makeAdmin();
    const { batchId: a } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    await activateImportBatch({ batchId: a, admin: { id: admin.id, adSoyad: admin.adSoyad } });
    await User.deleteMany({});
    const { batchId: b } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    const pending = await listPendingBatches();
    expect(pending.map((p) => p.batchId)).toEqual([b]);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts
```

Expected: FAIL — new functions not exported.

- [ ] **Step 3: Extend the service**

Append to `server/src/modules/passwordAdmin/passwordAdminService.ts`:

```ts
import { randomUUID } from 'crypto';
import { PasswordImportBatch, IPasswordImportBatch } from '../../models';
import { parseClassListFile, ParsedStudentRow } from './classListParser';
import { CredentialsRow } from './credentialsExporter';

export interface BulkImportInput {
  fileBuffer: Buffer;
  admin: AdminContext;
}

export interface BulkImportResult {
  batchId: string;
  credentialsRows: CredentialsRow[];
  skipped: string[];
  warnings: string[];
}

export async function previewClassList(buffer: Buffer): Promise<{
  rows: ParsedStudentRow[];
  warnings: string[];
  existingIds: string[];
}> {
  const { rows, warnings } = parseClassListFile(buffer);
  const ids = rows.map((r) => r.id);
  const existing = await User.find({ id: { $in: ids } })
    .select('id')
    .lean();
  return { rows, warnings, existingIds: existing.map((u) => u.id) };
}

async function writeUsersForBatch(
  batchId: string,
  rows: ParsedStudentRow[],
): Promise<{ written: ParsedStudentRow[]; skipped: string[]; passwords: Map<string, string> }> {
  const ids = rows.map((r) => r.id);
  const existing = await User.find({ id: { $in: ids } })
    .select('id')
    .lean();
  const existingSet = new Set(existing.map((u) => u.id));
  const toWrite = rows.filter((r) => !existingSet.has(r.id));
  const passwords = new Map<string, string>();

  const docs = await Promise.all(
    toWrite.map(async (r) => {
      const pw = generatePassword();
      passwords.set(r.id, pw);
      const hash = await bcrypt.hash(pw, BCRYPT_ROUNDS);
      return {
        id: r.id,
        adSoyad: r.adSoyad,
        rol: r.rol,
        sinif: r.sinif,
        sube: r.sube,
        pansiyon: r.pansiyon,
        sifre: hash,
        passwordLastSetAt: new Date(),
        importBatchId: batchId,
        isActive: false,
        childId: [],
        tokenVersion: 0,
      };
    }),
  );

  if (docs.length > 0) {
    await User.insertMany(docs, { ordered: false });
  }

  return { written: toWrite, skipped: [...existingSet], passwords };
}

export async function bulkImportClassList(input: BulkImportInput): Promise<BulkImportResult> {
  const { rows, warnings } = parseClassListFile(input.fileBuffer);
  const batchId = randomUUID();
  const { written, skipped, passwords } = await writeUsersForBatch(batchId, rows);

  await Promise.all(
    written.map((r) =>
      recordPasswordEvent({
        user: { id: r.id, adSoyad: r.adSoyad, rol: r.rol },
        admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
        action: 'bulk_import',
        reason: 'bulk_import',
        batchId,
        ip: input.admin.ip,
        userAgent: input.admin.userAgent,
      }),
    ),
  );

  await PasswordImportBatch.create({
    batchId,
    adminId: input.admin.id,
    userIds: written.map((r) => r.id),
    totalCount: written.length,
    status: 'pending',
  });

  const credentialsRows: CredentialsRow[] = written.map((r) => ({
    id: r.id,
    adSoyad: r.adSoyad,
    rol: r.rol,
    sinif: r.sinif,
    sube: r.sube,
    pansiyon: r.pansiyon,
    password: passwords.get(r.id)!,
  }));

  return { batchId, credentialsRows, skipped, warnings };
}

async function loadPendingBatchOrThrow(batchId: string): Promise<IPasswordImportBatch> {
  const batch = await PasswordImportBatch.findOne({ batchId });
  if (!batch) {
    const err: NodeJS.ErrnoException = new Error(`Batch bulunamadı: ${batchId}`);
    err.code = 'BATCH_NOT_FOUND';
    throw err;
  }
  if (batch.status !== 'pending') {
    const err: NodeJS.ErrnoException = new Error(`Batch durumu "${batch.status}", işlem yapılamaz`);
    err.code = 'BATCH_NOT_PENDING';
    throw err;
  }
  return batch;
}

export async function activateImportBatch(input: { batchId: string; admin: AdminContext }) {
  const batch = await loadPendingBatchOrThrow(input.batchId);
  await User.updateMany({ importBatchId: batch.batchId }, { $set: { isActive: true } });
  batch.status = 'activated';
  batch.activatedAt = new Date();
  await batch.save();
  return { activated: batch.userIds.length };
}

export async function regenerateImportBatchPasswords(input: {
  batchId: string;
  admin: AdminContext;
}): Promise<{ credentialsRows: CredentialsRow[] }> {
  const batch = await loadPendingBatchOrThrow(input.batchId);
  const users = await User.find({ importBatchId: batch.batchId });
  const credentialsRows: CredentialsRow[] = [];
  for (const user of users) {
    const pw = generatePassword();
    user.sifre = await bcrypt.hash(pw, BCRYPT_ROUNDS);
    user.passwordLastSetAt = new Date();
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    await recordPasswordEvent({
      user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
      admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
      action: 'admin_reset',
      reason: 'bulk_import',
      batchId: batch.batchId,
      ip: input.admin.ip,
      userAgent: input.admin.userAgent,
    });
    credentialsRows.push({
      id: user.id,
      adSoyad: user.adSoyad,
      rol: user.rol,
      sinif: user.sinif,
      sube: user.sube,
      pansiyon: user.pansiyon,
      password: pw,
    });
  }
  return { credentialsRows };
}

export async function cancelImportBatch(input: { batchId: string; admin: AdminContext }) {
  const batch = await loadPendingBatchOrThrow(input.batchId);
  await User.deleteMany({ importBatchId: batch.batchId });
  batch.status = 'cancelled';
  batch.cancelledAt = new Date();
  await batch.save();
  return { cancelled: batch.userIds.length };
}

export async function listPendingBatches(): Promise<IPasswordImportBatch[]> {
  return PasswordImportBatch.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .lean() as unknown as IPasswordImportBatch[];
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminService.ts server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts
git commit -m "feat(server): add bulk import, activate, regenerate, cancel batch"
```

---

## Task 10: passwordAdminValidators — express-validator chains

**Files:**

- Create: `server/src/modules/passwordAdmin/passwordAdminValidators.ts`

- [ ] **Step 1: Implement validators**

```ts
// server/src/modules/passwordAdmin/passwordAdminValidators.ts
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { PASSWORD_AUDIT_REASONS } from '../../models';

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Doğrulama hatası', details: errors.array() });
  }
  next();
}

export const validateResetBody = [
  body('reason').isIn(PASSWORD_AUDIT_REASONS).withMessage('Geçersiz sebep'),
  body('reasonNote')
    .optional()
    .isString()
    .isLength({ max: 280 })
    .withMessage('reasonNote en fazla 280 karakter'),
  handleValidationErrors,
];

export const validateUserIdParam = [
  param('userId').isString().notEmpty().withMessage('userId zorunlu'),
  handleValidationErrors,
];

export const validateBatchIdParam = [
  param('batchId').isUUID().withMessage('Geçersiz batchId'),
  handleValidationErrors,
];

export const validateActivateBody = [
  body('batchId').isUUID().withMessage('Geçersiz batchId'),
  handleValidationErrors,
];

export const validateAuditQuery = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('userId').optional().isString(),
  query('adminId').optional().isString(),
  query('action').optional().isIn(['bulk_import', 'admin_generated', 'admin_reset']),
  query('reason').optional().isIn(PASSWORD_AUDIT_REASONS),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  handleValidationErrors,
];
```

- [ ] **Step 2: Type-check**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminValidators.ts
git commit -m "feat(server): add passwordAdmin validators"
```

---

## Task 11: passwordAdminController — HTTP handlers

**Files:**

- Create: `server/src/modules/passwordAdmin/passwordAdminController.ts`

- [ ] **Step 1: Implement the controller**

```ts
// server/src/modules/passwordAdmin/passwordAdminController.ts
import { Request, Response, NextFunction } from 'express';
import {
  resetUserPassword,
  generateUserPassword,
  bulkImportClassList,
  activateImportBatch,
  regenerateImportBatchPasswords,
  cancelImportBatch,
  listPendingBatches,
  previewClassList,
  AdminContext,
} from './passwordAdminService';
import { queryAuditLog } from './passwordAuditService';
import { buildCredentialsXlsx } from './credentialsExporter';

function getAdminContext(req: Request): AdminContext {
  const anyReq = req as unknown as { user?: { id: string; adSoyad: string } };
  if (!anyReq.user) {
    throw new Error('Authenticated admin user missing on request');
  }
  return {
    id: anyReq.user.id,
    adSoyad: anyReq.user.adSoyad,
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

function setNoStore(res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

function httpStatusForCode(code?: string): number {
  switch (code) {
    case 'USER_NOT_FOUND':
    case 'BATCH_NOT_FOUND':
      return 404;
    case 'ALREADY_HAS_PASSWORD':
    case 'BATCH_NOT_PENDING':
      return 409;
    default:
      return 500;
  }
}

function handleServiceError(err: unknown, res: Response) {
  const e = err as NodeJS.ErrnoException;
  const status = httpStatusForCode(e.code);
  res.status(status).json({ error: e.message, code: e.code });
}

export async function resetPassword(req: Request, res: Response, _next: NextFunction) {
  try {
    const admin = getAdminContext(req);
    const result = await resetUserPassword({
      userId: req.params.userId,
      admin,
      reason: req.body.reason,
      reasonNote: req.body.reasonNote,
    });
    setNoStore(res);
    res.json({ password: result.password, userId: result.userId });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function generatePasswordForUser(req: Request, res: Response) {
  try {
    const admin = getAdminContext(req);
    const result = await generateUserPassword({
      userId: req.params.userId,
      admin,
      reason: req.body.reason ?? 'new_user',
      reasonNote: req.body.reasonNote,
    });
    setNoStore(res);
    res.json({ password: result.password, userId: result.userId });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function bulkImport(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });
    const admin = getAdminContext(req);

    if (req.query.preview === 'true') {
      const preview = await previewClassList(req.file.buffer);
      return res.json({
        total: preview.rows.length,
        warnings: preview.warnings,
        existingIds: preview.existingIds,
        sample: preview.rows.slice(0, 20),
        classDistribution: preview.rows.reduce<Record<string, number>>((acc, r) => {
          const k = `${r.sinif}${r.sube}`;
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      });
    }

    const result = await bulkImportClassList({ fileBuffer: req.file.buffer, admin });
    const xlsx = await buildCredentialsXlsx(result.credentialsRows);
    setNoStore(res);
    res.json({
      batchId: result.batchId,
      imported: result.credentialsRows.length,
      skipped: result.skipped,
      warnings: result.warnings,
      credentialsFileBase64: xlsx.toString('base64'),
      credentialsFilename: `credentials-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${result.batchId}.xlsx`,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function activateBatch(req: Request, res: Response) {
  try {
    const admin = getAdminContext(req);
    const result = await activateImportBatch({ batchId: req.body.batchId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function regenerateBatch(req: Request, res: Response) {
  try {
    const admin = getAdminContext(req);
    const result = await regenerateImportBatchPasswords({ batchId: req.params.batchId, admin });
    const xlsx = await buildCredentialsXlsx(result.credentialsRows);
    setNoStore(res);
    res.json({
      imported: result.credentialsRows.length,
      credentialsFileBase64: xlsx.toString('base64'),
      credentialsFilename: `credentials-regen-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${req.params.batchId}.xlsx`,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function cancelBatch(req: Request, res: Response) {
  try {
    const admin = getAdminContext(req);
    const result = await cancelImportBatch({ batchId: req.params.batchId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function pendingBatches(_req: Request, res: Response) {
  try {
    const items = await listPendingBatches();
    res.json({ items });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function auditLog(req: Request, res: Response) {
  try {
    const result = await queryAuditLog({
      userId: req.query.userId as string | undefined,
      adminId: req.query.adminId as string | undefined,
      action: req.query.action as undefined | 'bulk_import' | 'admin_generated' | 'admin_reset',
      reason: req.query.reason as
        | undefined
        | 'forgot'
        | 'security'
        | 'new_user'
        | 'bulk_import'
        | 'other',
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminController.ts
git commit -m "feat(server): add passwordAdmin controller"
```

---

## Task 12: passwordAdminRoutes — router + mount

**Files:**

- Create: `server/src/modules/passwordAdmin/passwordAdminRoutes.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create the router**

```ts
// server/src/modules/passwordAdmin/passwordAdminRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticateJWT, authorizeRoles } from '../../utils/jwt';
import { verifyUploadedFiles } from '../../config/upload';
import {
  resetPassword,
  generatePasswordForUser,
  bulkImport,
  activateBatch,
  regenerateBatch,
  cancelBatch,
  pendingBatches,
  auditLog,
} from './passwordAdminController';
import {
  validateResetBody,
  validateUserIdParam,
  validateBatchIdParam,
  validateActivateBody,
  validateAuditQuery,
} from './passwordAdminValidators';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.use(authenticateJWT, authorizeRoles(['admin']));

router.post('/reset/:userId', validateUserIdParam, validateResetBody, resetPassword);
router.post('/generate/:userId', validateUserIdParam, validateResetBody, generatePasswordForUser);
router.post('/bulk-import', upload.single('file'), verifyUploadedFiles, bulkImport);
router.post('/activate-batch', validateActivateBody, activateBatch);
router.post('/batch/:batchId/regenerate', validateBatchIdParam, regenerateBatch);
router.delete('/batch/:batchId', validateBatchIdParam, cancelBatch);
router.get('/batches', pendingBatches);
router.get('/audit', validateAuditQuery, auditLog);

export default router;
```

- [ ] **Step 2: Mount in app**

In `server/src/index.ts`, find where other routes are mounted (grep for `app.use('/api`). Add next to existing `/api/users`:

```ts
import passwordAdminRoutes from './modules/passwordAdmin/passwordAdminRoutes';
// ...
app.use('/api/admin/passwords', passwordAdminRoutes);
```

- [ ] **Step 3: Type-check and start server**

```bash
cd server && npx tsc --noEmit && npm run dev
```

Verify in another terminal that the server starts without errors. Stop dev server after confirming.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminRoutes.ts server/src/index.ts
git commit -m "feat(server): mount passwordAdmin routes at /api/admin/passwords"
```

---

## Task 13: Backend integration tests — HTTP end-to-end

**Files:**

- Create: `server/src/modules/passwordAdmin/__tests__/passwordAdminRoutes.test.ts`

- [ ] **Step 1: Write the integration test**

```ts
// server/src/modules/passwordAdmin/__tests__/passwordAdminRoutes.test.ts
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { User, PasswordAuditLog, PasswordImportBatch } from '../../../models';
import app from '../../../app';
import { signAccessToken } from '../../../utils/jwt';

let adminToken: string;
let nonAdminToken: string;

beforeAll(async () => {
  await User.deleteMany({});
  const admin = await User.create({
    id: 'admin1',
    adSoyad: 'Yönetici',
    rol: 'admin',
    isActive: true,
    tokenVersion: 0,
  });
  const student = await User.create({
    id: 's1',
    adSoyad: 'Öğrenci',
    rol: 'student',
    isActive: true,
    tokenVersion: 0,
  });
  adminToken = signAccessToken({ id: admin.id, rol: admin.rol, tokenVersion: admin.tokenVersion });
  nonAdminToken = signAccessToken({
    id: student.id,
    rol: student.rol,
    tokenVersion: student.tokenVersion,
  });
});

beforeEach(async () => {
  await User.deleteMany({ id: { $nin: ['admin1', 's1'] } });
  await PasswordAuditLog.deleteMany({});
  await PasswordImportBatch.deleteMany({});
});

describe('POST /api/admin/passwords/reset/:userId', () => {
  it('rejects non-admin users', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/reset/s1')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send({ reason: 'forgot' });
    expect(res.status).toBe(403);
  });

  it('returns a plaintext password once with no-store header', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/reset/s1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'forgot' });
    expect(res.status).toBe(200);
    expect(res.body.password).toMatch(/^[A-HJ-NP-Za-km-np-z2-9]{8}$/);
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('returns 404 for unknown user', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/reset/does-not-exist')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'forgot' });
    expect(res.status).toBe(404);
  });

  it('rejects invalid reason', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/reset/s1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'bogus' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/passwords/bulk-import', () => {
  const fixturePath = join(__dirname, '../../../test/fixtures/class-list-sample.xls');

  it('previews without writing', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/bulk-import?preview=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', fixturePath);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(444);
    const count = await User.countDocuments({ rol: 'student' });
    expect(count).toBe(1); // only the seeded s1
  });

  it('imports 444 users as inactive with credentials file', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', fixturePath);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(444);
    expect(typeof res.body.credentialsFileBase64).toBe('string');
    expect(res.body.batchId).toMatch(/^[0-9a-f-]{36}$/);
    const inactive = await User.countDocuments({
      importBatchId: res.body.batchId,
      isActive: false,
    });
    expect(inactive).toBe(444);
  });

  it('activates the batch and flips users to active', async () => {
    const imp = await request(app)
      .post('/api/admin/passwords/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', fixturePath);
    const res = await request(app)
      .post('/api/admin/passwords/activate-batch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ batchId: imp.body.batchId });
    expect(res.status).toBe(200);
    const active = await User.countDocuments({ importBatchId: imp.body.batchId, isActive: true });
    expect(active).toBe(444);
  });
});
```

- [ ] **Step 2: Run integration tests**

```bash
cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordAdminRoutes.test.ts
```

Expected: all 7 tests pass. (If `signAccessToken` has a different signature in your codebase, adjust the import/call to match `server/src/utils/jwt.ts`; consult that file.)

- [ ] **Step 3: Run full backend test suite**

```bash
cd server && npm test
```

Expected: no regressions in existing tests.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/passwordAdmin/__tests__/passwordAdminRoutes.test.ts
git commit -m "test(server): integration tests for password admin routes"
```

---

## Task 14: API client — PasswordAdminService

**Files:**

- Modify: `client/src/utils/apiEndpoints.ts`
- Modify: `client/src/utils/apiService.ts`

- [ ] **Step 1: Add endpoint constants**

In `client/src/utils/apiEndpoints.ts`, append:

```ts
export const PASSWORD_ADMIN_ENDPOINTS = {
  BULK_IMPORT: '/api/admin/passwords/bulk-import',
  BULK_IMPORT_PREVIEW: '/api/admin/passwords/bulk-import?preview=true',
  ACTIVATE_BATCH: '/api/admin/passwords/activate-batch',
  REGENERATE_BATCH: (batchId: string) => `/api/admin/passwords/batch/${batchId}/regenerate`,
  CANCEL_BATCH: (batchId: string) => `/api/admin/passwords/batch/${batchId}`,
  PENDING_BATCHES: '/api/admin/passwords/batches',
  RESET: (userId: string) => `/api/admin/passwords/reset/${userId}`,
  GENERATE: (userId: string) => `/api/admin/passwords/generate/${userId}`,
  AUDIT: '/api/admin/passwords/audit',
} as const;
```

- [ ] **Step 2: Add service class**

Append to `client/src/utils/apiService.ts` (adapt imports + axios instance to the existing pattern):

```ts
import { PASSWORD_ADMIN_ENDPOINTS } from './apiEndpoints';

export interface GeneratedPasswordResponse {
  password: string;
  userId: string;
}

export interface BulkImportPreviewResponse {
  total: number;
  warnings: string[];
  existingIds: string[];
  sample: Array<{ id: string; adSoyad: string; sinif: string; sube: string; pansiyon: boolean }>;
  classDistribution: Record<string, number>;
}

export interface BulkImportResponse {
  batchId: string;
  imported: number;
  skipped: string[];
  warnings: string[];
  credentialsFileBase64: string;
  credentialsFilename: string;
}

export interface PendingBatch {
  batchId: string;
  adminId: string;
  userIds: string[];
  totalCount: number;
  status: 'pending';
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  userId: string;
  userSnapshot: { id: string; adSoyad: string; rol: string };
  adminId: string;
  adminSnapshot: { id: string; adSoyad: string };
  action: 'bulk_import' | 'admin_generated' | 'admin_reset';
  reason: string;
  reasonNote?: string;
  batchId?: string;
  ip?: string;
  createdAt: string;
}

export class PasswordAdminService {
  static async previewBulkImport(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await axiosInstance.post<BulkImportPreviewResponse>(
      PASSWORD_ADMIN_ENDPOINTS.BULK_IMPORT_PREVIEW,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  }

  static async runBulkImport(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await axiosInstance.post<BulkImportResponse>(
      PASSWORD_ADMIN_ENDPOINTS.BULK_IMPORT,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  }

  static async activateBatch(batchId: string) {
    const { data } = await axiosInstance.post(PASSWORD_ADMIN_ENDPOINTS.ACTIVATE_BATCH, { batchId });
    return data as { activated: number };
  }

  static async regenerateBatch(batchId: string) {
    const { data } = await axiosInstance.post<BulkImportResponse>(
      PASSWORD_ADMIN_ENDPOINTS.REGENERATE_BATCH(batchId),
    );
    return data;
  }

  static async cancelBatch(batchId: string) {
    const { data } = await axiosInstance.delete<{ cancelled: number }>(
      PASSWORD_ADMIN_ENDPOINTS.CANCEL_BATCH(batchId),
    );
    return data;
  }

  static async listPendingBatches() {
    const { data } = await axiosInstance.get<{ items: PendingBatch[] }>(
      PASSWORD_ADMIN_ENDPOINTS.PENDING_BATCHES,
    );
    return data.items;
  }

  static async resetPassword(userId: string, reason: string, reasonNote?: string) {
    const { data } = await axiosInstance.post<GeneratedPasswordResponse>(
      PASSWORD_ADMIN_ENDPOINTS.RESET(userId),
      { reason, reasonNote },
    );
    return data;
  }

  static async generatePassword(userId: string, reason = 'new_user', reasonNote?: string) {
    const { data } = await axiosInstance.post<GeneratedPasswordResponse>(
      PASSWORD_ADMIN_ENDPOINTS.GENERATE(userId),
      { reason, reasonNote },
    );
    return data;
  }

  static async auditLog(params: Record<string, string | number | undefined>) {
    const { data } = await axiosInstance.get<{
      items: AuditLogItem[];
      total: number;
      page: number;
      limit: number;
    }>(PASSWORD_ADMIN_ENDPOINTS.AUDIT, { params });
    return data;
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add client/src/utils/apiEndpoints.ts client/src/utils/apiService.ts
git commit -m "feat(client): add PasswordAdminService API client"
```

---

## Task 15: PasswordRevealModal — show-once plaintext display

**Files:**

- Create: `client/src/pages/Dashboard/PasswordManagement/PasswordRevealModal.tsx`

- [ ] **Step 1: Implement the modal**

```tsx
// client/src/pages/Dashboard/PasswordManagement/PasswordRevealModal.tsx
import { useEffect, useState } from 'react';
import { AlertTriangle, Copy, Check, X } from 'lucide-react';

export interface PasswordRevealModalProps {
  password: string;
  userLabel: string;
  onClose: () => void;
}

export default function PasswordRevealModal({
  password,
  userLabel,
  onClose,
}: PasswordRevealModalProps) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    return () => {
      setCopied(false);
      setAcknowledged(false);
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h2 className="text-lg font-semibold">Şifre üretildi</h2>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{userLabel}</span> için aşağıdaki şifre sadece bir kez
              gösterilir. Şimdi kopyalayın ve güvenli bir yerde saklayın.
            </p>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4 font-mono text-xl tracking-wider text-center select-all">
          {password}
        </div>
        <button
          onClick={handleCopy}
          className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          type="button"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Kopyalandı' : 'Panoya kopyala'}
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          Şifreyi kaydettim, bu pencere kapatılabilir.
        </label>
        <button
          onClick={onClose}
          disabled={!acknowledged}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          <X size={18} />
          Kapat
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Dashboard/PasswordManagement/PasswordRevealModal.tsx
git commit -m "feat(client): add PasswordRevealModal"
```

---

## Task 16: ResetReasonModal — select reason before reset

**Files:**

- Create: `client/src/pages/Dashboard/PasswordManagement/ResetReasonModal.tsx`

- [ ] **Step 1: Implement the modal**

```tsx
// client/src/pages/Dashboard/PasswordManagement/ResetReasonModal.tsx
import { useState } from 'react';

export const RESET_REASONS: Array<{ value: string; label: string }> = [
  { value: 'forgot', label: 'Kullanıcı şifresini unuttu' },
  { value: 'security', label: 'Güvenlik gereği' },
  { value: 'new_user', label: 'Yeni kullanıcı' },
  { value: 'other', label: 'Diğer' },
];

export interface ResetReasonModalProps {
  userLabel: string;
  onConfirm: (reason: string, reasonNote?: string) => void;
  onCancel: () => void;
}

export default function ResetReasonModal({
  userLabel,
  onConfirm,
  onCancel,
}: ResetReasonModalProps) {
  const [reason, setReason] = useState('forgot');
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-2">Şifre sıfırlama sebebi</h2>
        <p className="text-sm text-gray-600 mb-4">{userLabel}</p>
        <label className="block text-sm font-medium mb-1">Sebep</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
        >
          {RESET_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {reason === 'other' && (
          <>
            <label className="block text-sm font-medium mb-1">Açıklama</label>
            <textarea
              value={note}
              maxLength={280}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
              placeholder="En fazla 280 karakter"
            />
          </>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason, reason === 'other' ? note : undefined)}
            disabled={reason === 'other' && !note.trim()}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Sıfırla
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/Dashboard/PasswordManagement/ResetReasonModal.tsx
git commit -m "feat(client): add ResetReasonModal"
```

---

## Task 17: Query hooks — useBulkImport, useUserPasswordActions, useAuditLog

**Files:**

- Create: `client/src/pages/Dashboard/PasswordManagement/hooks/useBulkImport.ts`
- Create: `client/src/pages/Dashboard/PasswordManagement/hooks/useUserPasswordActions.ts`
- Create: `client/src/pages/Dashboard/PasswordManagement/hooks/useAuditLog.ts`

- [ ] **Step 1: useBulkImport**

```ts
// client/src/pages/Dashboard/PasswordManagement/hooks/useBulkImport.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PasswordAdminService } from '../../../../utils/apiService';

export function useBulkImportPreview() {
  return useMutation({
    mutationFn: (file: File) => PasswordAdminService.previewBulkImport(file),
  });
}

export function useBulkImportCommit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => PasswordAdminService.runBulkImport(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passwordAdmin', 'pendingBatches'] }),
  });
}

export function usePendingBatches() {
  return useQuery({
    queryKey: ['passwordAdmin', 'pendingBatches'],
    queryFn: () => PasswordAdminService.listPendingBatches(),
  });
}

export function useActivateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => PasswordAdminService.activateBatch(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passwordAdmin', 'pendingBatches'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRegenerateBatch() {
  return useMutation({
    mutationFn: (batchId: string) => PasswordAdminService.regenerateBatch(batchId),
  });
}

export function useCancelBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => PasswordAdminService.cancelBatch(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passwordAdmin', 'pendingBatches'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

- [ ] **Step 2: useUserPasswordActions**

```ts
// client/src/pages/Dashboard/PasswordManagement/hooks/useUserPasswordActions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PasswordAdminService } from '../../../../utils/apiService';

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { userId: string; reason: string; reasonNote?: string }) =>
      PasswordAdminService.resetPassword(p.userId, p.reason, p.reasonNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['passwordAdmin', 'audit'] });
    },
  });
}

export function useGeneratePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { userId: string; reason?: string; reasonNote?: string }) =>
      PasswordAdminService.generatePassword(p.userId, p.reason, p.reasonNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['passwordAdmin', 'audit'] });
    },
  });
}
```

- [ ] **Step 3: useAuditLog**

```ts
// client/src/pages/Dashboard/PasswordManagement/hooks/useAuditLog.ts
import { useQuery } from '@tanstack/react-query';
import { PasswordAdminService } from '../../../../utils/apiService';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  userId?: string;
  adminId?: string;
  action?: string;
  reason?: string;
  from?: string;
  to?: string;
}

export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['passwordAdmin', 'audit', filters],
    queryFn: () =>
      PasswordAdminService.auditLog(filters as Record<string, string | number | undefined>),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Dashboard/PasswordManagement/hooks
git commit -m "feat(client): add TanStack Query hooks for password admin"
```

---

## Task 18: BulkImportTab — upload, preview, import, download, pending batches

**Files:**

- Create: `client/src/pages/Dashboard/PasswordManagement/BulkImportTab.tsx`
- Create: `client/src/pages/Dashboard/PasswordManagement/PendingBatchesList.tsx`

- [ ] **Step 1: PendingBatchesList component**

```tsx
// client/src/pages/Dashboard/PasswordManagement/PendingBatchesList.tsx
import {
  usePendingBatches,
  useActivateBatch,
  useRegenerateBatch,
  useCancelBatch,
} from './hooks/useBulkImport';
import { downloadBase64File } from './downloadBase64';

export default function PendingBatchesList({
  onRegenerated,
}: {
  onRegenerated?: (filename: string) => void;
}) {
  const { data: batches = [], isLoading } = usePendingBatches();
  const activate = useActivateBatch();
  const regen = useRegenerateBatch();
  const cancel = useCancelBatch();

  if (isLoading) return <p>Yükleniyor...</p>;
  if (batches.length === 0) return <p className="text-gray-500">Bekleyen batch yok.</p>;

  return (
    <div className="space-y-3">
      {batches.map((b) => (
        <div key={b.batchId} className="border border-amber-300 bg-amber-50 rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="font-mono text-xs text-gray-600">{b.batchId}</p>
              <p className="text-sm">
                <span className="font-medium">{b.totalCount}</span> kullanıcı,{' '}
                {new Date(b.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => activate.mutate(b.batchId)}
              disabled={activate.isPending}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              Aktif Et
            </button>
            <button
              onClick={() =>
                regen.mutate(b.batchId, {
                  onSuccess: (res) => {
                    downloadBase64File(res.credentialsFileBase64, res.credentialsFilename);
                    onRegenerated?.(res.credentialsFilename);
                  },
                })
              }
              disabled={regen.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Şifreleri Yeniden Üret
            </button>
            <button
              onClick={() => {
                if (confirm('Bu batch ve içindeki tüm kullanıcılar silinecek. Emin misiniz?')) {
                  cancel.mutate(b.batchId);
                }
              }}
              disabled={cancel.isPending}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              İptal Et
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Shared download helper**

```ts
// client/src/pages/Dashboard/PasswordManagement/downloadBase64.ts
export function downloadBase64File(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: BulkImportTab**

```tsx
// client/src/pages/Dashboard/PasswordManagement/BulkImportTab.tsx
import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useBulkImportPreview, useBulkImportCommit } from './hooks/useBulkImport';
import PendingBatchesList from './PendingBatchesList';
import { downloadBase64File } from './downloadBase64';
import type { BulkImportPreviewResponse } from '../../../utils/apiService';

export default function BulkImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const previewMut = useBulkImportPreview();
  const commitMut = useBulkImportCommit();

  const handlePreview = () => {
    if (!file) return;
    previewMut.mutate(file, { onSuccess: setPreview });
  };

  const handleCommit = () => {
    if (!file) return;
    commitMut.mutate(file, {
      onSuccess: (res) => {
        downloadBase64File(res.credentialsFileBase64, res.credentialsFilename);
        setFile(null);
        setPreview(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border rounded p-4">
        <h3 className="text-lg font-semibold mb-3">Tofaş Sınıf Listesi Yükle</h3>
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
            <Upload size={18} />
            <span>XLS Seç</span>
            <input
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
              }}
            />
          </label>
          {file && <span className="text-sm text-gray-700">{file.name}</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={!file || previewMut.isPending}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50"
          >
            {previewMut.isPending ? 'Yükleniyor...' : 'Önizle'}
          </button>
          {preview && (
            <button
              onClick={handleCommit}
              disabled={commitMut.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {commitMut.isPending ? 'İçe aktarılıyor...' : 'İçe Aktar ve Şifre Üret'}
            </button>
          )}
        </div>
      </section>

      {preview && (
        <section className="bg-white border rounded p-4">
          <h3 className="text-lg font-semibold mb-2">Önizleme</h3>
          <p className="text-sm">
            Toplam: <span className="font-semibold">{preview.total}</span>, Mevcut ID:{' '}
            <span className="font-semibold">{preview.existingIds.length}</span>, Uyarı:{' '}
            <span className="font-semibold">{preview.warnings.length}</span>
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-sm">
            {Object.entries(preview.classDistribution).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded p-2 text-center">
                <div className="font-semibold">{k}</div>
                <div className="text-xs text-gray-600">{v} öğrenci</div>
              </div>
            ))}
          </div>
          {preview.warnings.length > 0 && (
            <details className="mt-3">
              <summary className="text-sm text-amber-700 cursor-pointer">Uyarıları göster</summary>
              <ul className="text-xs mt-2 list-disc list-inside">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <section className="bg-white border rounded p-4">
        <h3 className="text-lg font-semibold mb-3">Bekleyen Batch'ler</h3>
        <PendingBatchesList />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Type-check and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/Dashboard/PasswordManagement/BulkImportTab.tsx client/src/pages/Dashboard/PasswordManagement/PendingBatchesList.tsx client/src/pages/Dashboard/PasswordManagement/downloadBase64.ts
git commit -m "feat(client): BulkImportTab with preview, commit, download, pending list"
```

---

## Task 19: UsersTab — list + filters + per-row actions

**Files:**

- Create: `client/src/pages/Dashboard/PasswordManagement/UsersTab.tsx`

- [ ] **Step 1: Implement UsersTab**

Assumes there's an existing `UserService.getUsers(params)` returning `{ id, adSoyad, rol, sinif, sube, passwordLastSetAt }[]` — confirm shape in `client/src/utils/apiService.ts` before using. If the endpoint does not expose `passwordLastSetAt`, add it to the select list in `server/src/routes/User.ts:72` (`.select('-sifre -tckn')`) — the `passwordLastSetAt` field will be included since it isn't explicitly excluded.

```tsx
// client/src/pages/Dashboard/PasswordManagement/UsersTab.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../../utils/apiService';
import PasswordRevealModal from './PasswordRevealModal';
import ResetReasonModal from './ResetReasonModal';
import { useResetPassword, useGeneratePassword } from './hooks/useUserPasswordActions';

interface UserRow {
  id: string;
  adSoyad: string;
  rol: string;
  sinif?: string;
  sube?: string;
  passwordLastSetAt?: string;
}

export default function UsersTab() {
  const { data: users = [] } = useQuery<UserRow[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await UserService.getUsers();
      return data as UserRow[];
    },
  });

  const [rolFilter, setRolFilter] = useState<string>('');
  const [hasPassword, setHasPassword] = useState<'all' | 'yes' | 'no'>('all');
  const [search, setSearch] = useState('');

  const [pendingUser, setPendingUser] = useState<UserRow | null>(null);
  const [pendingMode, setPendingMode] = useState<'reset' | 'generate' | null>(null);
  const [revealed, setRevealed] = useState<{ password: string; label: string } | null>(null);

  const resetMut = useResetPassword();
  const genMut = useGeneratePassword();

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (rolFilter && u.rol !== rolFilter) return false;
        if (hasPassword === 'yes' && !u.passwordLastSetAt) return false;
        if (hasPassword === 'no' && u.passwordLastSetAt) return false;
        if (
          search &&
          !u.adSoyad.toLowerCase().includes(search.toLowerCase()) &&
          !u.id.includes(search)
        )
          return false;
        return true;
      }),
    [users, rolFilter, hasPassword, search],
  );

  const handleConfirm = async (reason: string, reasonNote?: string) => {
    if (!pendingUser || !pendingMode) return;
    const mut = pendingMode === 'reset' ? resetMut : genMut;
    mut.mutate(
      { userId: pendingUser.id, reason, reasonNote },
      {
        onSuccess: (res) => {
          setRevealed({
            password: res.password,
            label: `${pendingUser.adSoyad} (${pendingUser.id})`,
          });
          setPendingUser(null);
          setPendingMode(null);
        },
        onError: (err: unknown) => {
          alert(`Hata: ${err instanceof Error ? err.message : 'Bilinmeyen'}`);
          setPendingUser(null);
          setPendingMode(null);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <input
          placeholder="İsim veya ID ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 border rounded"
        />
        <select
          value={rolFilter}
          onChange={(e) => setRolFilter(e.target.value)}
          className="px-3 py-1.5 border rounded"
        >
          <option value="">Tüm roller</option>
          <option value="student">Öğrenci</option>
          <option value="teacher">Öğretmen</option>
          <option value="parent">Veli</option>
          <option value="admin">Yönetici</option>
          <option value="hizmetli">Hizmetli</option>
        </select>
        <select
          value={hasPassword}
          onChange={(e) => setHasPassword(e.target.value as typeof hasPassword)}
          className="px-3 py-1.5 border rounded"
        >
          <option value="all">Şifre durumu: hepsi</option>
          <option value="yes">Şifresi var</option>
          <option value="no">Şifresi yok</option>
        </select>
        <span className="text-sm text-gray-600">{filtered.length} kayıt</span>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 border-b">ID</th>
            <th className="text-left px-3 py-2 border-b">Ad Soyad</th>
            <th className="text-left px-3 py-2 border-b">Rol</th>
            <th className="text-left px-3 py-2 border-b">Sınıf</th>
            <th className="text-left px-3 py-2 border-b">Şifre Durumu</th>
            <th className="text-left px-3 py-2 border-b">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 500).map((u) => (
            <tr key={u.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2 font-mono text-xs">{u.id}</td>
              <td className="px-3 py-2">{u.adSoyad}</td>
              <td className="px-3 py-2">{u.rol}</td>
              <td className="px-3 py-2">{u.sinif ? `${u.sinif}${u.sube ?? ''}` : '-'}</td>
              <td className="px-3 py-2">
                {u.passwordLastSetAt ? (
                  <span className="text-green-700">
                    ✓ {new Date(u.passwordLastSetAt).toLocaleDateString('tr-TR')}
                  </span>
                ) : (
                  <span className="text-amber-700">Yok</span>
                )}
              </td>
              <td className="px-3 py-2">
                {u.passwordLastSetAt ? (
                  <button
                    onClick={() => {
                      setPendingUser(u);
                      setPendingMode('reset');
                    }}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  >
                    Şifre Sıfırla
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPendingUser(u);
                      setPendingMode('generate');
                    }}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    Yeni Şifre Üret
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > 500 && (
        <p className="text-xs text-gray-500">İlk 500 kayıt gösteriliyor — filtreleri daraltın.</p>
      )}

      {pendingUser && pendingMode && (
        <ResetReasonModal
          userLabel={`${pendingUser.adSoyad} (${pendingUser.id})`}
          onConfirm={handleConfirm}
          onCancel={() => {
            setPendingUser(null);
            setPendingMode(null);
          }}
        />
      )}
      {revealed && (
        <PasswordRevealModal
          password={revealed.password}
          userLabel={revealed.label}
          onClose={() => setRevealed(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/Dashboard/PasswordManagement/UsersTab.tsx
git commit -m "feat(client): UsersTab with filter, reset, and generate flows"
```

---

## Task 20: AuditLogTab + PasswordManagementPage container

**Files:**

- Create: `client/src/pages/Dashboard/PasswordManagement/AuditLogTab.tsx`
- Create: `client/src/pages/Dashboard/PasswordManagement/PasswordManagementPage.tsx`

- [ ] **Step 1: AuditLogTab**

```tsx
// client/src/pages/Dashboard/PasswordManagement/AuditLogTab.tsx
import { useState } from 'react';
import { useAuditLog } from './hooks/useAuditLog';

export default function AuditLogTab() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const { data, isLoading } = useAuditLog({
    page,
    limit: 20,
    action: action || undefined,
    reason: reason || undefined,
  });

  if (isLoading) return <p>Yükleniyor...</p>;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-1.5 border rounded"
        >
          <option value="">Tüm aksiyonlar</option>
          <option value="bulk_import">Toplu İçe Aktar</option>
          <option value="admin_generated">Admin Üretimi</option>
          <option value="admin_reset">Admin Reset</option>
        </select>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="px-3 py-1.5 border rounded"
        >
          <option value="">Tüm sebepler</option>
          <option value="forgot">Unuttu</option>
          <option value="security">Güvenlik</option>
          <option value="new_user">Yeni kullanıcı</option>
          <option value="bulk_import">Toplu İçe Aktar</option>
          <option value="other">Diğer</option>
        </select>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 border-b">Zaman</th>
            <th className="text-left px-3 py-2 border-b">Kullanıcı</th>
            <th className="text-left px-3 py-2 border-b">Admin</th>
            <th className="text-left px-3 py-2 border-b">Aksiyon</th>
            <th className="text-left px-3 py-2 border-b">Sebep</th>
            <th className="text-left px-3 py-2 border-b">Not</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it) => (
            <tr key={it._id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2">{new Date(it.createdAt).toLocaleString('tr-TR')}</td>
              <td className="px-3 py-2">
                {it.userSnapshot.adSoyad}{' '}
                <span className="text-xs text-gray-500">({it.userId})</span>
              </td>
              <td className="px-3 py-2">{it.adminSnapshot.adSoyad}</td>
              <td className="px-3 py-2">{it.action}</td>
              <td className="px-3 py-2">{it.reason}</td>
              <td className="px-3 py-2">{it.reasonNote ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Önceki
        </button>
        <span className="text-sm">
          Sayfa {page} / {Math.ceil(data.total / data.limit)}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page * data.limit >= data.total}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: PasswordManagementPage**

```tsx
// client/src/pages/Dashboard/PasswordManagement/PasswordManagementPage.tsx
import { useState } from 'react';
import BulkImportTab from './BulkImportTab';
import UsersTab from './UsersTab';
import AuditLogTab from './AuditLogTab';

type Tab = 'bulk' | 'users' | 'audit';

export default function PasswordManagementPage() {
  const [tab, setTab] = useState<Tab>('bulk');
  const tabClass = (t: Tab) =>
    `px-4 py-2 border-b-2 ${tab === t ? 'border-red-600 text-red-600 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'}`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Şifre Yönetimi</h1>
      <div className="border-b mb-4">
        <button onClick={() => setTab('bulk')} className={tabClass('bulk')}>
          Toplu İçe Aktar
        </button>
        <button onClick={() => setTab('users')} className={tabClass('users')}>
          Kullanıcılar
        </button>
        <button onClick={() => setTab('audit')} className={tabClass('audit')}>
          Geçmiş
        </button>
      </div>
      {tab === 'bulk' && <BulkImportTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'audit' && <AuditLogTab />}
    </div>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/Dashboard/PasswordManagement/AuditLogTab.tsx client/src/pages/Dashboard/PasswordManagement/PasswordManagementPage.tsx
git commit -m "feat(client): AuditLogTab and PasswordManagementPage container"
```

---

## Task 21: Mount route and add sidebar menu item

**Files:**

- Modify: `client/src/App.tsx`
- Modify: admin sidebar component (locate via `grep` for `yonetici` paths)

- [ ] **Step 1: Locate App.tsx route registration**

```bash
grep -n "yonetici" client/src/App.tsx | head -20
```

- [ ] **Step 2: Add route lazily**

In `client/src/App.tsx`, near existing admin routes, add:

```tsx
const PasswordManagementPage = lazy(
  () => import('./pages/Dashboard/PasswordManagement/PasswordManagementPage'),
);
// ... inside <Routes>
<Route
  path="/yonetici/sifre-yonetimi"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <PasswordManagementPage />
    </ProtectedRoute>
  }
/>;
```

Match the exact component names used elsewhere (`ProtectedRoute`, role prop) — do not invent new wrappers.

- [ ] **Step 3: Find and update admin sidebar**

```bash
grep -rn "Toplu Kullanıcı İçe Aktar\|BulkUserImport" client/src | head
```

In that sidebar file, replace the "Toplu İçe Aktar" entry with:

```tsx
{ to: '/yonetici/sifre-yonetimi', label: 'Şifre Yönetimi', icon: <KeyRound size={18} /> },
```

(Use `KeyRound` from `lucide-react`. Remove the old import for the bulk import item.)

- [ ] **Step 4: Start dev, open page, verify routing**

```bash
npm run dev
```

Navigate to `http://localhost:5173/yonetici/sifre-yonetimi`, confirm page renders, all three tabs switch. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/<sidebar-path>
git commit -m "feat(client): route /yonetici/sifre-yonetimi and sidebar menu"
```

---

## Task 22: Integrate "Şifreyi otomatik üret" into AddUserModal

**Files:**

- Modify: `client/src/pages/Dashboard/AddUserModal.tsx`

- [ ] **Step 1: Read the existing form**

```bash
wc -l client/src/pages/Dashboard/AddUserModal.tsx
```

Open the file. Find where the password field is handled.

- [ ] **Step 2: Add checkbox and behavior**

Add state `const [autoGen, setAutoGen] = useState(true)`. Hide the manual password field when `autoGen` is true. In the submit handler, after successful `UserService.createUser(...)`, if `autoGen`:

```tsx
const gen = await PasswordAdminService.generatePassword(newUser.id, 'new_user');
setRevealed({ password: gen.password, label: `${newUser.adSoyad} (${newUser.id})` });
```

Render `<PasswordRevealModal />` conditionally on `revealed`.

Checkbox JSX:

```tsx
<label className="flex items-center gap-2 mb-3">
  <input type="checkbox" checked={autoGen} onChange={(e) => setAutoGen(e.target.checked)} />
  <span>Şifreyi otomatik üret</span>
</label>
```

When `autoGen === true`, don't send a `sifre` field to the create endpoint (let the backend accept a user without `sifre` — already supported since `sifre` is optional in the User schema).

- [ ] **Step 3: Manual-end browser verification**

Start dev server, open admin panel, create a new test user with checkbox on. Confirm the password reveal modal appears. Create another user with checkbox off and confirm manual flow still works.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Dashboard/AddUserModal.tsx
git commit -m "feat(client): auto-generate password option in AddUserModal"
```

---

## Task 23: Remove old bulk-import flow

**Files:**

- Delete: `client/src/pages/Dashboard/BulkUserImportSection.tsx`
- Modify: `client/src/utils/apiService.ts` (remove `UserService.bulkImportUsers`)
- Modify: `server/src/routes/User.ts` (remove `POST /bulk-import` handler and imports)
- Modify: `server/src/services/bulkImportService.ts` (remove `parseUserFile`, `validateUserRows`, `bulkCreateUsers`)

- [ ] **Step 1: Find all references**

```bash
grep -rn "BulkUserImportSection\|bulkImportUsers\|parseUserFile\|validateUserRows\|bulkCreateUsers" client/src server/src
```

- [ ] **Step 2: Delete the client page**

```bash
rm client/src/pages/Dashboard/BulkUserImportSection.tsx
```

- [ ] **Step 3: Remove `UserService.bulkImportUsers`**

In `client/src/utils/apiService.ts`, delete the `bulkImportUsers` static method (around line 142, confirmed earlier). Remove any imports that become dead.

- [ ] **Step 4: Remove backend route**

In `server/src/routes/User.ts`, delete the `router.post('/bulk-import', ...)` block (around lines 367-430 based on inspection). Also remove:

```ts
import {
  parseUserFile,
  validateUserRows,
  bulkCreateUsers,
  parseParentChildFile,
  bulkLinkParentChild,
} from '../services/bulkImportService';
```

Replace with an import that only keeps the parent-child functions:

```ts
import { parseParentChildFile, bulkLinkParentChild } from '../services/bulkImportService';
```

- [ ] **Step 5: Trim `bulkImportService.ts`**

In `server/src/services/bulkImportService.ts`, delete the three user-import exports (`parseUserFile`, `validateUserRows`, `bulkCreateUsers`) and any helpers they uniquely use (`VALID_ROLES`, `VALID_SINIF`, `VALID_SUBE` if only used by these). Keep:

- `parseParentChildFile`
- `bulkLinkParentChild`
- their shared types (`ParentChildLink`, `BulkLinkResult`)

Also remove the `import bcrypt from 'bcryptjs'` and `import { User } from '../models'` if they're no longer used (check usage after deletion).

- [ ] **Step 6: Verify compilation and tests**

```bash
cd client && npx tsc --noEmit
cd ../server && npx tsc --noEmit && npm test
```

Expected: no type errors, all tests still pass (some tests may reference deleted exports — update them; if a test file was specifically for the deleted flow, delete it).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy flat-table bulk import flow"
```

---

## Task 24: E2E Playwright test — full password flow

**Files:**

- Create: `client/tests/e2e/password-management.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// client/tests/e2e/password-management.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURE = path.resolve(__dirname, '../../../server/src/test/fixtures/class-list-sample.xls');

test.describe('Password Management — bulk import', () => {
  test.beforeEach(async ({ page }) => {
    // Precondition: admin user is seeded in dev DB.
    await page.goto('/giris');
    await page.getByLabel(/Kimlik|ID/i).fill(process.env.E2E_ADMIN_ID ?? 'admin1');
    await page.getByLabel(/Şifre/i).fill(process.env.E2E_ADMIN_PW ?? 'admin123');
    await page.getByRole('button', { name: /giriş/i }).click();
    await page.waitForURL(/yonetici/);
  });

  test('upload XLS → preview → import → download credentials → activate', async ({ page }) => {
    await page.goto('/yonetici/sifre-yonetimi');
    await expect(page.getByText('Şifre Yönetimi')).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('XLS Seç').click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(FIXTURE);

    await page.getByRole('button', { name: 'Önizle' }).click();
    await expect(page.getByText(/Toplam:.*444/)).toBeVisible({ timeout: 10_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'İçe Aktar ve Şifre Üret' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/credentials-\d{8}-[0-9a-f-]+\.xlsx/);

    await expect(page.getByText(/Bekleyen Batch/)).toBeVisible();
    await page.getByRole('button', { name: 'Aktif Et' }).first().click();
    await expect(page.getByText('Bekleyen batch yok.')).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Run the test against a fresh dev DB**

```bash
# In one terminal, start services:
docker-compose up -d
cd server && npm run seed:users   # ensures admin1 exists
npm run dev

# In another:
cd client && npx playwright test password-management.spec.ts
```

Expected: test passes. If admin seed creds differ, set `E2E_ADMIN_ID` / `E2E_ADMIN_PW` env vars.

- [ ] **Step 3: Commit**

```bash
git add client/tests/e2e/password-management.spec.ts
git commit -m "test(e2e): Playwright spec for password management bulk import"
```

---

## Task 25: Run the real 444-student import (production data)

This task is not an automated task — it's the production rollout step. Do not automate. Document it here so the engineer knows it's the final step.

- [ ] **Step 1: Backup the database**

```bash
mongodump --uri="$MONGODB_URI" --out=./backups/pre-password-import-$(date +%Y%m%d)
```

- [ ] **Step 2: Log in as admin on production**

Navigate to `/yonetici/sifre-yonetimi`.

- [ ] **Step 3: Upload `öğrenci tüm liste 20042026.XLS`**

- Click "Önizle", verify 444 students, 16 class distribution matches expectation, no unexpected existing-ID collisions.
- Click "İçe Aktar ve Şifre Üret".
- **Immediately save the downloaded `credentials-<date>-<batchId>.xlsx`** to a secure location. This file contains 444 plaintext passwords and cannot be regenerated (would produce different passwords).

- [ ] **Step 4: Distribute credentials**

Print or hand out per-class pages from the credentials file. Follow school's existing process.

- [ ] **Step 5: Activate the batch**

Click "Aktif Et" next to the pending batch.

- [ ] **Step 6: Sanity-check**

Log in as one test student using the password from the file. Confirm login succeeds.

- [ ] **Step 7: Delete the credentials file once distribution is complete**

Remove from admin machine. If password-reset is later needed for a user, use the "Kullanıcılar" tab → "Şifre Sıfırla".

---

## Self-Review Checklist

**Spec coverage:** Every spec section has a task:

- ✅ Admin page with 3 tabs → Tasks 18, 19, 20
- ✅ Tekil kullanıcı oluşturma akışı → Task 22
- ✅ Pending batch yönetimi (regenerate/cancel) → Task 9, Task 18 PendingBatchesList
- ✅ PasswordAuditLog model → Task 1
- ✅ PasswordImportBatch model → Task 2
- ✅ User model additions → Task 3
- ✅ passwordGenerator with rejection sampling → Task 4
- ✅ classListParser → Task 5
- ✅ credentialsExporter → Task 6
- ✅ All 8 routes + `authorizeRoles(['admin'])` → Task 12
- ✅ Plaintext password guards (audit, no-store headers) → Tasks 7, 11
- ✅ tokenVersion bump on reset → Task 8
- ✅ Show-once UI modal with unmount cleanup → Task 15
- ✅ Reason dropdown → Tasks 16, 18
- ✅ Old bulk-import flow removed (partial service retained) → Task 23

**Placeholder scan:** No "TBD", "TODO", or "implement later" left in the plan.

**Type consistency:**

- `ParsedStudentRow` fields match between Task 5 (parser) and Task 9 (service).
- `CredentialsRow` used in Tasks 6 and 9 has identical shape.
- `AdminContext` defined in Task 8, reused in Task 9, 11.
- Service error `code` values (`USER_NOT_FOUND`, `ALREADY_HAS_PASSWORD`, `BATCH_NOT_FOUND`, `BATCH_NOT_PENDING`) thrown in Tasks 8-9 are mapped in Task 11 controller.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-20-password-management-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
