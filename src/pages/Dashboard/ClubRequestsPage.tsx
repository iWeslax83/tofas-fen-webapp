// src/pages/Dashboard/ClubRequestsPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Request { clubId: string; userId: string; userName: string; }

export default function ClubRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser")!);

  useEffect(() => {
    async function effect() {
      if (!user) await navigate("/login");
      const all = JSON.parse(localStorage.getItem("clubRequests") || "[]");
      // Sadece başkanı olduğun kulübün istekleri:
      const my = all.filter((r: Request) => {
        const clubs = JSON.parse(localStorage.getItem("clubs")!);
        const club = clubs.find((c: any) => c.id === r.clubId);
        return club?.presidentId === user.id;
      });
      setRequests(my);
    }
    effect();
  }, [navigate, user]);

  const handle = (req: Request, accept: boolean) => {
    // Requests'ten kaldır
    let all = JSON.parse(localStorage.getItem("clubRequests")!);
    all = all.filter((r: Request) => !(r.clubId===req.clubId && r.userId===req.userId));
    localStorage.setItem("clubRequests", JSON.stringify(all));
    // Kabul edilirse kulübe ekle
    if (accept) {
      const clubs = JSON.parse(localStorage.getItem("clubs")!);
      const club = clubs.find((c: any) => c.id === req.clubId);
      if (club && !club.members.includes(req.userId)) {
        club.members.push(req.userId);
        club.roles[req.userId] = "Üye";
      }
      localStorage.setItem("clubs", JSON.stringify(clubs));
    }
    // State güncelle
    setRequests(requests.filter(r => !(r.clubId===req.clubId && r.userId===req.userId)));
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Kulüp Katılım İstekleri</h2>
      {requests.map((r, i) => (
        <div key={i} className="border p-4 mb-2 flex justify-between items-center">
          <span>
            <b>{r.userName}</b> senin kulübüne katılmak istiyor.
          </span>
          <div>
            <button onClick={() => handle(r, true)} className="mr-2 bg-green-500 text-white px-3 py-1 rounded">Kabul</button>
            <button onClick={() => handle(r, false)} className="bg-red-500 text-white px-3 py-1 rounded">Reddet</button>
          </div>
        </div>
      ))}
      {requests.length===0 && <p>Bekleyen istek yok.</p>}
    </div>
  );
}
