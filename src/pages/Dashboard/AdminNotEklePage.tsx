import { useState, useEffect } from "react";
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
}


export default function AdminNotEklePage() {
    useAuth(["admin", "teacher"]);
  const navigate = useNavigate();
  const [notlar, setNotlar] = useState<NotEntry[]>(() => {
    const oncekiler = localStorage.getItem("manual-notlar");
    return oncekiler ? JSON.parse(oncekiler) : [];
  });

  const [form, setForm] = useState({
    id: "",
    adSoyad: "",
    ders: "",
    sinav1: "",
    sinav2: "",
    sozlu: ""
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("activeUser") || "null");
    if (!user || !["admin", "teacher"].includes(user.rol)) {
      navigate("/login");
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sinav1 = parseFloat(form.sinav1);
    const sinav2 = parseFloat(form.sinav2);
    const sozlu = parseFloat(form.sozlu);
    const ortalama = ((sinav1 + sinav2 + sozlu) / 3);

    const yeniNot: NotEntry = {
      id: form.id,
      adSoyad: form.adSoyad,
      ders: form.ders,
      sinav1,
      sinav2,
      sozlu,
      ortalama: parseFloat(ortalama.toFixed(1))
    };

    const guncel = [...notlar, yeniNot];
    setNotlar(guncel);
    localStorage.setItem("manual-notlar", JSON.stringify(guncel));
    setForm({ id: "", adSoyad: "", ders: "", sinav1: "", sinav2: "", sozlu: "" });
  };

  return (
    <div className="p-6">
    <button
  onClick={() => {
    const user = JSON.parse(localStorage.getItem("activeUser") || "null");
    if (user && user.rol) {
      navigate(`/${user.rol}`);
    } else {
      navigate("/login");
    }
  }}
  className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-4 py-2 rounded"
>
  ← Geri Dön
    </button>

      <h1 className="text-2xl font-bold mb-4">📋 Not Girişi (Yönetici / Öğretmen)</h1>
      <form onSubmit={handleSubmit} className="grid gap-3 max-w-md">
        <input name="id" placeholder="Öğrenci ID" value={form.id} onChange={handleChange} className="border p-2 rounded" required />
        <input name="adSoyad" placeholder="Ad Soyad" value={form.adSoyad} onChange={handleChange} className="border p-2 rounded" required />
        <select name="ders" value={form.ders} onChange={handleChange} className="border p-2 rounded" required>
          <option value="">Ders Seç</option>
          <option value="Matematik">Matematik</option>
          <option value="Fizik">Fizik</option>
          <option value="Kimya">Kimya</option>
          <option value="Biyoloji">Biyoloji</option>
          <option value="İngilizce">İngilizce</option>
          <option value="Tarih">Tarih</option>
          <option value="Coğrafya">Coğrafya</option>
          <option value="Din">Din</option>
        </select>
        <input name="sinav1" placeholder="1. Sınav" value={form.sinav1} onChange={handleChange} className="border p-2 rounded" required />
        <input name="sinav2" placeholder="2. Sınav" value={form.sinav2} onChange={handleChange} className="border p-2 rounded" required />
        <input name="sozlu" placeholder="Sözlü" value={form.sozlu} onChange={handleChange} className="border p-2 rounded" required />
        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded">Kaydet</button>
      </form>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">📊 Kaydedilen Notlar</h2>
        <ul className="mt-2 space-y-2">
          {notlar.map((n, i) => (
            <li key={i} className="border rounded p-3 bg-gray-100">
              {n.adSoyad} ({n.id}) - {n.ders} ➤ Ort: <b>{n.ortalama}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
