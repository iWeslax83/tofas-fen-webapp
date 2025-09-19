// src/pages/Dashboard/MyClubsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Club {
  id: string;
  name: string;
  logo?: string;
  members: string[];
  roles: Record<string, string>;
}

interface InviteRequest {
  clubId: string;
  userId: string;
  role: "Üye" | "Başkan";
  timestamp: number;
}

export default function MyClubsPage() {
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [invites, setInvites] = useState<InviteRequest[]>([]);
  const navigate = useNavigate();

  // Aktif kullanıcıyı al
  const activeUser = JSON.parse(localStorage.getItem("activeUser") || "null");
  const userId: string = activeUser?.id;

  // Helper: tüm kulüpleri storage'dan oku
  function loadClubs(): Club[] {
    return JSON.parse(localStorage.getItem("clubs") || "[]");
  }

  // Helper: storage'daki invite isteklerini oku
  function loadInvites(): InviteRequest[] {
    return JSON.parse(localStorage.getItem("clubJoinRequests") || "[]");
  }

  // Verileri yükle
  const loadData = () => {
    if (!userId) {
      navigate("/login");
      return;
    }
    const clubs = loadClubs();
    setMyClubs(clubs.filter(c => c.members.includes(userId)));

    const reqs = loadInvites();
    setInvites(reqs.filter(r => r.userId === userId));
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Daveti kabul et
  const handleAccept = (req: InviteRequest) => {
    const clubs = loadClubs().map(c => {
      if (c.id === req.clubId) {
        if (!c.members.includes(userId)) c.members.push(userId);
        c.roles[userId] = req.role;
      }
      return c;
    });
    localStorage.setItem("clubs", JSON.stringify(clubs));

    const remaining = loadInvites().filter(r => !(r.clubId === req.clubId && r.userId === userId));
    localStorage.setItem("clubJoinRequests", JSON.stringify(remaining));

    loadData();
  };

  // Daveti reddet
  const handleReject = (req: InviteRequest) => {
    const remaining = loadInvites().filter(r => !(r.clubId === req.clubId && r.userId === userId));
    localStorage.setItem("clubJoinRequests", JSON.stringify(remaining));
    loadData();
  };

  // Kulüpten ayrıl — ve eğer sonuçta üyeleri kalmadıysa sil
  const handleLeave = (clubIdToLeave: string) => {
    // 1) Üyeyi çıkar
    let clubs = loadClubs().map(c => {
      if (c.id === clubIdToLeave) {
        c.members = c.members.filter(id => id !== userId);
        delete c.roles[userId];
      }
      return c;
    });
    // 2) Üye kalmayan kulüpleri filtrele
    clubs = clubs.filter(c => c.members.length > 0);
    localStorage.setItem("clubs", JSON.stringify(clubs));

    loadData();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 bg-gray-300 px-4 py-2 rounded"
      >
        ← Geri Dön
      </button>

      <h1 className="text-3xl font-bold mb-6">Kulüplerim</h1>
      {myClubs.length === 0 ? (
        <p>Henüz bir kulübe üye değilsiniz.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {myClubs.map(club => (
            <div
              key={club.id}
              className="flex items-center justify-between p-4 border rounded-lg shadow-sm"
            >
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => navigate(`/student/kulupler/${club.id}`)}
              >
                {club.logo ? (
                  <img
                    src={club.logo}
                    alt={club.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-white">
                    {club.name[0]}
                  </div>
                )}
                <span className="text-2xl font-semibold">{club.name}</span>
              </div>
              <button
                onClick={() => handleLeave(club.id)}
                className="text-red-600 hover:text-red-800"
              >
                Ayrıl
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-2xl font-semibold mt-10 mb-4">Gelen Davetler</h2>
      {invites.length === 0 ? (
        <p>Hiçbir davetiniz yok.</p>
      ) : (
        <div className="space-y-4">
          {invites.map(req => {
            const club = loadClubs().find(c => c.id === req.clubId)!;
            return (
              <div
                key={req.clubId}
                className="flex items-center justify-between border p-4 rounded-lg shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {club.logo ? (
                    <img
                      src={club.logo}
                      alt={club.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white">
                      {club.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg">{club.name}</p>
                    <p className="text-sm text-gray-500">Rol: {req.role}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(req)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Kabul Et
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
