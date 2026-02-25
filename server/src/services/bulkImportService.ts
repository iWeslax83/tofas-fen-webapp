import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { User } from '../models';

interface UserRow {
  id: string;
  adSoyad: string;
  rol: string;
  sinif?: string;
  sube?: string;
  sifre: string;
  parentId?: string;
  oda?: string;
  pansiyon?: boolean;
  tckn?: string;
}

interface ValidationResult {
  valid: UserRow[];
  errors: { row: number; field: string; message: string }[];
  duplicates: string[];
}

interface ParentChildLink {
  parentId: string;
  childId: string;
}

interface BulkLinkResult {
  linked: number;
  errors: { parentId: string; childId: string; message: string }[];
}

const VALID_ROLES = ['student', 'teacher', 'parent', 'admin', 'hizmetli'];
const VALID_SINIF = ['9', '10', '11', '12'];
const VALID_SUBE = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Parse an Excel or CSV file buffer into user rows.
 */
export function parseUserFile(buffer: Buffer, filename: string): UserRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  return jsonData.map((row) => ({
    id: String(row.id || row.ID || '').trim(),
    adSoyad: String(row.adSoyad || row['Ad Soyad'] || row.adsoyad || '').trim(),
    rol: String(row.rol || row.Rol || row.role || '').trim().toLowerCase(),
    sinif: row.sinif || row.Sinif || row.sinif ? String(row.sinif || row.Sinif).trim() : undefined,
    sube: row.sube || row.Sube ? String(row.sube || row.Sube).trim() : undefined,
    sifre: String(row.sifre || row.Sifre || row.password || '').trim(),
    parentId: row.parentId || row.ParentId ? String(row.parentId || row.ParentId).trim() : undefined,
    oda: row.oda || row.Oda ? String(row.oda || row.Oda).trim() : undefined,
    pansiyon: row.pansiyon === true || row.pansiyon === 'true' || row.pansiyon === '1' || row.Pansiyon === true,
    tckn: row.tckn || row.TCKN ? String(row.tckn || row.TCKN).trim() : undefined,
  }));
}

/**
 * Validate parsed user rows.
 */
export function validateUserRows(rows: UserRow[]): ValidationResult {
  const valid: UserRow[] = [];
  const errors: { row: number; field: string; message: string }[] = [];
  const duplicates: string[] = [];
  const seenIds = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header row + 0-index
    let hasError = false;

    if (!row.id) {
      errors.push({ row: rowNum, field: 'id', message: 'ID zorunludur' });
      hasError = true;
    } else if (seenIds.has(row.id)) {
      duplicates.push(row.id);
      errors.push({ row: rowNum, field: 'id', message: `Tekrarlanan ID: ${row.id}` });
      hasError = true;
    } else {
      seenIds.add(row.id);
    }

    if (!row.adSoyad) {
      errors.push({ row: rowNum, field: 'adSoyad', message: 'Ad Soyad zorunludur' });
      hasError = true;
    }

    if (!row.rol || !VALID_ROLES.includes(row.rol)) {
      errors.push({ row: rowNum, field: 'rol', message: `Geçersiz rol: ${row.rol}. Geçerli: ${VALID_ROLES.join(', ')}` });
      hasError = true;
    }

    if (!row.sifre || row.sifre.length < 4) {
      errors.push({ row: rowNum, field: 'sifre', message: 'Şifre en az 4 karakter olmalıdır' });
      hasError = true;
    }

    if (row.rol === 'student') {
      if (row.sinif && !VALID_SINIF.includes(row.sinif)) {
        errors.push({ row: rowNum, field: 'sinif', message: `Geçersiz sınıf: ${row.sinif}` });
        hasError = true;
      }
      if (row.sube && !VALID_SUBE.includes(row.sube)) {
        errors.push({ row: rowNum, field: 'sube', message: `Geçersiz şube: ${row.sube}` });
        hasError = true;
      }
    }

    if (!hasError) {
      valid.push(row);
    }
  });

  return { valid, errors, duplicates };
}

/**
 * Bulk create users. Uses insertMany with ordered:false for partial success.
 */
