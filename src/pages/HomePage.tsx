import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">TOFAŞ Fen Lisesi Bilgi Sistemi</h1>
      <div className="space-x-4">
        <Link to="/login" className="text-blue-600 underline">
          Giriş Yap
        </Link>
      </div>
    </div>
  );
}