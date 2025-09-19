// src/pages/JoinClubPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function JoinClubPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser")!);

  useEffect(() => {
    const requests = JSON.parse(localStorage.getItem("clubRequests") || "[]");
    // Aynı istek birden fazla gitmesin:
    const exists = requests.some((r: any) => r.clubId === clubId && r.userId === user.id);
    if (!exists) {
      requests.push({ clubId, userId: user.id, userName: user.adSoyad });
      localStorage.setItem("clubRequests", JSON.stringify(requests));
    }
    // Başkanın paneline yönlendir:
    navigate(`/${user.rol}/kulup-istekleri`);
  }, [clubId, navigate, user]);

  return <p>Katılım isteğiniz gönderildi, başkan onaylayacak...</p>;
}
