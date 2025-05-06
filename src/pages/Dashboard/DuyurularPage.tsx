import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function DuyurularPage() {
  useAuth(["admin", "teacher", "student", "parent"]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser") || "null");
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState<{ title: string; content: string; date: string; expire?: string }[]>(() => {
    const saved = localStorage.getItem("announcements");
    const parsed = saved ? JSON.parse(saved) : [];
    const now = new Date();
    const filtered = parsed.filter((a: any) => !a.expire || new Date(a.expire) >= now);
    localStorage.setItem("announcements", JSON.stringify(filtered));
    return filtered.sort((a: { date: string | number | Date; }, b: { date: string | number | Date; }) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (!["admin", "student", "teacher", "parent"].includes(user.rol)) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
      >
        ← Geri Dön
      </button>

      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-yellow-700">📢 Duyurular</h1>
        {user?.rol === "admin" && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg"
          >
            ➕ Yeni Duyuru
          </button>
        )}
      </div>

      <p className="text-gray-700 text-lg mb-6">Tüm kullanıcılar için paylaşılan resmi duyurular aşağıda listelenmiştir.</p>

      <div className="space-y-4">
        {announcements.map((a, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white shadow">
            <h3 className="text-lg font-semibold text-yellow-700">{a.title}</h3>
            <p className="text-gray-700">{a.content}</p>
            <p className="text-sm text-gray-500">🕒 {a.date}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-[90%] max-w-md">
            <h2 className="text-xl font-bold mb-4 text-yellow-700">Yeni Duyuru</h2>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const title = (form.querySelector('input[name="title"]') as HTMLInputElement).value;
              const content = (form.querySelector('textarea[name="content"]') as HTMLTextAreaElement).value;
              const date = new Date().toISOString().split("T")[0];
              const expire = (form.querySelector('input[name="expire"]') as HTMLInputElement).value;
              const newAnnouncement = { title, content, date, expire };
              const updated = [newAnnouncement, ...announcements];
              setAnnouncements(updated);
              localStorage.setItem("announcements", JSON.stringify(updated));
              setShowModal(false);
            }}>
              <input name="title" type="text" placeholder="Başlık" className="w-full border p-2 rounded" required />
              <textarea name="content" placeholder="İçerik" className="w-full border p-2 rounded" required></textarea>
              <input name="expire" type="date" className="w-full border p-2 rounded" required placeholder="Bitiş Tarihi" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
