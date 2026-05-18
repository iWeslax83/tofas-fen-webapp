import type { Request, Response } from 'express';
import {
  getStudentOverview,
  getAdminOverview,
  getTeacherOverview,
  getParentOverview,
} from './dashboardService';
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

  // Each role gets its own hero payload; the client branches on `role`.
  // `hizmetli` (support staff) has no dashboard data — return a null
  // envelope so the client renders the static notice only.
  try {
    let overviewData;
    switch (auth.role) {
      case 'student':
        overviewData = await getStudentOverview(auth.userId, auth.sinif);
        break;
      case 'admin':
        overviewData = await getAdminOverview(auth.userId);
        break;
      case 'teacher':
        overviewData = await getTeacherOverview(auth.userId);
        break;
      case 'parent':
        overviewData = await getParentOverview(auth.userId);
        break;
      default:
        overviewData = null;
    }
    res.json({ role: auth.role, overview: overviewData });
  } catch (err) {
    logger.error('dashboard.overview failed', { userId: auth.userId, role: auth.role, err });
    res.status(500).json({ error: 'Pano verileri alınamadı' });
  }
}
