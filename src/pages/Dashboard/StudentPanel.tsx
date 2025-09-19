import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function StudentPanel() {
  useAuth(["student"]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser") || "null");

  const handleLogout = () => {
    localStorage.removeItem("activeUser");
    window.location.href = "/login";
  };

  useEffect(() => {
    if (!user || user.rol !== "student") {
      navigate("/login", { replace: true });
    }
  }, [navigate, user]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#1c1c1c] text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Öğrenci Paneli</h1>
      <p>Hoş geldiniz, {user.adSoyad || "öğrenci"}!</p>
      <div className="user-profile-card">
  <img src="https://api.dicebear.com/7.x/thumbs/svg?seed=TofasUser" alt="avatar" />
  <div>
    <h3>{user.adSoyad}</h3>
    <p>{user.sinif}/{user.sube}</p>
  </div>
</div>

      <div className="tofas-button-group">
        <div className="mb-4">
          <Link
            to="/student/odevler"
            className="panel-button"
            >
            📘 Ödevler
          </Link>
        </div>
        <div className="mb-4">
          <Link
            to="/student/ders-programi"
            className="panel-button"
            >
            🗓️ Ders Programı
          </Link>
        </div>
        <div className="mb-4">
          <Link
            to="/student/notlar"
            className="panel-button"
            >
            📝 Notlar
          </Link>
        </div>
        <div className="mb-4">
          <Link
            to="/student/duyurular"
            className="panel-button"
            >
            📢 Duyurular
          </Link>
        </div>
        <div className="mb-4">
          <Link
            to="/student/kulupler"
            className="panel-button"
            >
            🤝 Kulüpler ve Topluluklar
          </Link>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-500 text-white p-2 mt-4 rounded w-full"
      >
        Çıkış Yap
      </button>
    </div>
  );
}