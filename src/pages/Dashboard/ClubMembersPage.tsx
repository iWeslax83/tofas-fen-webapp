// src/pages/Dashboard/ClubMembersPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ClubMembersPage() {
  const { clubId } = useParams<{clubId:string}>();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser")!);
  const [club, setClub] = useState<any>(null);

  useEffect(() => {
    async function effect() {
      const clubs = JSON.parse(localStorage.getItem("clubs")!);
      const c = clubs.find((c: any) => c.id === clubId);
      if (!c || c.presidentId !== user.id) return navigate("/login");
      setClub(c);
    }
    effect();
  }, [clubId, navigate, user]);

  const changeRole = (memberId: string, newRole: string) => {
    const clubs = JSON.parse(localStorage.getItem("clubs")!);
    const c = clubs.find((c: any) => c.id === clubId);
    c.roles[memberId] = newRole;
    localStorage.setItem("clubs", JSON.stringify(clubs));
    setClub({...c});
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">{club?.name} Üyeleri</h2>
      {club?.members.map((mid:string) => (
        <div key={mid} className="border p-3 mb-2 flex justify-between items-center">
          <span>{mid} – {club.roles[mid]}</span>
          {mid !== user.id && (
            <select
              value={club.roles[mid]}
              onChange={e => changeRole(mid, e.target.value)}
              className="border p-1 rounded"
            >
              {["Üye","Yönetici","Başkan Yardımcısı","Onursal Üye"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
