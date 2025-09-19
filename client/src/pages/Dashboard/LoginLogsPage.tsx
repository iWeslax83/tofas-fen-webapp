import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
// import { UserService } from "../../utils/apiService"; // Not used
// import { useAuthContext } from "../../contexts/AuthContext"; // Not used

export function LoginLogsPage() {
  useAuth(["admin"]);
  // const { user } = useAuthContext(); // Not used
  const [returnPath, setReturnPath] = useState("/dashboard");
  const [adSoyad, setAdSoyad] = useState("");
  const [rol, setRol] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("activeUser") || "null");
    const loginTime = localStorage.getItem("loginTime");
    const now = Date.now();
    const expiry = 24 * 60 * 60 * 1000;

    if (!user?.rol || !loginTime || now - Number(loginTime) > expiry) {
      localStorage.removeItem("activeUser");
      localStorage.removeItem("loginTime");
      navigate("/login");
    } else {
      setReturnPath(`/dashboard/${user.rol}`);
      setAdSoyad(user.adSoyad || "");
      setRol(user.rol);
    }
  }, [navigate]);

  return (
    <div className="login-logs-page">
      <div className="login-logs-container">
        <div className="login-logs-header">
          <div className="header-left">
            <h2 className="login-logs-title">Giriş Kayıtları</h2>
            {adSoyad && (
              <p className="login-logs-user">
                Merhaba, <span className="user-name">{adSoyad}</span> (<span className="user-role">{rol}</span>)
              </p>
            )}
          </div>
          <div className="header-right">
          </div>
        </div>
        <div className="login-logs-table-container">
          <table className="login-logs-table">
            <thead className="login-logs-thead">
              <tr>
                <th className="login-logs-th">Tarih</th>
                <th className="login-logs-th">ID</th>
                <th className="login-logs-th">Ad Soyad</th>
                <th className="login-logs-th">Rol</th>
              </tr>
            </thead>
            <tbody>
              {/* Removed all localStorage usage for login logs */}
            </tbody>
          </table>
        </div>

        <div className="login-logs-actions">
          <a
            href={returnPath}
            className="login-logs-button"
          >
            Panele Dön
          </a>
        </div>
      </div>
    </div>
  );
}
