// File: src/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import studentCredentials from "../data/ogrenci_sifreleri.json";
import parentCredentials from "../data/veli_sifreleri.json";
import teacherCredentials from "../data/ogretmen_sifreleri.json";
import adminCredentials from "../data/yonetici_sifreleri.json";


interface User {
  id: string;
  sifre: string;
  adSoyad?: string;
}

export function LoginPage() {
  const [id, setId] = useState("");
  const [sifre, setSifre] = useState("");
  const [rolBulundu, setRolBulundu] = useState("");
  const [adSoyad, setAdSoyad] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("activeUser") || "null");
    if (user?.rol) {
      navigate(`/dashboard/${user.rol}`);
    }
  }, [navigate]);

  const handleLogin = () => {
    const roleOrder: { data: User[]; rol: string }[] = [
      { data: adminCredentials as User[], rol: "admin" },
      { data: teacherCredentials as User[], rol: "teacher" },
      { data: parentCredentials as User[], rol: "parent" },
      { data: studentCredentials as User[], rol: "student" },
    ];

    for (const { data, rol } of roleOrder) {
      const match = data.find((u) => u.id === id && u.sifre === sifre);
      if (match) {
        const userWithRole = { ...match, rol };
        localStorage.setItem("activeUser", JSON.stringify(userWithRole));
        localStorage.setItem("loginTime", Date.now().toString());

        setRolBulundu(rol);
        setAdSoyad(match.adSoyad || "");

        const logEntry = {
          timestamp: new Date().toISOString(),
          id: match.id,
          adSoyad: match.adSoyad || "",
          rol,
        };

        const logs = JSON.parse(localStorage.getItem("loginLogs") || "[]");
        logs.push(logEntry);
        localStorage.setItem("loginLogs", JSON.stringify(logs));

        setTimeout(() => navigate(`/dashboard/${rol}`), 500);
        return;
      }
    }

    setError(true);
  };
  

  return (
    
    <div
      className="login-bg"
      style={{ backgroundImage: 'url("/bg-okul.jpg")', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>

      <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="login-card relative">
      <img src='/tofaslogo.png' alt='logo' className='absolute top-4 right-4 w-10 h-10 rounded-full border-[2px] border-white shadow-md bg-white z-30 ring-2 ring-blue-400' />
      <h2 className="text-2xl font-bold text-center text-blue-800 mb-8 drop-shadow-lg">
          <span className='text-3xl md:text-4xl font-extrabold tracking-wide font-serif drop-shadow'>TOFAŞ Fen Lisesi</span>
          <br />
          <span className='text-base md:text-lg font-medium text-blue-600'>Bilgi Sistemi Giriş</span>
        </h2>

{/* Kullanıcı ID alanı (düzenlenmiş) */}
<div className="w-full mb-4">
  <div className="flex items-center gap-3">
    <label className="text-sm text-gray-600 whitespace-nowrap w-20">Kullanıcı ID: </label>
    <input
      className="border border-gray-300 rounded-lg p-2 w-full pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
      placeholder="Kullanıcı ID"
      value={id}
      onChange={(e) => setId(e.target.value)}
    />
  </div>
</div>


<div className="w-full mb-4">
  <div className="flex items-center gap-3">
    <label className="text-sm text-gray-600 whitespace-nowrap w-20">Şifre: </label>
      {/* Şifre input'u */}
      <input
        className="border border-gray-300 rounded-lg p-2 w-full pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
        type={showPassword ? "text" : "password"}
        placeholder="Şifre"
        value={sifre}
        onChange={(e) => setSifre(e.target.value)}
        onFocus={() => setShowPassword(false)}
      />
      
      {/* Göster/Gizle butonu */}
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 cursor-pointer"
      >
        {showPassword ? "🙈" : "👁"}
      </button>
    </div>
  </div>



        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 rounded-xl shadow-md hover:shadow-xl transition duration-300">
          Giriş Yap
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg">
            Kullanıcı ID veya şifre hatalı. Lütfen tekrar deneyin.
          </div>
        )}

        {rolBulundu && (
          <p className="mt-4 text-center text-green-600">
            {adSoyad && <span>{adSoyad} - </span>}
            {rolBulundu.toUpperCase()} olarak giriş yapılıyor...
          </p>
        )}
      </form>
    </div>
  );
}
