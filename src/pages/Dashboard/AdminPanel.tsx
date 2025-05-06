import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function AdminPanel() {
  useAuth(["admin"]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser") || "null");

  useEffect(() => {
    if (!user || user.rol !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [navigate, user]);

  const handleLogout = () => {
    localStorage.removeItem("activeUser");
    navigate("/login", { replace: true });
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Yönetici Paneli</h1>
      <p>Hoş geldiniz, {user.adSoyad || "yönetici"}!</p>
      <div className="user-profile-card">
  <img src="https://api.dicebear.com/7.x/thumbs/svg?seed=TofasUser" alt="avatar" />
  <div>
    <h3>{user.adSoyad}</h3>
    <p></p>
  </div>
</div>
      <div className="tofas-button-group">
        <div className="mb-4">
          <Link
            to="/admin/odevler"
            className="panel-button"
                                  >
            📘 Ödevler
          </Link>
        </div>
        <div className="mb-4">
          <Link
            to="/admin/ders-programi"
            className="panel-button"
            >
            🗓️ Ders Programı
          </Link>
        </div>
        <div className="mb-4">
          <Link
            to="/admin/duyurular"
            className="panel-button"
            >
            📢 Duyurular
          </Link>
        </div>
        <div className="mb-4">
          <Link
            to="/admin/not-ekle"
            className="panel-button"
            >
            📝 Not Ekle
          </Link>
        </div>
        <div className="mb-4">
          <Link
            to="/admin/kulupler"
            className="panel-button"
            >
            🤝 Kulüpler ve Topluluklar
          </Link>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-600 text-white p-2 mt-4 rounded w-full"
      >
        Çıkış Yap
      </button>
      
    </div>
    
  );
}
