import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function ParentPanel() {
  useAuth(["parent"]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser") || "null");

  useEffect(() => {
    if (!user || user.rol !== "parent") {
      navigate("/parent", { replace: true });
    }
  }, [navigate, user]);

  const handleLogout = () => {
    localStorage.removeItem("activeUser");
    window.location.href = "/login";
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Veli Paneli</h1>
      <p>Hoş geldiniz, {user.adSoyad || "veli"}!</p>
      <div className="user-profile-card">
  <img src="https://api.dicebear.com/7.x/thumbs/svg?seed=TofasUser" alt="avatar" />
  <div>
    <h3>{user.adSoyad}</h3>
    <p></p>
  </div>
</div>
      <div className="tofas-button-group">

      <div className="my-6">
        <Link
          to="/parent/odevler"
          className="panel-button"
          >
          📘 Ödevler
        </Link>
      </div>
      <div className="my-6">
        <Link
          to="/parent/ders-programi"
          className="panel-button"
          >
          🗓️ Ders Programı
        </Link>
      </div>
      <div className="my-6">
        <Link
          to="/parent/notlar"
          className="panel-button"
          >
          📝 Notlar
          </Link>
      </div>

      <div className="my-6">
        <Link
          to="/parent/duyurular"
          className="panel-button"
          >
          📢 Duyurular
        </Link>
      </div>
      </div>

      <button onClick={handleLogout} className="bg-red-600 text-white p-2 mt-4 rounded">
        Çıkış Yap
      </button>
    </div>
  );
}
