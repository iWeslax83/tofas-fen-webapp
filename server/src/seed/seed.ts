import { connectDB } from '../db';
import { createTestUsers } from './testUsers';
import { createSampleReports } from './sampleReports';

async function seed() {
  try {
    console.log('🌱 Seed işlemi başlatılıyor...');

    // Veritabanına bağlan
    await connectDB();
    console.log('✅ Veritabanına bağlandı');

    // Test kullanıcılarını oluştur
    await createTestUsers();

    // Sample raporları oluştur
    await createSampleReports();

    console.log('🎉 Seed işlemi tamamlandı!');
    console.log('\n📋 Test Kullanıcı Bilgileri:');
    console.log('================================');
    console.log('🔑 Tüm kullanıcıların şifresi: 123456');
    console.log('\n👨‍💼 ADMIN KULLANICILARI:');
    console.log('  • admin1 - Dr. Mehmet Yılmaz (mehmet.yilmaz@tofasfen.edu.tr)');
    console.log('  • admin2 - Ayşe Kaya (ayse.kaya@tofasfen.edu.tr)');
    console.log('\n👨‍🏫 ÖĞRETMEN KULLANICILARI:');
    console.log('  • teacher1 - Prof. Dr. Ali Demir (ali.demir@tofasfen.edu.tr)');
    console.log('  • teacher2 - Dr. Fatma Özkan (fatma.ozkan@tofasfen.edu.tr)');
    console.log('  • teacher3 - Öğr. Gör. Mustafa Çelik (mustafa.celik@tofasfen.edu.tr)');
    console.log('  • teacher4 - Dr. Zeynep Arslan (zeynep.arslan@tofasfen.edu.tr)');
    console.log('  • teacher5 - Öğr. Gör. Emre Yıldız (emre.yildiz@tofasfen.edu.tr)');
    console.log('\n👨‍🎓 ÖĞRENCİ KULLANICILARI:');
    console.log('  • student1 - Ahmet Yılmaz (9-A) - ahmet.yilmaz@tofasfen.edu.tr');
    console.log('  • student2 - Ayşe Demir (9-A) - ayse.demir@tofasfen.edu.tr');
    console.log('  • student3 - Mehmet Kaya (9-B) - mehmet.kaya@tofasfen.edu.tr');
    console.log('  • student4 - Elif Özkan (10-A) - elif.ozkan@tofasfen.edu.tr');
    console.log('  • student5 - Can Çelik (10-A) - can.celik@tofasfen.edu.tr');
    console.log('  • student6 - Zeynep Arslan (10-B) - zeynep.arslan@tofasfen.edu.tr');
    console.log('  • student7 - Emre Yıldız (11-A) - emre.yildiz@tofasfen.edu.tr');
    console.log('  • student8 - Selin Öztürk (11-B) - selin.ozturk@tofasfen.edu.tr');
    console.log('  • student9 - Burak Şahin (12-A) - burak.sahin@tofasfen.edu.tr');
    console.log('  • student10 - Deniz Kılıç (12-B) - deniz.kilic@tofasfen.edu.tr');
    console.log('  • student11 - Ahmet Pansiyon (10-C, Oda: 101) - ahmet.pansiyon@tofasfen.edu.tr');
    console.log('  • student12 - Ayşe Pansiyon (11-C, Oda: 205) - ayse.pansiyon@tofasfen.edu.tr');
    console.log('\n👨‍👩‍👧‍👦 VELİ KULLANICILARI:');
    console.log('  • parent1 - Hasan Yılmaz (hasan.yilmaz@email.com)');
    console.log('  • parent2 - Fatma Demir (fatma.demir@email.com)');
    console.log('  • parent3 - Mehmet Kaya (mehmet.kaya@email.com)');
    console.log('  • parent4 - Zeynep Özkan (zeynep.ozkan@email.com)');
    console.log('  • parent5 - Ali Çelik (ali.celik@email.com)');
    console.log('\n🧹 HİZMETLİ KULLANICILARI:');

    console.log('\n🚀 Artık uygulamayı test edebilirsiniz!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed işlemi başarısız:', error);
    process.exit(1);
  }
}

// Script doğrudan çalıştırılırsa seed işlemini başlat
if (require.main === module) {
  seed();
}

export { seed };
