export function VisitorPanel() {
    const user = JSON.parse(localStorage.getItem("activeUser") || "{}");
  
    const handleLogout = () => {
      localStorage.removeItem("activeUser");
      window.location.href = "/login";
    };
  
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Ziyaretçi Paneli</h1>
        <p>Hoş geldiniz, {user.adsoyad || "ziyaretçi"}!</p>
        <button onClick={handleLogout} className="bg-red-600 text-white p-2 mt-4">Çıkış Yap</button>
      </div>
    );
  }