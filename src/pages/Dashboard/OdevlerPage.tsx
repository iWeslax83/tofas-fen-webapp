import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// Homework tipi tanımlama
interface Homework {
  title: string;
  content: string;
  subject: string;
  startDate: string;
  endDate: string;
  date: string;
  grade: string;
  file?: string;
}

export default function OdevlerPage() {
  useAuth(["admin", "teacher", "student", "parent"]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser") || "null");
  const [showModal, setShowModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("Tümü");
  const [homeworks, setHomeworks] = useState<Homework[]>(() => {
    const saved = localStorage.getItem("homeworks");
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.sort((a: Homework, b: Homework) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });
  const [notification, setNotification] = useState("");

  useEffect(() => {
    if (!user || !["admin", "student", "teacher", "parent"].includes(user.rol)) {
      navigate("/login");
    } else if (user.rol === "student") {
      const lastSeen = localStorage.getItem("lastSeenHomework") || "";
      const latest = homeworks.find((hw: Homework) => hw.grade === user.sinif);
      if (latest && latest.date > lastSeen) {
        setNotification("Yeni bir ödevin var!");
      }
    }
  }, [navigate, homeworks, user]);

  const filteredHomeworks = homeworks.filter((hw: Homework) => {
    if (selectedSubject !== "Tümü" && hw.subject !== selectedSubject) return false;
    if (user?.rol === "student") {
      return hw.grade === user.sinif;
    }
    return true;
  });

  const handleFileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      {notification && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          {notification}
        </div>
      )}

      <button
        onClick={() => navigate(-1)}
        className="mb-6 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
      >
        ← Geri Dön
      </button>

      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-yellow-700">📘 Ödevler</h1>
        {(user?.rol === "teacher" || user?.rol === "admin") && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg"
          >
            ➕ Yeni Ödev
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <label className="font-medium text-gray-700">Derse göre filtrele:</label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="border rounded p-2"
        >
          <option value="Tümü">Tümü</option>
          {[...new Set(homeworks.map((hw) => hw.subject))].map((subject, i) => (
            <option key={i} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filteredHomeworks.map((hw, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white shadow relative">
            <h3 className="text-lg font-semibold text-yellow-700">{hw.title}</h3>
            <p className="text-gray-700">{hw.content}</p>
            {hw.file && (
              <a href={hw.file} download className="text-sm text-blue-600 hover:underline block mt-2">
                📎 Dosyayı indir
              </a>
            )}
            <p className="text-sm text-gray-600">📚 {hw.subject}</p>
            <p className="text-sm text-gray-500">📅 {hw.startDate} → {hw.endDate}</p>
            <p className="text-sm text-gray-500">🕒 Oluşturulma: {hw.date}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-[90%] max-w-md">
            <h2 className="text-xl font-bold mb-4 text-yellow-700">Yeni Ödev</h2>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const title = (form.querySelector('input[name="title"]') as HTMLInputElement).value;
                const content = (form.querySelector('textarea[name="content"]') as HTMLTextAreaElement).value;
                const subject = (form.querySelector('select[name="subject"]') as HTMLSelectElement).value;
                const startDate = (form.querySelector('input[name="startDate"]') as HTMLInputElement).value;
                const endDate = (form.querySelector('input[name="endDate"]') as HTMLInputElement).value;
                const grade = (form.querySelector('select[name="grade"]') as HTMLSelectElement).value;
                const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement;
                const file = fileInput?.files?.[0];
                let fileData = "";
                if (file) fileData = await handleFileToBase64(file);
                const date = new Date().toISOString().split("T")[0];
                const newHomework = { title, content, subject, startDate, endDate, date, grade, file: fileData };
                const updated = [newHomework, ...homeworks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setHomeworks(updated);
                localStorage.setItem("homeworks", JSON.stringify(updated));
                localStorage.setItem("lastSeenHomework", date);
                setShowModal(false);
              }}
            >
              <input name="title" type="text" placeholder="Başlık" className="w-full border p-2 rounded" required />
              <textarea name="content" placeholder="İçerik" className="w-full border p-2 rounded" required></textarea>
              <select name="subject" className="w-full border p-2 rounded" required>
                <option value="">Ders Seç</option>
                {["edebiyat", "matematik", "fizik", "kimya", "biyoloji", "coğrafya", "tarih", "din", "ingilizce"].map(
                  (d, i) => (
                    <option key={i} value={d}>
                      {d}
                    </option>
                  )
                )}
              </select>
              <select name="grade" className="w-full border p-2 rounded" required>
                <option value="">Sınıf Seç</option>
                {["9", "10", "11", "12"].map((g, i) => (
                  <option key={i} value={g}>
                    {g}. sınıf
                  </option>
                ))}
              </select>
              <input name="startDate" type="date" className="w-full border p-2 rounded" required />
              <input name="endDate" type="date" className="w-full border p-2 rounded" required />
              <input name="file" type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="w-full border p-2 rounded" />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
