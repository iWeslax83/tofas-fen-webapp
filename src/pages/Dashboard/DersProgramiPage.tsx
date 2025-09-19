// src/pages/Dashboard/DersProgramiPage.tsx
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import studentCredentials from "../../data/ogrenci_sifreleri.json";

interface Schedule {
  [day: string]: string[];
}

export default function DersProgramiPage() {
  const navigate = useNavigate();
  const rawUser = localStorage.getItem("activeUser");
  const user = rawUser ? JSON.parse(rawUser) : null;

  const [schedule, setSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    // Giriş kontrolü
    if (!user || user.rol !== "student") {
      navigate("/login", { replace: true });
      return;
    }

    // Öğrencinin bilgilerini json dosyasından al
    const creds = studentCredentials.find((s: any) => s.id === user.id);
    const sinif = creds?.sinif;
    const sube = creds?.sube;

    // Sınıf ve şube bazlı program tanımı
    if (sinif === "9" && sube === "A") {
      setSchedule({
        Pazartesi: [
          "İngilizce", "İngilizce",
          "Edebiyat", "Edebiyat",
          "Beden Eğitimi", "Beden Eğitimi",
          "Almanca/Fransızca", "Almanca/Fransızca"
        ],
        Salı: [
          "Coğrafya", "Coğrafya",
          "Kimya", "Kimya",
          "Fizik", "Fizik",
          "Matematik", "Matematik"
        ],
        Çarşamba: [
          "Matematik", "Matematik",
          "Sağlık Bilgisi",
          "Edebiyat",
          "Rehberlik",
          "Biyoloji", "Biyoloji",
          "Temel Din"
        ],
        Perşembe: [
          "Edebiyat", "Edebiyat",
          "Bilişim", "Bilişim",
          "Din", "Din",
          "Matematik", "Matematik"
        ],
        Cuma: [
          "Müzik/Resim", "Müzik/Resim",
          "İngilizce", "İngilizce",
          "Tarih", "Tarih",
          "Düşünme Eğitimi",
          "Adabı Muaşeret"
        ],
      });
    } else {
      setSchedule(null);
    }
  }, [navigate, user]);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-5 py-2 rounded"
      >
        ← Geri Dön
      </button>

      <h1 className="text-3xl font-bold text-purple-700 mb-4">🗓️ Ders Programı</h1>
      <p className="text-gray-700 text-lg mb-6">
        Haftalık ders programınız:
      </p>

      {schedule ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 shadow-md">
            <thead className="bg-purple-100">
              <tr>
                <th className="py-2 px-4 border">Gün</th>
                {Array.from({ length: 8 }).map((_, idx) => (
                  <th key={idx} className="py-2 px-4 border">{idx + 1}. Ders</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(schedule).map(([day, lessons]) => (
                <tr key={day} className="text-center">
                  <td className="py-2 px-4 border font-semibold">{day}</td>
                  {lessons.map((lesson, j) => (
                    <td key={j} className="py-2 px-4 border">{lesson}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-red-500">Bu sınıf/şube için ders programı bulunamadı.</p>
      )}
    </div>
  );
}
