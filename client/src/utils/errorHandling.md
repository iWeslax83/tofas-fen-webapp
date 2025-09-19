# Enhanced Error Handling Documentation

## Genel Bakış

TOFAS FEN WebApp projesi için geliştirilmiş kapsamlı error handling sistemi. Bu sistem, hataları kategorize eder, kullanıcı dostu mesajlar gösterir, otomatik retry mekanizması sağlar ve analytics entegrasyonu sunar.

## Özellikler

- ✅ **Error Categorization**: Hataları türlerine göre sınıflandırır
- ✅ **User-Friendly Messages**: Kullanıcı dostu hata mesajları
- ✅ **Automatic Retry**: Otomatik tekrar deneme mekanizması
- ✅ **Recovery Strategies**: Hata türüne göre çözüm önerileri
- ✅ **Analytics Integration**: Hata takibi ve analitik
- ✅ **Toast Notifications**: Görsel bildirimler
- ✅ **Error Boundaries**: React error boundary entegrasyonu

## Error Types

### 1. NETWORK
- **Açıklama**: İnternet bağlantısı sorunları
- **Severity**: MEDIUM
- **Retry**: ✅ (3 deneme, 2s bekleme)
- **User Message**: "İnternet bağlantınızı kontrol edin ve tekrar deneyin."

### 2. AUTHENTICATION
- **Açıklama**: Kimlik doğrulama hataları
- **Severity**: HIGH
- **Retry**: ❌
- **User Message**: "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın."

### 3. AUTHORIZATION
- **Açıklama**: Yetki hataları
- **Severity**: HIGH
- **Retry**: ❌
- **User Message**: "Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor."

### 4. VALIDATION
- **Açıklama**: Form doğrulama hataları
- **Severity**: LOW
- **Retry**: ❌
- **User Message**: "Lütfen girdiğiniz bilgileri kontrol edin."

### 5. SERVER
- **Açıklama**: Sunucu hataları
- **Severity**: HIGH
- **Retry**: ✅ (2 deneme, 5s bekleme)
- **User Message**: "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin."

### 6. CLIENT
- **Açıklama**: İstemci hataları
- **Severity**: MEDIUM
- **Retry**: ✅ (1 deneme, 1s bekleme)
- **User Message**: "Bir hata oluştu. Sayfayı yenilemeyi deneyin."

### 7. UNKNOWN
- **Açıklama**: Bilinmeyen hatalar
- **Severity**: MEDIUM
- **Retry**: ✅ (1 deneme, 3s bekleme)
- **User Message**: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."

## Error Severity Levels

### LOW
- Toast notification göstermez
- Kullanıcı müdahalesi gerektirmez
- Otomatik çözülür

### MEDIUM
- Toast notification gösterir
- Kullanıcı bilgilendirilir
- Retry mekanizması çalışır

### HIGH
- Toast notification gösterir
- Kullanıcı müdahalesi gerekebilir
- Özel işlemler tetiklenir

### CRITICAL
- Modal dialog gösterir
- Acil kullanıcı müdahalesi gerekir
- Sistem durumu kontrol edilir

## Kullanım

### 1. Basic Error Handling

```typescript
import { useErrorHandler } from '../utils/errorHandling';

const MyComponent = () => {
  const { handleError } = useErrorHandler();

  const handleApiCall = async () => {
    try {
      const response = await api.getData();
      // İşlem başarılı
    } catch (error) {
      handleError(error, {
        component: 'MyComponent',
        action: 'handleApiCall'
      });
    }
  };

  return <button onClick={handleApiCall}>Veri Getir</button>;
};
```

### 2. Retry Operation

```typescript
import { useErrorHandler } from '../utils/errorHandling';

const MyComponent = () => {
  const { retryOperation } = useErrorHandler();

  const handleDataFetch = async () => {
    try {
      const data = await retryOperation(
        async () => {
          return await api.getData();
        },
        { component: 'MyComponent', action: 'fetchData' },
        3 // maksimum deneme sayısı
      );
      console.log('Başarılı:', data);
    } catch (error) {
      console.log('Tüm denemeler başarısız');
    }
  };

  return <button onClick={handleDataFetch}>Veri Getir</button>;
};
```

### 3. Custom Error

```typescript
import { AppError, ErrorType, ErrorSeverity } from '../utils/errorHandling';

const MyComponent = () => {
  const { handleError } = useErrorHandler();

  const handleCustomError = () => {
    const customError = new AppError(
      'Özel hata mesajı',
      ErrorType.VALIDATION,
      ErrorSeverity.MEDIUM,
      { component: 'MyComponent', action: 'customError' }
    );
    
    handleError(customError);
  };

  return <button onClick={handleCustomError}>Özel Hata</button>;
};
```

### 4. Error Boundary Hook

```typescript
import { useErrorBoundary } from '../utils/errorHandling';

const MyComponent = () => {
  const { error, handleError, clearError } = useErrorBoundary();

  if (error) {
    return (
      <div className="error-state">
        <h3>Hata: {error.message}</h3>
        <button onClick={clearError}>Tekrar Dene</button>
      </div>
    );
  }

  return <div>Normal içerik</div>;
};
```

