// src/pages/Dashboard/AdminClubsPage.tsx
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import studentData from "../../data/ogrenci_sifreleri.json";
import teacherData from "../../data/ogretmen_sifreleri.json";
import parentData from "../../data/veli_sifreleri.json";
import adminData from "../../data/yonetici_sifreleri.json";

interface Club {
  id: string;
  name: string;
  presidentId: string;
  members: string[];
  roles: Record<string, string>;
  logo?: string;
}

export default function AdminClubsPage() {
  useAuth(["admin"]);
  const navigate = useNavigate();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [newName, setNewName] = useState("");
  const [newPresidentId, setNewPresidentId] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");

  // Varolan kulüpleri localStorage'dan yükle
  useEffect(() => {
    const stored = localStorage.getItem("clubs");
    const parsed: any[] = stored ? JSON.parse(stored) : [];
    const normalized: Club[] = parsed.map(c => ({
      id: c.id,
      name: c.name,
      presidentId: c.presidentId,
      logo: c.logo,
      members: Array.isArray(c.members) ? c.members : [],
      roles: typeof c.roles === "object" && c.roles !== null ? c.roles : {},
    }));
    setClubs(normalized);
  }, []);

  // ID ile kullanıcı adını getir
  const getNameById = (id: string) => {
    const all = [...studentData, ...teacherData, ...parentData, ...adminData];
    return all.find((u: any) => u.id === id)?.adSoyad || id;
  };

  // Logo dosyası seçildiğinde base64'e çevir
  const onLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Yeni kulüp oluştur
  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPresidentId.trim()) {
      alert("Kulüp adı ve Ana Başkan Öğrenci ID zorunlu.");
      return;
    }
    // Ana Başkan ID doğrulama
    const allUsers = [...studentData, ...teacherData, ...parentData, ...adminData];
    if (!allUsers.find(u => u.id === newPresidentId.trim())) {
      alert("Geçersiz Ana Başkan Öğrenci ID!");
      return;
    }
    const id = Date.now().toString();
    const newClub: Club = {
      id,
      name: newName.trim(),
      presidentId: newPresidentId.trim(),
      members: [newPresidentId.trim()],
      roles: { [newPresidentId.trim()]: "Ana Başkan" },
      logo: logoDataUrl || undefined,
    };
    const updated = [newClub, ...clubs];
    setClubs(updated);
    localStorage.setItem("clubs", JSON.stringify(updated));

    // Formu temizle
    setNewName("");
    setNewPresidentId("");
    setLogoFile(null);
    setLogoDataUrl("");
  };

  // Kulüp sil
  const handleDelete = (clubId: string) => {
    if (!confirm("Bu kulübü silmek istediğinize emin misiniz?")) return;
    const updated = clubs.filter(c => c.id !== clubId);
    setClubs(updated);
    localStorage.setItem("clubs", JSON.stringify(updated));
  };

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 bg-gray-500 text-white px-4 py-2 rounded"
      >
        ← Geri
      </button>

      <h1 className="text-2xl font-bold mb-4">Yeni Kulüp Oluştur</h1>
      <form onSubmit={handleCreate} className="grid gap-3 mb-8 max-w-md">
        <input
          type="text"
          placeholder="Kulüp Adı"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Ana Başkan Öğrenci ID"
          value={newPresidentId}
          onChange={e => setNewPresidentId(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="file"
          accept="image/*"
          onChange={onLogoChange}
          className="border p-2 rounded"
        />
        {logoDataUrl && (
          <img
            src={logoDataUrl}
            alt="Yeni Logo Önizleme"
            className="h-16 w-16 rounded-full object-cover"
          />
        )}
        <button type="submit" className="bg-green-600 text-white py-2 rounded">
          Oluştur
        </button>
      </form>

      <h2 className="text-2xl font-bold mb-4">Mevcut Kulüpler</h2>
      {clubs.length === 0 ? (
        <p>Henüz oluşturulmuş kulüp yok.</p>
      ) : (
        <div className="space-y-4">
          {clubs.map(club => (
            <div
              key={club.id}
              className="border p-4 rounded flex justify-between items-center"
            >
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {club.logo && (
                    <img
                      src={club.logo}
                      alt="Logo"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  {club.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Ana Başkan: {getNameById(club.presidentId)}
                </p>
                <p className="text-sm text-gray-600">
                  Üye sayısı: {club.members.length}
                </p>
              </div>
              <button
                onClick={() => handleDelete(club.id)}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
