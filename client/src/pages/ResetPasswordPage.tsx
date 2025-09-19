import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SecureAPI } from '../utils/api';
import { toast } from 'react-hot-toast';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (!resetToken) {
      toast.error('Geçersiz şifre sıfırlama linki');
      navigate('/login');
      return;
    }
    setToken(resetToken);
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setIsLoading(true);
    try {
      await SecureAPI.post('/api/auth/reset-password', {
        token,
        newPassword: password
      });
      
      toast.success('Şifreniz başarıyla güncellendi');
      navigate('/login');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Şifre sıfırlama başarısız';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(120deg, #f8fafc 0%, #e3e6ed 100%)',
      backgroundImage: 'url("/bg-tofas.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(255,255,255,0.9)',
        zIndex: 0
      }} />
      
      <div style={{
        position: 'relative',
        zIndex: 1,
        minWidth: 340,
        maxWidth: 400,
        width: '90vw',
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '2.5rem 2.2rem 2.2rem 2.2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          color: '#8A1538', 
          margin: '0 0 24px 0', 
          letterSpacing: 0.2,
          textAlign: 'center'
        }}>
          🔐 Şifre Sıfırlama
        </h1>
        
        <p style={{ 
          color: '#666', 
          fontSize: 16, 
          marginBottom: 24, 
          textAlign: 'center',
          lineHeight: 1.5
        }}>
          Yeni şifrenizi belirleyin
        </p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 8, 
              fontWeight: 600, 
              color: '#495057' 
            }}>
              Yeni Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: '100%', 
                padding: 12, 
                border: '1.5px solid #d1d5db', 
                borderRadius: 8, 
                fontSize: 15,
                boxSizing: 'border-box'
              }}
              placeholder="Yeni şifrenizi girin"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 8, 
              fontWeight: 600, 
              color: '#495057' 
            }}>
              Şifre Tekrar
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ 
                width: '100%', 
                padding: 12, 
                border: '1.5px solid #d1d5db', 
                borderRadius: 8, 
                fontSize: 15,
                boxSizing: 'border-box'
              }}
              placeholder="Şifrenizi tekrar girin"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ 
              width: '100%',
              padding: 14, 
              background: isLoading ? '#6c757d' : '#8A1538', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              fontSize: 16, 
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? '⏳ Güncelleniyor...' : '✅ Şifreyi Güncelle'}
          </button>
        </form>

        <div style={{ 
          marginTop: 24, 
          textAlign: 'center' 
        }}>
          <button
            onClick={() => navigate('/login')}
            style={{ 
              background: 'none',
              border: 'none',
              color: '#8A1538',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ← Giriş sayfasına dön
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage; 