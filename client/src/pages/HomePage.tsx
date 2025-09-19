import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="home-page">
      <h1>TOFAŞ Fen Lisesi Bilgi Sistemi</h1>
      <div className="links-container">
        <Link to="/login" className="login-link">
          Giriş Yap
        </Link>
      </div>
    </div>
  );
}