import { User } from '../models';
import bcrypt from 'bcryptjs';

// Test kullanıcıları oluştur
export const createTestUsers = async () => {
  try {
    // Mevcut test kullanıcılarını temizle
    await User.deleteMany({ 
      id: { 
        $in: [
          'admin1', 'admin2', 'teacher1', 'teacher2', 'teacher3', 'teacher4', 'teacher5',
          'student1', 'student2', 'student3', 'student4', 'student5', 'student6', 'student7', 'student8', 'student9', 'student10',
          'parent1', 'parent2', 'parent3', 'parent4', 'parent5',
          'hizmetli1', 'hizmetli2'
        ]
      }
    });

    const hashedPassword = await bcrypt.hash('123456', 8);

    const testUsers = [
      // ADMIN KULLANICILARI
      {
        id: 'admin1',
        adSoyad: 'Dr. Mehmet Yılmaz',
        email: 'mehmet.yilmaz@tofasfen.edu.tr',
        rol: 'admin',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true
      },
      {
        id: 'admin2',
        adSoyad: 'Ayşe Kaya',
        email: 'ayse.kaya@tofasfen.edu.tr',
        rol: 'admin',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true
      },

      // ÖĞRETMEN KULLANICILARI
      {
        id: 'teacher1',
        adSoyad: 'Prof. Dr. Ali Demir',
        email: 'ali.demir@tofasfen.edu.tr',
        rol: 'teacher',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true
      },
      {
        id: 'teacher2',
        adSoyad: 'Dr. Fatma Özkan',
        email: 'fatma.ozkan@tofasfen.edu.tr',
        rol: 'teacher',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true
      },
      {
        id: 'teacher3',
        adSoyad: 'Öğr. Gör. Mustafa Çelik',
        email: 'mustafa.celik@tofasfen.edu.tr',
        rol: 'teacher',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true
      },
      {
        id: 'teacher4',
        adSoyad: 'Dr. Zeynep Arslan',
        email: 'zeynep.arslan@tofasfen.edu.tr',
        rol: 'teacher',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true
      },
      {
        id: 'teacher5',
        adSoyad: 'Öğr. Gör. Emre Yıldız',
        email: 'emre.yildiz@tofasfen.edu.tr',
        rol: 'teacher',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true
      },

      // ÖĞRENCİ KULLANICILARI (9. Sınıf)
      {
        id: 'student1',
        adSoyad: 'Ahmet Yılmaz',
        email: 'ahmet.yilmaz@tofasfen.edu.tr',
        rol: 'student',
        sinif: '9',
        sube: 'A',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent1'
      },
      {
        id: 'student2',
        adSoyad: 'Ayşe Demir',
        email: 'ayse.demir@tofasfen.edu.tr',
        rol: 'student',
        sinif: '9',
        sube: 'A',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent2'
      },
      {
        id: 'student3',
        adSoyad: 'Mehmet Kaya',
        email: 'mehmet.kaya@tofasfen.edu.tr',
        rol: 'student',
        sinif: '9',
        sube: 'B',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent3'
      },

      // ÖĞRENCİ KULLANICILARI (10. Sınıf)
      {
        id: 'student4',
        adSoyad: 'Elif Özkan',
        email: 'elif.ozkan@tofasfen.edu.tr',
        rol: 'student',
        sinif: '10',
        sube: 'A',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent4'
      },
      {
        id: 'student5',
        adSoyad: 'Can Çelik',
        email: 'can.celik@tofasfen.edu.tr',
        rol: 'student',
        sinif: '10',
        sube: 'A',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent5'
      },
      {
        id: 'student6',
        adSoyad: 'Zeynep Arslan',
        email: 'zeynep.arslan.student@tofasfen.edu.tr',
        rol: 'student',
        sinif: '10',
        sube: 'B',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent1'
      },

      // ÖĞRENCİ KULLANICILARI (11. Sınıf)
      {
        id: 'student7',
        adSoyad: 'Emre Yıldız',
        email: 'emre.yildiz.student@tofasfen.edu.tr',
        rol: 'student',
        sinif: '11',
        sube: 'A',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent2'
      },
      {
        id: 'student8',
        adSoyad: 'Selin Öztürk',
        email: 'selin.ozturk@tofasfen.edu.tr',
        rol: 'student',
        sinif: '11',
        sube: 'B',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent3'
      },

      // ÖĞRENCİ KULLANICILARI (12. Sınıf)
      {
        id: 'student9',
        adSoyad: 'Burak Şahin',
        email: 'burak.sahin@tofasfen.edu.tr',
        rol: 'student',
        sinif: '12',
        sube: 'A',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent4'
      },
      {
        id: 'student10',
        adSoyad: 'Deniz Kılıç',
        email: 'deniz.kilic@tofasfen.edu.tr',
        rol: 'student',
        sinif: '12',
        sube: 'B',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent5'
      },

      // PANSİYON ÖĞRENCİLERİ
      {
        id: 'student11',
        adSoyad: 'Ahmet Pansiyon',
        email: 'ahmet.pansiyon@tofasfen.edu.tr',
        rol: 'student',
        sinif: '10',
        sube: 'C',
        pansiyon: true,
        oda: '101',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent1'
      },
      {
        id: 'student12',
        adSoyad: 'Ayşe Pansiyon',
        email: 'ayse.pansiyon@tofasfen.edu.tr',
        rol: 'student',
        sinif: '11',
        sube: 'C',
        pansiyon: true,
        oda: '205',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        parentId: 'parent2'
      },

      // VELİ KULLANICILARI
      {
        id: 'parent1',
        adSoyad: 'Hasan Yılmaz',
        email: 'hasan.yilmaz@email.com',
        rol: 'parent',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        childId: ['student1', 'student6', 'student11']
      },
      {
        id: 'parent2',
        adSoyad: 'Fatma Demir',
        email: 'fatma.demir@email.com',
        rol: 'parent',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        childId: ['student2', 'student7', 'student12']
      },
      {
        id: 'parent3',
        adSoyad: 'Mehmet Kaya',
        email: 'mehmet.kaya@email.com',
        rol: 'parent',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        childId: ['student3', 'student8']
      },
      {
        id: 'parent4',
        adSoyad: 'Zeynep Özkan',
        email: 'zeynep.ozkan@email.com',
        rol: 'parent',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        childId: ['student4', 'student9']
      },
      {
        id: 'parent5',
        adSoyad: 'Ali Çelik',
        email: 'ali.celik@email.com',
        rol: 'parent',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true,
        childId: ['student5', 'student10']
      },

      // HİZMETLİ KULLANICILARI
      {
        id: 'hizmetli1',
        adSoyad: 'Osman Temizlik',
        email: 'osman.temizlik@tofasfen.edu.tr',
        rol: 'hizmetli',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true
      },
      {
        id: 'hizmetli2',
        adSoyad: 'Hatice Güvenlik',
        email: 'hatice.guvenlik@tofasfen.edu.tr',
        rol: 'hizmetli',
        sifre: hashedPassword,
        emailVerified: true,
        isActive: true
      }
    ];

    // Kullanıcıları veritabanına ekle
    await User.insertMany(testUsers);
    
    console.log('✅ Test kullanıcıları başarıyla oluşturuldu!');
    console.log('📊 Toplam kullanıcı sayısı:', testUsers.length);
    console.log('👨‍💼 Admin:', testUsers.filter(u => u.rol === 'admin').length);
    console.log('👨‍🏫 Öğretmen:', testUsers.filter(u => u.rol === 'teacher').length);
    console.log('👨‍🎓 Öğrenci:', testUsers.filter(u => u.rol === 'student').length);
    console.log('👨‍👩‍👧‍👦 Veli:', testUsers.filter(u => u.rol === 'parent').length);
    console.log('🧹 Hizmetli:', testUsers.filter(u => u.rol === 'hizmetli').length);
    
    return testUsers;
  } catch (error) {
    console.error('❌ Test kullanıcıları oluşturulurken hata:', error);
    throw error;
  }
};

// Test kullanıcılarını sil
export const deleteTestUsers = async (): Promise<{ deletedCount?: number }> => {
  try {
    const result = await User.deleteMany({ 
      id: { 
        $in: [
          'admin1', 'admin2', 'teacher1', 'teacher2', 'teacher3', 'teacher4', 'teacher5',
          'student1', 'student2', 'student3', 'student4', 'student5', 'student6', 'student7', 'student8', 'student9', 'student10', 'student11', 'student12',
          'parent1', 'parent2', 'parent3', 'parent4', 'parent5',
          'hizmetli1', 'hizmetli2'
        ]
      }
    });
    
    console.log('🗑️ Test kullanıcıları silindi:', result.deletedCount);
    return result;
  } catch (error) {
    console.error('❌ Test kullanıcıları silinirken hata:', error);
    throw error;
  }
};
