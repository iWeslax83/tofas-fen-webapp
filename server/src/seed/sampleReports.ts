import { Report } from '../models/Report';

export const createSampleReports = async () => {
  try {
    // Clear existing sample reports
    await Report.deleteMany({ 
      id: { 
        $in: [
          'report_academic_performance_2024',
          'report_user_activity_2024',
          'report_club_participation_2024',
          'report_system_usage_2024'
        ]
      }
    });

    const sampleReports = [
      {
        id: 'report_academic_performance_2024',
        title: '2024 Akademik Performans Raporu',
        description: '2024 yılı akademik performans analizi ve değerlendirmesi',
        type: 'academic',
        category: 'performance',
        template: 'default',
        parameters: {},
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          academicYear: '2024'
        },
        data: {
          raw: [],
          aggregated: {
            totalStudents: 150,
            averageGrade: 85.2,
            passRate: 92.5
          },
          charts: [
            {
              type: 'bar',
              data: {
                labels: ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf'],
                datasets: [{
                  label: 'Ortalama Not',
                  data: [82.1, 85.3, 87.8, 89.2],
                  backgroundColor: 'rgba(102, 126, 234, 0.8)'
                }]
              },
              options: {
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: 'Sınıf Bazında Ortalama Notlar'
                  }
                }
              }
            }
          ],
          tables: [
            {
              headers: ['Sınıf', 'Öğrenci Sayısı', 'Ortalama Not', 'Geçme Oranı'],
              rows: [
                ['9. Sınıf', '40', '82.1', '90%'],
                ['10. Sınıf', '38', '85.3', '95%'],
                ['11. Sınıf', '35', '87.8', '97%'],
                ['12. Sınıf', '37', '89.2', '98%']
              ],
              summary: {
                totalStudents: 150,
                overallAverage: 85.2,
                overallPassRate: '92.5%'
              }
            }
          ]
        },
        status: 'generated',
        generatedBy: 'admin1',
        generatedAt: new Date('2024-12-01'),
        isPublic: true,
        allowedRoles: ['admin', 'teacher'],
        isActive: true
      },
      {
        id: 'report_user_activity_2024',
        title: 'Kullanıcı Aktivite Raporu',
        description: 'Sistem kullanıcılarının aktivite analizi ve istatistikleri',
        type: 'user',
        category: 'activity',
        template: 'default',
        parameters: {},
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        },
        data: {
          raw: [],
          aggregated: {
            totalUsers: 200,
            activeUsers: 180,
            loginCount: 15420
          },
          charts: [
            {
              type: 'pie',
              data: {
                labels: ['Admin', 'Öğretmen', 'Öğrenci', 'Veli', 'Hizmetli'],
                datasets: [{
                  data: [5, 25, 120, 40, 10],
                  backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                  ]
                }]
              },
              options: {
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: 'Kullanıcı Rol Dağılımı'
                  }
                }
              }
            }
          ],
          tables: [
            {
              headers: ['Rol', 'Kullanıcı Sayısı', 'Aktif Kullanıcı', 'Ortalama Giriş'],
              rows: [
                ['Admin', '5', '5', '45'],
                ['Öğretmen', '25', '23', '38'],
                ['Öğrenci', '120', '110', '25'],
                ['Veli', '40', '35', '12'],
                ['Hizmetli', '10', '7', '8']
              ],
              summary: {
                totalUsers: 200,
                activeUsers: 180,
                averageLogins: 77.1
              }
            }
          ]
        },
        status: 'generated',
        generatedBy: 'admin1',
        generatedAt: new Date('2024-11-28'),
        isPublic: false,
        allowedRoles: ['admin'],
        isActive: true
      },
      {
        id: 'report_club_participation_2024',
        title: 'Kulüp Katılım Raporu',
        description: 'Öğrenci kulüplerine katılım oranları ve aktivite analizi',
        type: 'club',
        category: 'participation',
        template: 'default',
        parameters: {},
        filters: {
          startDate: '2024-09-01',
          endDate: '2024-12-31',
          academicYear: '2024'
        },
        data: {
          raw: [],
          aggregated: {
            totalClubs: 12,
            totalParticipants: 180,
            averageParticipation: 15
          },
          charts: [
            {
              type: 'doughnut',
              data: {
                labels: ['Bilim Kulübü', 'Spor Kulübü', 'Müzik Kulübü', 'Sanat Kulübü', 'Çevre Kulübü', 'Diğer'],
                datasets: [{
                  data: [35, 28, 22, 18, 15, 62],
                  backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(72, 187, 120, 0.8)',
                    'rgba(237, 137, 54, 0.8)',
                    'rgba(66, 153, 225, 0.8)',
                    'rgba(160, 174, 192, 0.8)',
                    'rgba(245, 101, 101, 0.8)'
                  ]
                }]
              },
              options: {
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: 'Kulüp Katılım Dağılımı'
                  }
                }
              }
            }
          ],
          tables: [
            {
              headers: ['Kulüp Adı', 'Katılımcı Sayısı', 'Aktif Üye', 'Aylık Toplantı'],
              rows: [
                ['Bilim Kulübü', '35', '32', '4'],
                ['Spor Kulübü', '28', '25', '8'],
                ['Müzik Kulübü', '22', '20', '6'],
                ['Sanat Kulübü', '18', '16', '3'],
                ['Çevre Kulübü', '15', '14', '2'],
                ['Diğer Kulüpler', '62', '55', '12']
              ],
              summary: {
                totalClubs: 12,
                totalParticipants: 180,
                averagePerClub: 15
              }
            }
          ]
        },
        status: 'generated',
        generatedBy: 'teacher1',
        generatedAt: new Date('2024-12-05'),
        isPublic: true,
        allowedRoles: ['admin', 'teacher'],
        isActive: true
      },
      {
        id: 'report_system_usage_2024',
        title: 'Sistem Kullanım Raporu',
        description: 'Sistem performansı ve kullanım istatistikleri',
        type: 'system',
        category: 'performance',
        template: 'default',
        parameters: {},
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        },
        data: {
          raw: [],
          aggregated: {
            totalRequests: 125000,
            averageResponseTime: 245,
            uptime: 99.8
          },
          charts: [
            {
              type: 'line',
              data: {
                labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
                datasets: [{
                  label: 'Aylık İstek Sayısı',
                  data: [8500, 9200, 10800, 11200, 10500, 8800, 7200, 6800, 9800, 11200, 11800, 12000],
                  borderColor: 'rgba(102, 126, 234, 1)',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  fill: true
                }]
              },
              options: {
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: 'Aylık Sistem Kullanımı'
                  }
                }
              }
            }
          ],
          tables: [
            {
              headers: ['Metrik', 'Değer', 'Birim', 'Durum'],
              rows: [
                ['Toplam İstek', '125,000', 'adet', 'Normal'],
                ['Ortalama Yanıt Süresi', '245', 'ms', 'İyi'],
                ['Sistem Uptime', '99.8', '%', 'Mükemmel'],
                ['Hata Oranı', '0.02', '%', 'Çok Düşük'],
                ['Günlük Aktif Kullanıcı', '180', 'kişi', 'Normal']
              ],
              summary: {
                systemHealth: 'Mükemmel',
                performance: 'İyi',
                reliability: 'Yüksek'
              }
            }
          ]
        },
        status: 'generated',
        generatedBy: 'admin2',
        generatedAt: new Date('2024-12-10'),
        isPublic: false,
        allowedRoles: ['admin'],
        isActive: true
      }
    ];

    await Report.insertMany(sampleReports);
    console.log('✅ Sample reports created successfully');
  } catch (error) {
    console.error('❌ Error creating sample reports:', error);
    throw error;
  }
};