export async function bulkCreateUsers(rows: UserRow[]): Promise<{
  imported: number;
  failed: number;
  duplicates: string[];
  errors: { id: string; message: string }[];
}> {
  const errors: { id: string; message: string }[] = [];
  const duplicates: string[] = [];

  // Check for existing users in one batch query
  const allIds = rows.map(r => r.id);
  const existingUsers = await User.find({ id: { $in: allIds } }).select('id').lean() as any[];
  const existingIds = new Set(existingUsers.map((u: any) => u.id));

  const newRows = rows.filter(row => {
    if (existingIds.has(row.id)) {
      duplicates.push(row.id);
      return false;
    }
    return true;
  });

  if (newRows.length === 0) {
    return { imported: 0, failed: 0, duplicates, errors };
  }

  // Hash all passwords in parallel
  const docs = await Promise.all(newRows.map(async (row) => {
    const hashedPassword = await bcrypt.hash(row.sifre, 10);
    return {
      id: row.id,
      adSoyad: row.adSoyad,
      rol: row.rol,
      sifre: hashedPassword,
      sinif: row.sinif || undefined,
      sube: row.sube || undefined,
      oda: row.oda || undefined,
      pansiyon: row.pansiyon || false,
      parentId: row.parentId || undefined,
      tckn: row.tckn || undefined,
      isActive: true,
      childId: [],
    };
  }));

  let imported = 0;
  try {
    const result = await User.insertMany(docs, { ordered: false });
    imported = result.length;
  } catch (err: any) {
    // With ordered: false, insertMany throws but some docs may have been inserted
    if (err.insertedDocs) {
      imported = err.insertedDocs.length;
    }
    if (err.writeErrors) {
      for (const writeErr of err.writeErrors) {
        const failedDoc = docs[writeErr.index];
        errors.push({
          id: failedDoc?.id || `index-${writeErr.index}`,
          message: writeErr.errmsg || 'Ekleme hatası',
        });
      }
    }
  }

  return {
    imported,
    failed: newRows.length - imported,
    duplicates,
    errors,
  };
}

/**
 * Parse a parent-child CSV/Excel file into link pairs.
 */
export function parseParentChildFile(buffer: Buffer, filename: string): ParentChildLink[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  return jsonData
    .map((row) => ({
      parentId: String(row.parentId || row.ParentId || row['Parent ID'] || '').trim(),
      childId: String(row.childId || row.ChildId || row['Child ID'] || '').trim(),
    }))
    .filter(link => link.parentId && link.childId);
}

/**
 * Bulk link parents and children. Updates both sides of the relationship.
 */
export async function bulkLinkParentChild(links: ParentChildLink[]): Promise<BulkLinkResult> {
  const errors: { parentId: string; childId: string; message: string }[] = [];

  // Get all unique parent and child IDs
  const parentIds = [...new Set(links.map(l => l.parentId))];
  const childIds = [...new Set(links.map(l => l.childId))];

  // Batch verify existence
  const parents = await User.find({ id: { $in: parentIds }, rol: 'parent' }).select('id childId').lean() as any[];
  const children = await User.find({ id: { $in: childIds }, rol: 'student' }).select('id parentId').lean() as any[];

  const parentMap = new Map(parents.map((p: any) => [p.id, p.childId || []]));
  const childSet = new Set(children.map((c: any) => c.id));

  // Group links by parent for efficient bulkWrite
  const parentUpdates = new Map<string, string[]>();
  const childUpdates = new Map<string, string>(); // childId -> parentId

  let linked = 0;

  for (const link of links) {
    if (!parentMap.has(link.parentId)) {
      errors.push({ ...link, message: `Veli bulunamadı: ${link.parentId}` });
      continue;
    }
    if (!childSet.has(link.childId)) {
      errors.push({ ...link, message: `Öğrenci bulunamadı: ${link.childId}` });
      continue;
    }

    // Accumulate children for each parent
    if (!parentUpdates.has(link.parentId)) {
      parentUpdates.set(link.parentId, [...(parentMap.get(link.parentId) || [])]);
    }
    const currentChildren = parentUpdates.get(link.parentId)!;
    if (!currentChildren.includes(link.childId)) {
      currentChildren.push(link.childId);
    }

    childUpdates.set(link.childId, link.parentId);
    linked++;
  }

  // Execute bulkWrite for parents
  if (parentUpdates.size > 0) {
    const parentOps = Array.from(parentUpdates.entries()).map(([parentId, childIdArr]) => ({
      updateOne: {
        filter: { id: parentId },
        update: { $set: { childId: childIdArr } },
      },
    }));
    await User.bulkWrite(parentOps);
  }

  // Execute bulkWrite for children
  if (childUpdates.size > 0) {
    const childOps = Array.from(childUpdates.entries()).map(([childId, parentId]) => ({
      updateOne: {
        filter: { id: childId },
        update: { $set: { parentId } },
      },
    }));
    await User.bulkWrite(childOps);
  }

  return { linked, errors };
}