## Enhanced Error Boundary

### Kullanım

```typescript
import EnhancedErrorBoundary from '../components/EnhancedErrorBoundary';

const App = () => {
  return (
    <EnhancedErrorBoundary
      onError={(error, errorInfo) => {
        console.log('Error caught:', error);
        console.log('Error info:', errorInfo);
      }}
    >
      <MyApp />
    </EnhancedErrorBoundary>
  );
};
```

### Özellikler

- **Error Type Detection**: Hata türünü otomatik algılar
- **Recovery Actions**: Hata türüne göre çözüm önerileri
- **Visual Feedback**: Hata türüne göre ikonlar
- **Developer Info**: Geliştirici modunda detaylı bilgi
- **Retry Mechanism**: Otomatik tekrar deneme

## API Integration

### Axios Interceptor

```typescript
import { errorHandler } from '../utils/errorHandling';

// Axios response interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    errorHandler.handleError(error, {
      component: 'API',
      action: 'request'
    });
    return Promise.reject(error);
  }
);
```

### React Query Integration

```typescript
import { QueryClient } from '@tanstack/react-query';
import { errorHandler } from '../utils/errorHandling';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Custom retry logic
        return errorHandler.shouldRetry(error) && failureCount < 3;
      },
      onError: (error) => {
        errorHandler.handleError(error, {
          component: 'ReactQuery',
          action: 'query'
        });
      }
    },
    mutations: {
      onError: (error) => {
        errorHandler.handleError(error, {
          component: 'ReactQuery',
          action: 'mutation'
        });
      }
    }
  }
});
```

## Error Analytics

### Tracking

```typescript
import { Analytics } from '../utils/monitoring';

// Error tracking otomatik olarak yapılır
// Manuel tracking için:
Analytics.getInstance().trackError(error, {
  component: 'MyComponent',
  action: 'customAction',
  userId: 'user123'
});
```

### Statistics

```typescript
import { errorHandler } from '../utils/errorHandling';

// Hata istatistiklerini al
const stats = errorHandler.getErrorStats();
console.log('Total errors:', stats.total);
console.log('By type:', stats.byType);
console.log('By severity:', stats.bySeverity);
```

## Best Practices

### 1. Error Context

Her zaman context bilgisi sağlayın:

```typescript
handleError(error, {
  component: 'UserProfile',
  action: 'updateProfile',
  userId: user.id
});
```

### 2. Appropriate Error Types

Hata türünü doğru seçin:

```typescript
// Network error
if (error.code === 'NETWORK_ERROR') {
  // Otomatik olarak NETWORK olarak kategorize edilir
}

// Validation error
if (error.name === 'ValidationError') {
  // Otomatik olarak VALIDATION olarak kategorize edilir
}
```

### 3. Retry Strategy

Retry stratejisini dikkatli kullanın:

```typescript
// Sadece geçici hatalar için retry kullanın
const data = await retryOperation(
  async () => await api.getData(),
  { component: 'DataFetch' },
  3 // maksimum deneme
);
```

### 4. User Experience

Kullanıcı deneyimini öncelikleyin:

```typescript
// Düşük seviye hatalar için toast göstermeyin
// Yüksek seviye hatalar için detaylı bilgi verin
// Kritik hatalar için modal gösterin
```

## Demo Sayfası

Error handling sistemini test etmek için:

```
/admin/error-demo
/teacher/error-demo
/student/error-demo
/parent/error-demo
/hizmetli/error-demo
```

## Migration Guide

### Eski Error Handling'den Yeni Sisteme

#### Öncesi:
```typescript
try {
  const data = await api.getData();
} catch (error) {
  toast.error('Bir hata oluştu');
  console.error(error);
}
```

#### Sonrası:
```typescript
import { useErrorHandler } from '../utils/errorHandling';

const { handleError } = useErrorHandler();

try {
  const data = await api.getData();
} catch (error) {
  handleError(error, {
    component: 'MyComponent',
    action: 'getData'
  });
}
```

## Performance Considerations

- **Error Queue**: Hatalar kuyrukta işlenir
- **Analytics Batching**: Analytics verileri toplu gönderilir
- **Memory Management**: Error queue otomatik temizlenir
- **Retry Limits**: Sonsuz retry önlenir

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

1. **Toast not showing**: Severity LOW olan hatalar toast göstermez
2. **Retry not working**: Error type retry desteklemiyor olabilir
3. **Analytics not tracking**: Production modunda çalışır

### Debug Mode

Development modunda detaylı hata bilgileri gösterilir:

```typescript
// Development modunda
console.log('Error details:', error);
console.log('Error context:', error.context);
console.log('Error stats:', errorHandler.getErrorStats());
```

## Lisans

Bu error handling sistemi TOFAS FEN WebApp projesi için geliştirilmiştir.
