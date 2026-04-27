import * as XLSX from 'xlsx';
import { User } from '../models';

interface ParentChildLink {
  parentId: string;
  childId: string;
}

interface BulkLinkResult {
  linked: number;
  errors: { parentId: string; childId: string; message: string }[];
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
    .filter((link) => link.parentId && link.childId);
}

/**
 * Bulk link parents and children. Updates both sides of the relationship.
 */
export async function bulkLinkParentChild(links: ParentChildLink[]): Promise<BulkLinkResult> {
  const errors: { parentId: string; childId: string; message: string }[] = [];

  // Get all unique parent and child IDs
  const parentIds = [...new Set(links.map((l) => l.parentId))];
  const childIds = [...new Set(links.map((l) => l.childId))];

  // Batch verify existence
  const parents = (await User.find({ id: { $in: parentIds }, rol: 'parent' })
    .select('id childId')
    .lean()) as any[];
  const children = (await User.find({ id: { $in: childIds }, rol: 'student' })
    .select('id parentId')
    .lean()) as any[];

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
