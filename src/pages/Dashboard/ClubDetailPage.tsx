// src/pages/Dashboard/ClubDetailPage.tsx
import React, { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import studentData from "../../data/ogrenci_sifreleri.json";
import teacherData from "../../data/ogretmen_sifreleri.json";
import parentData from "../../data/veli_sifreleri.json";
import adminData from "../../data/yonetici_sifreleri.json";

type Role = "Üye" | "Başkan" | "Ana Başkan";

interface Club {
  id: string;
  name: string;
  members: string[];
  roles: Record<string, Role>;
  logo?: string;
}

interface ChatMsg { clubId: string; userId: string; userName: string; message: string; timestamp: number; }
interface Event   { clubId: string; id: string; title: string; date: string; description: string; }
interface Ann     { clubId: string; id: string; title: string; content: string; timestamp: number; }
interface Poll    { clubId: string; id: string; question: string; options: { text: string; votes: number }[]; timestamp: number; }
interface InviteRequest { clubId: string; userId: string; role: Role; timestamp: number; }

export default function ClubDetailPage() {
  useAuth(["student","teacher","admin"]);
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const me = JSON.parse(localStorage.getItem("activeUser") || "{}");
  const myId = me.id as string;

  const [club, setClub] = useState<Club | null>(null);
  const [tab, setTab] = useState<"info"|"members"|"chat"|"events"|"anns"|"polls">("info");
  const [chats, setChats] = useState<ChatMsg[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [anns, setAnns] = useState<Ann[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [requests, setRequests] = useState<InviteRequest[]>([]);

  const [newMsg, setNewMsg] = useState("");
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [anTitle, setAnTitle] = useState("");
  const [anContent, setAnContent] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("Üye");

  // Roller ve yetki kontrolleri
  const roleOf = (uid: string): Role => club?.roles[uid] || "Üye";
  const isAna  = roleOf(myId) === "Ana Başkan";
  const isPrez = isAna || roleOf(myId) === "Başkan";
  const isMem  = club?.members.includes(myId);

  const getNameById = (id: string) =>
    [...studentData, ...teacherData, ...parentData, ...adminData].find((u:any)=>u.id===id)?.adSoyad || id;

  // Kulübü kaydet ve state güncelle
  const saveClub = (updated: Club) => {
    const all = JSON.parse(localStorage.getItem("clubs") || "[]") as Club[];
    const out = all.map(c => c.id === updated.id ? updated : c);
    localStorage.setItem("clubs", JSON.stringify(out));
    setClub(updated);
  };

  // İlk yüklemede
  useEffect(() => {
    if (!clubId) return;
    const all = JSON.parse(localStorage.getItem("clubs") || "[]") as Club[];
    const found = all.find(c => c.id === clubId) || null;
    setClub(found);

    setChats(JSON.parse(localStorage.getItem("clubChats") || "[]").filter((m:ChatMsg)=> m.clubId === clubId));
    setEvents(JSON.parse(localStorage.getItem("clubEvents") || "[]").filter((e:Event)=> e.clubId === clubId));
    setAnns  (JSON.parse(localStorage.getItem("clubAnnouncements") || "[]").filter((a:Ann)=> a.clubId === clubId));
    setPolls (JSON.parse(localStorage.getItem("clubPolls") || "[]").filter((p:Poll)=>  p.clubId === clubId));
    setRequests(JSON.parse(localStorage.getItem("clubJoinRequests") || "[]").filter((r:InviteRequest)=> r.clubId === clubId));
  }, [clubId]);

  if (!club) return <div className="p-6">Yükleniyor…</div>;

  // --- Logo işlemleri ---
  const onLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isPrez) return;
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = { ...club, logo: reader.result as string };
        saveClub(updated);
      };
      reader.readAsDataURL(f);
    }
  };
  const removeLogo = () => {
    if (!isPrez) return;
    const updated = { ...club, logo: undefined };
    saveClub(updated);
  };

  // --- Chat işlemleri ---
  const handleSendMsg = (e: FormEvent) => {
    e.preventDefault();
    if (!isMem || !newMsg.trim()) return;
    const list = JSON.parse(localStorage.getItem("clubChats") || "[]") as ChatMsg[];
    list.push({ clubId: club.id, userId: myId, userName: me.adSoyad, message: newMsg.trim(), timestamp: Date.now() });
    localStorage.setItem("clubChats", JSON.stringify(list));
    setChats(list.filter(m => m.clubId === club.id));
    setNewMsg("");
  };
  const deleteMsg = (ts: number) => {
    const list = JSON.parse(localStorage.getItem("clubChats") || "[]") as ChatMsg[];
    const kept = list.filter(m => m.timestamp !== ts || (m.userId !== myId && !isPrez));
    localStorage.setItem("clubChats", JSON.stringify(kept));
    setChats(kept.filter(m => m.clubId === club.id));
  };

  // --- Event & Announcements ---
  const addEvent = (e: FormEvent) => {
    e.preventDefault();
    if (!isPrez || !evTitle || !evDate) return;
    const list = JSON.parse(localStorage.getItem("clubEvents") || "[]") as Event[];
    list.push({ clubId: club.id, id: Date.now().toString(), title: evTitle, date: evDate, description: evDesc });
    localStorage.setItem("clubEvents", JSON.stringify(list));
    setEvents(list.filter(ev => ev.clubId === club.id));
    setEvTitle(""); setEvDate(""); setEvDesc("");
  };
  const addAnn = (e: FormEvent) => {
    e.preventDefault();
    if (!isPrez || !anTitle || !anContent) return;
    const list = JSON.parse(localStorage.getItem("clubAnnouncements") || "[]") as Ann[];
    list.push({ clubId: club.id, id: Date.now().toString(), title: anTitle, content: anContent, timestamp: Date.now() });
    localStorage.setItem("clubAnnouncements", JSON.stringify(list));
    setAnns(list.filter(a => a.clubId === club.id));
    setAnTitle(""); setAnContent("");
  };

  // --- Üye at ve rol değiştir ---
  const kickMember = (uid: string) => {
    if (!isPrez || uid === myId) return;
    const targetRole = roleOf(uid);
    if (!isAna && (targetRole === "Başkan" || targetRole === "Ana Başkan")) {
      alert("Başkanları veya Ana Başkanı atamazsınız.");
      return;
    }
    if (isAna && targetRole === "Ana Başkan") {
      alert("Ana Başkanı atamazsınız.");
      return;
    }
    if (!window.confirm(`${getNameById(uid)} atılsın mı?`)) return;
    const updated = {
      ...club,
      members: club.members.filter(m => m !== uid),
      roles: Object.fromEntries(Object.entries(club.roles).filter(([k]) => k !== uid))
    };
    saveClub(updated);
  };
  const changeRole = (uid: string, newRole: Role) => {
    const currentRole = roleOf(uid);
  
    // Başkanlar Ana Başkanın rolünü değiştiremesin
    if (!isAna && currentRole === "Ana Başkan") {
      alert("Ana Başkanın rolünü değiştiremezsiniz.");
      return;
    }
  
    // Ana Başkan değilse: yalnızca Üye <-> Başkan dönüşümüne izin verilir
    if (!isAna) {
      if (newRole === "Ana Başkan") {
        alert("Ana Başkan yalnızca Ana Başkan tarafından atanabilir.");
        return;
      }
    }
  
    // Başkan diğer başkanların rolünü değiştiremesin
    if (!isAna && currentRole === "Başkan") {
      alert("Diğer başkanların rolünü değiştiremezsiniz.");
      return;
    }
  
    const roles = { ...club.roles, [uid]: newRole };
  
    // Eğer birisini Ana Başkan yaptıysak, önceki Ana Başkanlar Başkan yapılır
    if (newRole === "Ana Başkan") {
      Object.entries(roles).forEach(([k, v]) => {
        if (k !== uid && v === "Ana Başkan") roles[k] = "Başkan";
      });
    }
  
    const updated = { ...club, roles };
    saveClub(updated);
  };
  


  // --- Davet işlemleri ---
  const sendInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!isPrez || !inviteId.trim()) return;
    const all = [...studentData, ...teacherData, ...parentData, ...adminData];
    if (!all.find(u => u.id === inviteId)) { alert("Bulunamadı"); return; }
    const reqs = JSON.parse(localStorage.getItem("clubJoinRequests") || "[]") as InviteRequest[];
    if (!reqs.some(r => r.clubId === club.id && r.userId === inviteId)) {
      reqs.push({ clubId: club.id, userId: inviteId, role: inviteRole, timestamp: Date.now() });
      localStorage.setItem("clubJoinRequests", JSON.stringify(reqs));
      setRequests(reqs.filter(r => r.clubId === club.id));
    }
    setInviteId("");
  };
  const approveRequest = (r: InviteRequest) => {
    if (!isPrez) return;
    const newClubs = JSON.parse(localStorage.getItem("clubs") || "[]") as Club[];
    newClubs.forEach(c => {
      if (c.id === club.id) {
        if (!c.members.includes(r.userId)) {
          c.members.push(r.userId);
          c.roles[r.userId] = r.role;
        }
      }
    });
    localStorage.setItem("clubs", JSON.stringify(newClubs));
    saveClub(newClubs.find(c => c.id === club.id)!);
    const rem = JSON.parse(localStorage.getItem("clubJoinRequests") || "[]") as InviteRequest[];
    const kept = rem.filter(x => !(x.clubId===r.clubId && x.userId===r.userId));
    localStorage.setItem("clubJoinRequests", JSON.stringify(kept));
    setRequests(kept.filter(x => x.clubId === club.id));
  };
  const rejectRequest = (r: InviteRequest) => {
    if (!isPrez) return;
    const rem = JSON.parse(localStorage.getItem("clubJoinRequests") || "[]") as InviteRequest[];
    const kept = rem.filter(x => !(x.clubId===r.clubId && x.userId===r.userId));
    localStorage.setItem("clubJoinRequests", JSON.stringify(kept));
    setRequests(kept.filter(x => x.clubId === club.id));
  };

  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="mb-4 btn">← Geri</button>

      {/* Header */}
      <div className="flex items-center mb-4 gap-4">
        {club.logo && <img src={club.logo} alt="" className="h-10 w-10 rounded-full" />}
        <h1 className="text-2xl font-bold">{club.name}</h1>
        {isPrez && <input type="file" accept="image/*" onChange={onLogoChange} />}
        {club.logo && isPrez && <button onClick={removeLogo} className="text-red-600">Logoyu Sil</button>}
      </div>

      {/* Tabs */}
      <nav className="flex gap-4 border-b pb-2 mb-6">
        {(["info","members","chat","events","anns","polls"] as const).map(k => (
          <button
            key={k}
            disabled={["chat","events","anns","polls"].includes(k) && !isMem}
            className={tab===k ? "font-bold" : ""}
            onClick={()=>setTab(k)}
          >
            {{
              info: "Bilgi",
              members: "Üyeler",
              chat: "Sohbet",
              events: "Etkinlik",
              anns: "Duyurular",
              polls: "Oylama"
            }[k]}
          </button>
        ))}
      </nav>

      {/* INFO */}
      {tab === "info" && (
        <div>
          <p><strong>Ana Başkan:</strong> {Object.entries(club.roles).filter(([_,r]) => r==="Ana Başkan").map(([u]) => getNameById(u)).join(", ") || "-"}</p>
          <p><strong>Başkanlar:</strong> {Object.entries(club.roles).filter(([_,r]) => r==="Başkan").map(([u]) => getNameById(u)).join(", ") || "-"}</p>
          <div className="dashboard-cards">
  <div className="stat-card">
    <h3>Toplam Kulüp Üye Sayısı</h3>
    <p>{club.members.length}</p>
  </div>
  <div className="stat-card">
    <h3>Duyurular</h3>
    <p>{anns.length}</p>
  </div>
</div>

          {isPrez && (
            <form onSubmit={sendInvite} className="mt-4 flex gap-2">
              <input
                type="text"
                value={inviteId}
                onChange={e => setInviteId(e.target.value)}
                placeholder="ID ile davet"
                className="border p-2 flex-1"
              />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)} className="border p-2">
                <option>Üye</option>
                <option>Başkan</option>
              </select>
              <button type="submit" className="bg-blue-600 text-white px-4">Davet Et</button>
            </form>
          )}

          {isPrez && requests.length > 0 && (
            <div className="mt-6">
              <h2 className="font-semibold mb-2">Gelen Davetler</h2>
              {requests.map(r => (
                <div key={r.userId} className="flex items-center gap-4 mb-2">
                  <span>{getNameById(r.userId)} — {r.role}</span>
                  <button onClick={() => approveRequest(r)} className="bg-green-500 text-white px-2">Onayla</button>
                  <button onClick={() => rejectRequest(r)} className="bg-red-500 text-white px-2">Reddet</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

{/* MEMBERS */}
{tab === "members" && (
        <div>
          {club.members.length === 0
            ? <p>Henüz üye yok.</p>
            : (
              <ul className="space-y-2">
                {club.members.map(uid => (
                  <li key={uid} className="flex justify-between items-center border p-3 rounded">
                    <span>{getNameById(uid)} — <em>{roleOf(uid)}</em></span>
                    {isPrez && uid !== myId && (
                      <div className="flex gap-2">
                        <select
                          value={roleOf(uid)}
                          onChange={e => changeRole(uid, e.target.value as Role)}
                          className="border px-2"
                        >
                          <option>Üye</option>
                          <option>Başkan</option>
                          {isAna && <option>Ana Başkan</option>}
                        </select>
                        <button onClick={() => kickMember(uid)} className="text-red-600">At</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
      {/* CHAT */}
      {tab === "chat" && (
        <div>
          <div className="h-64 overflow-y-auto border p-2 mb-2">
            {chats.map(m => (
              <div key={m.timestamp} className="flex justify-between">
                <span><strong>{m.userName}:</strong> {m.message}</span>
                {(m.userId === myId || isPrez) && (
                  <button onClick={() => deleteMsg(m.timestamp)} className="text-sm text-red-600">Sil</button>
                )}
              </div>
            ))}
          </div>
          {isMem && (
            <form onSubmit={handleSendMsg} className="flex gap-2">
              <input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder="Mesaj yaz..."
                className="flex-1 border p-2"
              />
              <button type="submit" className="bg-blue-600 text-white px-4">Gönder</button>
            </form>
          )}
        </div>
      )}

      {/* EVENTS */}
      {tab === "events" && (
        <div>
          {isPrez
            ? (
              <form onSubmit={addEvent} className="mb-4 space-y-2">
                <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Başlık" className="border p-2 w-full"/>
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="border p-2 w-full"/>
                <textarea value={evDesc} onChange={e => setEvDesc(e.target.value)} placeholder="Açıklama" className="border p-2 w-full"/>
                <button type="submit" className="bg-green-600 text-white px-4">Etkinlik Ekle</button>
              </form>
            )
            : <p className="italic">Sadece Başkan ekleyebilir.</p>
          }
          {events.map(ev => (
            <div key={ev.id} className="border p-3 mb-2 rounded">
              <h4 className="font-semibold">{ev.title} — {ev.date}</h4>
              <p>{ev.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* ANNOUNCEMENTS */}
      {tab === "anns" && (
        <div>
          {isPrez
            ? (
              <form onSubmit={addAnn} className="mb-4 space-y-2">
                <input value={anTitle} onChange={e => setAnTitle(e.target.value)} placeholder="Başlık" className="border p-2 w-full"/>
                <textarea value={anContent} onChange={e => setAnContent(e.target.value)} placeholder="İçerik" className="border p-2 w-full"/>
                <button type="submit" className="bg-orange-600 text-white px-4">Duyuru Ekle</button>
              </form>
            )
            : <p className="italic">Sadece Başkan ekleyebilir.</p>
          }
          {anns.map(a => (
            <div key={a.id} className="border p-3 mb-2 rounded">
              <h4 className="font-semibold">{a.title}</h4>
              <p>{a.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* POLLS */}
      {tab === "polls" && (
        <div>
          {/* Oylama formu / sonuçları buraya */}
        </div>
      )}
    </div>
  );
}
