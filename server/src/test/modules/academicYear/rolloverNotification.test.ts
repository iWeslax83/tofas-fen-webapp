import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AcademicYearRollover, User } from '../../../models';
import { SchedulerService } from '../../../services/SchedulerService';
import { NotificationService } from '../../../services/NotificationService';

describe('SchedulerService.proposeAcademicYearRollover', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await User.create({
      id: 'admin_1',
      adSoyad: 'Test Admin',
      rol: 'admin',
      isActive: true,
      childId: [],
    });
    await User.create({
      id: 'ogr_1',
      adSoyad: 'Test Öğrenci',
      rol: 'student',
      sinif: '9',
      sube: 'A',
      isActive: true,
      childId: [],
    });
  });

  it('öneri üretir ve adminlere bildirim gönderir', async () => {
    const spy = vi
      .spyOn(NotificationService, 'createNotification')
      .mockResolvedValue(undefined as never);

    await SchedulerService.proposeAcademicYearRollover();

    expect(await AcademicYearRollover.countDocuments({ status: 'proposed' })).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({
      userId: 'admin_1',
      actionUrl: '/admin/ogretim-yili',
    });
  });

  it('öneri üretilmezse bildirim göndermez', async () => {
    const spy = vi
      .spyOn(NotificationService, 'createNotification')
      .mockResolvedValue(undefined as never);

    await SchedulerService.proposeAcademicYearRollover();
    spy.mockClear();
    await SchedulerService.proposeAcademicYearRollover();

    expect(spy).not.toHaveBeenCalled();
    expect(await AcademicYearRollover.countDocuments()).toBe(1);
  });

  it('bildirim hatası öneriyi geri almaz', async () => {
    vi.spyOn(NotificationService, 'createNotification').mockRejectedValue(new Error('SMTP down'));

    await SchedulerService.proposeAcademicYearRollover();

    expect(await AcademicYearRollover.countDocuments({ status: 'proposed' })).toBe(1);
  });
});
