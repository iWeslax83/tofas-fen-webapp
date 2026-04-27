import type { Request, Response } from 'express';
import { getStudentOverview } from './dashboardService';
import logger from '../../utils/logger';

interface AuthUser {
  userId: string;
  role: 'student' | 'parent' | 'teacher' | 'admin' | 'hizmetli';
  sinif?: string;
}

export async function overview(req: Request, res: Response): Promise<void> {
  const auth = (req as Request & { user?: AuthUser }).user;
  if (!auth) {
    res.status(401).json({ error: 'Yetkisiz' });
    return;
  }

  // Only students get the full hero payload today; teacher/admin/parent
  // dashboards shape comes in PR-10. Return the same envelope so the
  // client can branch on `role`.
  if (auth.role !== 'student') {
    res.json({ role: auth.role, overview: null });
    return;
  }

  try {
    const overviewData = await getStudentOverview(auth.userId, auth.sinif);
    res.json({ role: auth.role, overview: overviewData });
  } catch (err) {
    logger.error('dashboard.overview failed', { userId: auth.userId, err });
    res.status(500).json({ error: 'Pano verileri alınamadı' });
  }
}
