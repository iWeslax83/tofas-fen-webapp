import { describe, it, expect, beforeEach } from 'vitest';
import Announcement from '../../../models/Announcement';
import { Homework } from '../../../models/Homework';
import { User } from '../../../models/User';
import { getTeacherOverview } from '../../../modules/dashboard/dashboardService';

const TEACHER = 'ogretmen_akis_1';

const gunOnce = (n: number) => new Date(Date.now() - n * 86_400_000);

type OdevAlanlari = {
  baslik: string;
  ders: string;
  sinif: string;
  verilis: Date;
  teslim: Date;
  status?: 'active' | 'completed' | 'expired';
  isPublished?: boolean;
};

let odevSayaci = 0;

async function odevOlustur(o: OdevAlanlari) {
  odevSayaci += 1;
  await Homework.create({
    id: `hw-akis-${odevSayaci}`,
    title: o.baslik,
    description: 'test ödevi',
    subject: o.ders,
    teacherId: TEACHER,
    teacherName: 'Test Öğretmen',
    classLevel: o.sinif,
    dueDate: o.teslim,
    assignedDate: o.verilis,
    status: o.status ?? 'active',
    isPublished: o.isPublished ?? true,
  });
}

describe('öğretmen Son Hareketler akışı', () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({ id: TEACHER }),
      Homework.deleteMany({ teacherId: TEACHER }),
      Announcement.deleteMany({}),
    ]);
    await User.create({
      id: TEACHER,
      adSoyad: 'Test Öğretmen',
      rol: 'teacher',
      isActive: true,
      tokenVersion: 0,
      childId: [],
    });
  });

  it('30 günden eski ödevi göstermez', async () => {
    await odevOlustur({
      baslik: 'Eski ödev',
      ders: 'Matematik',
      sinif: '9',
      verilis: gunOnce(45),
      teslim: gunOnce(40),
    });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).not.toContain('Ödev verildi: Eski ödev');
  });

  it('süresi geçmiş ödevi göstermez', async () => {
    await odevOlustur({
      baslik: 'Süresi geçmiş ödev',
      ders: 'Fizik',
      sinif: '10',
      verilis: gunOnce(3),
      teslim: gunOnce(1),
      status: 'expired',
    });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).not.toContain(
      'Ödev verildi: Süresi geçmiş ödev',
    );
  });

  it('yayınlanmamış ödevi göstermez', async () => {
    await odevOlustur({
      baslik: 'Taslak ödev',
      ders: 'Kimya',
      sinif: '11',
      verilis: gunOnce(2),
      teslim: gunOnce(-5),
      isPublished: false,
    });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).not.toContain('Ödev verildi: Taslak ödev');
  });

  it('güncel yayınlanmış ödevi gösterir', async () => {
    await odevOlustur({
      baslik: 'Güncel ödev',
      ders: 'Biyoloji',
      sinif: '9',
      verilis: gunOnce(1),
      teslim: gunOnce(-3),
    });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).toContain('Ödev verildi: Güncel ödev');
  });

  it('30 günden eski duyuruyu göstermez', async () => {
    const eski = await Announcement.create({
      title: 'Eski duyuru',
      content: 'içerik',
      author: 'Admin',
      date: gunOnce(60).toISOString(),
      targetRoles: ['teacher'],
    });
    // createdAt Mongoose'da immutable, ham sürücü üzerinden geriye alıyoruz.
    await Announcement.collection.updateOne(
      { _id: eski._id },
      { $set: { createdAt: gunOnce(60) } },
    );

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).not.toContain('Eski duyuru');
  });

  it('güncel duyuruyu gösterir', async () => {
    await Announcement.create({
      title: 'Güncel duyuru',
      content: 'içerik',
      author: 'Admin',
      date: gunOnce(2).toISOString(),
      targetRoles: ['teacher'],
    });

    const overview = await getTeacherOverview(TEACHER);
    expect(overview.recentActivity.map((e) => e.title)).toContain('Güncel duyuru');
  });
});
