import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Plus, 
  Edit,
  Trash2,
  Link,
  Unlink,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { SecureAPI } from '../../utils/api';
import { useAuthContext } from '../../contexts/AuthContext';

interface User {
  id: string;
  adSoyad: string;
  rol: string;
  email?: string;
  sinif?: string;
  sube?: string;
  childId?: string[];
}

interface ParentChildLink {
  parentId: string;
  childId: string;
  parentName: string;
  childName: string;
  linkedAt: string;
}

export default function ParentChildManagement() {
  const { user } = useAuthContext();
  const [users, setUsers] = useState<User[]>([]);
  const [parents, setParents] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [linkedPairs, setLinkedPairs] = useState<ParentChildLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, parentsRes, studentsRes] = await Promise.all([
        SecureAPI.get('/api/user'),
        SecureAPI.get('/api/user?role=parent'),
        SecureAPI.get('/api/user?role=student')
      ]);

      const usersData = (usersRes as any).data || [];
      const parentsData = (parentsRes as any).data || [];
      const studentsData = (studentsRes as any).data || [];

      setUsers(usersData);
      setParents(parentsData);
      setStudents(studentsData);

      // Build linked pairs from user data
      const pairs: ParentChildLink[] = [];
      parentsData.forEach((parent: User) => {
        if (parent.childId && parent.childId.length > 0) {
          parent.childId.forEach(childId => {
            const child = studentsData.find(s => s.id === childId);
            if (child) {
              pairs.push({
                parentId: parent.id,
                childId: child.id,
                parentName: parent.adSoyad,
                childName: child.adSoyad,
                linkedAt: new Date().toISOString() // This would come from the database in a real app
              });
            }
          });
        }
      });

      setLinkedPairs(pairs);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLinkParentChild = async () => {
    if (!selectedParent || !selectedChild) {
      setError('Lütfen veli ve öğrenci seçin');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      await SecureAPI.post('/api/user/parent-child-link', {
        parentId: selectedParent,
        childId: selectedChild
      });

      setSuccessMessage('Veli-öğrenci bağlantısı başarıyla kuruldu');
      setSelectedParent('');
      setSelectedChild('');
      setShowLinkForm(false);
      
      // Refresh data
      setTimeout(() => {
        fetchData();
        setSuccessMessage(null);
      }, 2000);

    } catch (err) {
      console.error('Error linking parent-child:', err);
      setError('Bağlantı kurulurken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlinkParentChild = async (parentId: string, childId: string) => {
    try {
      setProcessing(true);
      setError(null);

      await SecureAPI.delete('/api/user/parent-child-link', {
        data: { parentId, childId }
      });

      setSuccessMessage('Veli-öğrenci bağlantısı kaldırıldı');
      
      // Refresh data
      setTimeout(() => {
        fetchData();
        setSuccessMessage(null);
      }, 2000);

    } catch (err) {
      console.error('Error unlinking parent-child:', err);
      setError('Bağlantı kaldırılırken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const filteredParents = parents.filter(parent =>
    parent.adSoyad.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter(student =>
    student.adSoyad.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLinkedPairs = linkedPairs.filter(pair =>
    pair.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pair.childName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Veli-Öğrenci Yönetimi</h1>
            <p className="text-gray-600 mt-2">Veli ve öğrenci bağlantılarını yönetin</p>
          </div>
          <button
            onClick={() => setShowLinkForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Link className="h-4 w-4" />
            Yeni Bağlantı
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3"
          >
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3"
          >
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Veli veya öğrenci ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Linked Pairs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Mevcut Bağlantılar ({filteredLinkedPairs.length})
            </h2>
          </div>
          
          <div className="p-6">
            {filteredLinkedPairs.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz bağlantı yok</h3>
                <p className="text-gray-600">Yeni veli-öğrenci bağlantısı ekleyerek başlayın</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLinkedPairs.map((pair, index) => (
                  <motion.div
                    key={`${pair.parentId}-${pair.childId}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        Bağlantı #{index + 1}
                      </span>
                      <button
                        onClick={() => handleUnlinkParentChild(pair.parentId, pair.childId)}
                        disabled={processing}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Bağlantıyı kaldır"
                      >
                        <Unlink className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Veli</div>
                        <div className="text-sm font-semibold text-gray-900">{pair.parentName}</div>
                        <div className="text-xs text-gray-500">ID: {pair.parentId}</div>
                      </div>
                      
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <Link className="h-3 w-3 text-blue-600" />
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Öğrenci</div>
                        <div className="text-sm font-semibold text-gray-900">{pair.childName}</div>
                        <div className="text-xs text-gray-500">ID: {pair.childId}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Veli</p>
                <p className="text-2xl font-bold text-gray-900">{parents.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Öğrenci</p>
                <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Bağlantı</p>
                <p className="text-2xl font-bold text-gray-900">{linkedPairs.length}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Link className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Link Form Modal */}
        {showLinkForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Yeni Veli-Öğrenci Bağlantısı</h2>
              
              <div className="parent-child-form-list">
                {/* Parent Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Veli Seçin
                  </label>
                  <select
                    value={selectedParent}
                    onChange={(e) => setSelectedParent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Veli seçin...</option>
                    {filteredParents.map(parent => (
                      <option key={parent.id} value={parent.id}>
                        {parent.adSoyad} ({parent.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Child Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Öğrenci Seçin
                  </label>
                  <select
                    value={selectedChild}
                    onChange={(e) => setSelectedChild(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Öğrenci seçin...</option>
                    {filteredStudents.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.adSoyad} ({student.id}) - {student.sinif}/{student.sube}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowLinkForm(false);
                    setSelectedParent('');
                    setSelectedChild('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleLinkParentChild}
                  disabled={!selectedParent || !selectedChild || processing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4" />
                      Bağlantı Kur
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
