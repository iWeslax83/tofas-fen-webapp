import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface NotEntry {
  id: string;
  adSoyad: string;
  ders: string;
  sinav1: number;
  sinav2: number;
  sozlu: number;
  ortalama: number;
  giren?: string; // notu giren kişi (admin veya teacher)
}

export default function NotlarPage() {
  useAuth(["admin", "teacher", "student", "parent"]);

  const [notlar, setNotlar] = useState<NotEntry[]>([]);
  const user = JSON.parse(localStorage.getItem("activeUser") || "null");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (user.rol === "student") {
      const raw = localStorage.getItem("manual-notlar");
      const all = raw ? JSON.parse(raw) : [];
      const filtered = all.filter((n: NotEntry) => n.id === user.id);
      setNotlar(filtered);
    } else if (user.rol === "parent") {
      const raw = localStorage.getItem("manual-notlar");
      const all = raw ? JSON.parse(raw) : [];
      const filtered = all.filter((n: NotEntry) => n.id === user.childId);
      setNotlar(filtered);
    } else if (["teacher", "admin"].includes(user.rol)) {
      const raw = localStorage.getItem("manual-notlar");
      const all = raw ? JSON.parse(raw) : [];
      const filtered = all.filter((n: NotEntry) => n.giren === user.adSoyad);
      setNotlar(filtered);
    } else {
      navigate("/login");
    }
  }, [user, navigate]);

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-4 py-2 rounded"
      >
        ← Geri Dön
      </button>

      <h1 className="text-2xl font-bold mb-4">📚 Notlar</h1>

      {notlar.length === 0 ? (
        <p>Henüz not bulunmuyor.</p>
      ) : (
        <div className="space-y-4">
          {notlar.map((n, i) => (
            <div key={i} className="border rounded-lg p-4 bg-white shadow">
              <h3 className="text-lg font-semibold text-blue-700">{n.ders}</h3>
              <p>Sınav 1: {n.sinav1} | Sınav 2: {n.sinav2} | Sözlü: {n.sozlu}</p>
              <p className="text-sm text-gray-600">
                Ortalama: <b>{n.ortalama}</b>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
