import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { TokenManager } from '../utils/security';

const DebugPage: React.FC = () => {
  const { user, isLoading, error } = useAuthContext();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const updateDebugInfo = () => {
      const token = TokenManager.getAccessToken();
      const refreshToken = TokenManager.getRefreshToken();
      const isExpired = TokenManager.isTokenExpired();
      const shouldRefresh = TokenManager.shouldRefreshToken();
      
      const storedUser = localStorage.getItem('user');
      let parsedUser = null;
      try {
        parsedUser = storedUser ? JSON.parse(storedUser) : null;
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }

      setDebugInfo({
        token: {
          exists: !!token,
          value: token ? `${token.substring(0, 20)}...` : null,
          isExpired,
          shouldRefresh
        },
        refreshToken: {
          exists: !!refreshToken,
          value: refreshToken ? `${refreshToken.substring(0, 20)}...` : null
        },
        user: {
          context: user,
          stored: parsedUser,
          storedRaw: storedUser
        },
        localStorage: {
          auth_token: localStorage.getItem('auth_token') ? 'EXISTS' : 'NOT_FOUND',
          refresh_token: localStorage.getItem('refresh_token') ? 'EXISTS' : 'NOT_FOUND',
          token_expiry: localStorage.getItem('token_expiry'),
          user: localStorage.getItem('user') ? 'EXISTS' : 'NOT_FOUND'
        },
        state: {
          isLoading,
          error: error?.message || null
        }
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, [user, isLoading, error]);

  const clearAll = () => {
    TokenManager.clearTokens();
    localStorage.removeItem('user');
    window.location.reload();
  };

  const refreshAuth = async () => {
    const { checkAuth } = useAuthContext();
    await checkAuth();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Page - Token & Auth Status</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={clearAll} style={{ marginRight: '10px', padding: '10px' }}>
          Clear All & Reload
        </button>
        <button onClick={refreshAuth} style={{ padding: '10px' }}>
          Refresh Auth
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h2>Token Status</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
            {JSON.stringify(debugInfo.token, null, 2)}
          </pre>
        </div>

        <div>
          <h2>Refresh Token Status</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
            {JSON.stringify(debugInfo.refreshToken, null, 2)}
          </pre>
        </div>

        <div>
          <h2>User Context</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
            {JSON.stringify(debugInfo.user?.context, null, 2)}
          </pre>
        </div>

        <div>
          <h2>Stored User</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
            {JSON.stringify(debugInfo.user?.stored, null, 2)}
          </pre>
        </div>

        <div>
          <h2>LocalStorage Status</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
            {JSON.stringify(debugInfo.localStorage, null, 2)}
          </pre>
        </div>

        <div>
          <h2>App State</h2>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
            {JSON.stringify(debugInfo.state, null, 2)}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>Raw Stored User Data</h2>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', wordBreak: 'break-all' }}>
          {debugInfo.user?.storedRaw || 'No data'}
        </pre>
      </div>
    </div>
  );
};

export default DebugPage;
