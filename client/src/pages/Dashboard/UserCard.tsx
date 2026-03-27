interface UserType {
  id: string;
  adSoyad: string;
  rol: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
  childId?: string[];
  email?: string;
  sifre?: string;
  meslek?: string;
  departman?: string;
  _showPassword?: boolean;
}

interface UserCardProps {
  user: UserType;
  isSelected: boolean;
  onEdit: (user: UserType) => void;
  onDelete: (userId: string) => void;
  onSelectParent: (user: UserType) => void;
}

export default function UserCard({
  user: u,
  isSelected,
  onEdit,
  onDelete,
  onSelectParent,
}: UserCardProps) {
  return (
    <div className={`user-card ${isSelected ? 'selected' : ''}`}>
      <div className="user-card-header">
        <div className="user-info">
          <div className="user-avatar">{u.adSoyad.charAt(0).toUpperCase()}</div>
          <div className="user-details">
            <h3>{u.adSoyad}</h3>
            <p>ID: {u.id}</p>
            <span className={`user-role role-${u.rol}`}>
              {u.rol === 'admin'
                ? 'Yönetici'
                : u.rol === 'teacher'
                  ? 'Öğretmen'
                  : u.rol === 'student'
                    ? `Öğrenci ${u.pansiyon ? '(Yatılı)' : '(Gündüzlü)'}`
                    : u.rol === 'parent'
                      ? 'Veli'
                      : u.rol === 'hizmetli'
                        ? 'Hizmetli'
                        : u.rol === 'ziyaretci'
                          ? 'Ziyaretçi'
                          : u.rol}
            </span>
          </div>
        </div>
      </div>
      <div className="user-card-body">
        <div className="user-stats">
          <div className="stat-item">
            <div className="stat-value">{u.sinif || '-'}</div>
            <div className="stat-label">Sınıf</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{u.sube || '-'}</div>
            <div className="stat-label">Şube</div>
          </div>
          {u.rol === 'student' && u.pansiyon && (
            <div className="stat-item">
              <div className="stat-value">{u.oda || '-'}</div>
              <div className="stat-label">Oda</div>
            </div>
          )}
          {u.rol === 'parent' && u.childId && u.childId.length > 0 && (
            <div className="stat-item" style={{ gridColumn: '1 / -1' }}>
              <div className="stat-value">{u.childId.length}</div>
              <div className="stat-label">Çocuk Sayısı</div>
            </div>
          )}
        </div>
        <div className="user-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(u)}>
            Düzenle
          </button>
          {u.rol === 'parent' && (
            <button className="btn btn-primary btn-sm" onClick={() => onSelectParent(u)}>
              Çocuk Eşleştir
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(u.id)}>
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}
