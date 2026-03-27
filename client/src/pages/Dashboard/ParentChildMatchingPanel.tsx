import { useState } from 'react';
import { Users, Plus, X, Save } from 'lucide-react';

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

interface ParentChildMatchingPanelProps {
  selectedParent: UserType;
  users: UserType[];
  selectedChildren: string[];
  saving: boolean;
  error: string;
  onToggleChild: (studentId: string) => void;
  onManualAssign: (studentId: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function ParentChildMatchingPanel({
  selectedParent,
  users,
  selectedChildren,
  saving,
  error,
  onToggleChild,
  onManualAssign,
  onSave,
  onCancel,
}: ParentChildMatchingPanelProps) {
  const [manualAssignId, setManualAssignId] = useState('');
  const [manualAssignError, setManualAssignError] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');

  const filteredStudents = users
    .filter((u) => u.rol === 'student')
    .filter((student) => {
      const matchesSearch =
        studentSearch === '' || student.adSoyad.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesClass = studentClassFilter === '' || student.sinif === studentClassFilter;
      return matchesSearch && matchesClass;
    });

  const handleManualAssign = () => {
    const student = users.find((u) => u.id === manualAssignId && u.rol === 'student');
    if (!student) {
      setManualAssignError('Geçersiz öğrenci ID!');
      return;
    }
    if (selectedChildren.includes(student.id)) {
      setManualAssignError('Bu öğrenci zaten ekli.');
      return;
    }
    onManualAssign(student.id);
    setManualAssignId('');
    setManualAssignError('');
  };

  return (
    <div className="parent-child-matching-panel">
      <div className="matching-header">
        <h3 className="matching-title">
          <Users size={20} />
          Veli: {selectedParent.adSoyad}
        </h3>
        <p className="matching-description">
          Aşağıdan bu veliye ait çocuk(ları) seçin. Kaydet butonuna basınca veritabanına işlenecek.
        </p>
      </div>

      {/* Manual assign by ID */}
      <div className="manual-assign-section">
        <div className="manual-assign-header">
          <span className="manual-assign-label">Hangi çocuğa (ID) eşleştirmek istersiniz?</span>
          <div className="manual-assign-input-group">
            <input
              type="text"
              className="form-input manual-assign-input"
              placeholder="Öğrenci ID girin"
              value={manualAssignId}
              onChange={(e) => setManualAssignId(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleManualAssign}>
              <Plus size={16} />
              Ekle
            </button>
          </div>
        </div>
        {manualAssignError && <div className="error-message">{manualAssignError}</div>}
      </div>

      {/* Student selection */}
      <div className="student-selection-section">
        <div className="student-selection-header">
          <h4 className="section-subtitle">Mevcut Öğrenciler</h4>
          <div className="student-search-filter">
            <input
              type="text"
              className="form-input student-search"
              placeholder="Öğrenci adı ile ara..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            <select
              className="form-select student-filter"
              value={studentClassFilter}
              onChange={(e) => setStudentClassFilter(e.target.value)}
            >
              <option value="">Tüm Sınıflar</option>
              <option value="9">9. Sınıf</option>
              <option value="10">10. Sınıf</option>
              <option value="11">11. Sınıf</option>
              <option value="12">12. Sınıf</option>
            </select>
          </div>
        </div>
        <div className="senkronizasyon-student-grid">
          {filteredStudents.map((student) => (
            <label key={student.id} className="student-checkbox-item">
              <input
                type="checkbox"
                checked={selectedChildren.includes(student.id)}
                onChange={() => onToggleChild(student.id)}
                className="student-checkbox"
              />
              <div className="student-info">
                <span className="student-name">{student.adSoyad}</span>
                <span className="student-class">
                  {student.sinif || '-'}/{student.sube || '-'}
                </span>
                {student.pansiyon && <span className="student-dormitory">Yatılı</span>}
              </div>
            </label>
          ))}
          {filteredStudents.length === 0 && (
            <div className="no-students-found">
              <p>Arama kriterlerine uygun öğrenci bulunamadı.</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected children summary */}
      {selectedChildren.length > 0 && (
        <div className="selected-children-summary">
          <h4 className="section-subtitle">Seçilen Çocuklar ({selectedChildren.length})</h4>
          <div className="selected-children-list">
            {selectedChildren.map((childId) => {
              const child = users.find((u) => u.id === childId);
              return child ? (
                <div key={childId} className="selected-child-item">
                  <span className="child-name">{child.adSoyad}</span>
                  <span className="child-class">
                    {child.sinif || '-'}/{child.sube || '-'}
                  </span>
                  <button className="remove-child-btn" onClick={() => onToggleChild(childId)}>
                    <X size={14} />
                  </button>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Error and success messages */}
      {error && <div className="error-message">{error}</div>}

      {/* Action buttons */}
      <div className="matching-actions">
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <div className="loading-spinner"></div>
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save size={16} />
              Kaydet
            </>
          )}
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          <X size={16} />
          İptal
        </button>
      </div>
    </div>
  );
}
