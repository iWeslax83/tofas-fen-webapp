import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function TeacherPanel() {
  useAuth(["teacher"]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser") || "null");

  useEffect(() => {
    if (!user || user.rol !== "teacher") {
      navigate("/teacher", { replace: true });
    }
  }, [navigate, user]);
  const handleLogout = () => {
    localStorage.removeItem("activeUser");
    window.location.href = "/login";
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Öğretmen Paneli</h1>
      <p>Hoş geldiniz, {user.adsoyad || "öğretmen"}!</p>
      <div className="user-profile-card">
  <img src="https://api.dicebear.com/7.x/thumbs/svg?seed=TofasUser" alt="avatar" />
  <div>
    <h3>{user.adSoyad}</h3>
    <p></p>
  </div>
</div>
      <div className="tofas-button-group">
      <Link
          to="/admin/odevler"
          className="panel-button"
          >
          📘 Ödevler
        </Link>
      </div>
      <div className="my-6">
        <Link
          to="/teacher/ders-programi"
          className="panel-button"
          >
          🗓️ Öğretmen Ders Programı 
        </Link>
      </div>

      <div className="my-6">
        <Link
          to="/teacher/duyurular"
          className="panel-button"
          >
          📢 Duyurular
        </Link>
      </div>
      <div className="my-6">
        <Link
          to="/teacher/not-ekle"
          className="panel-button"
          >
          📝 Not Ekle
        </Link>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-600 text-white p-2 mt-4"
      >
        Çıkış Yap
      </button>
    </div>
  );
}