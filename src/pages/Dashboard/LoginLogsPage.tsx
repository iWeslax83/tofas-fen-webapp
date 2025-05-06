import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function LoginLogsPage() {
  useAuth(["admin"]);
  const logs = JSON.parse(localStorage.getItem("loginLogs") || "[]");
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
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 to-blue-100">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-800">Giriş Kayıtları</h2>
          {adSoyad && (
            <p className="text-sm text-gray-500">Merhaba, <span className="font-medium text-blue-700">{adSoyad}</span> (<span className="capitalize">{rol}</span>)</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300 rounded-xl overflow-hidden shadow-md">
            <thead className="bg-blue-100 text-blue-900">
              <tr>
                <th className="border p-3 text-left">Tarih</th>
                <th className="border p-3 text-left">ID</th>
                <th className="border p-3 text-left">Ad Soyad</th>
                <th className="border p-3 text-left">Rol</th>
              </tr>
            </thead>
            <tbody>
              {[...logs].reverse().map((log: any, index: number) => (
                <tr key={index} className="odd:bg-white even:bg-blue-50 text-gray-700">
                  <td className="border p-3">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="border p-3">{log.id}</td>
                  <td className="border p-3">{log.adSoyad}</td>
                  <td className="border p-3 capitalize">{log.rol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center">
          <a
            href={returnPath}
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-xl shadow hover:bg-blue-700 transition"
          >
            Panele Dön
          </a>
        </div>
      </div>
    </div>
  );
}
