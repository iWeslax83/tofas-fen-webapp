# Skeleton Components Documentation

## Genel Bakış

TOFAS FEN WebApp projesi için geliştirilmiş kapsamlı skeleton loading bileşenleri. Bu bileşenler, kullanıcı deneyimini iyileştirmek ve yükleme durumlarını daha profesyonel hale getirmek için tasarlanmıştır.

## Özellikler

- ✅ **TOFAS Tema Uyumlu**: Projenin renk paleti ile uyumlu
- ✅ **Responsive Design**: Tüm ekran boyutlarında uyumlu
- ✅ **Smooth Animations**: Shimmer ve pulse animasyonları
- ✅ **Reusable Components**: Tekrar kullanılabilir bileşenler
- ✅ **TypeScript Support**: Tam TypeScript desteği
- ✅ **Accessibility**: Erişilebilirlik standartlarına uygun

## Kurulum

Bileşenleri kullanmak için import edin:

```typescript
import {
  SkeletonCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonList,
  LoadingState
} from '../../components/SkeletonComponents';
```

## Bileşenler

### 1. SkeletonCard
Genel amaçlı kart skeleton bileşeni.

```typescript
<SkeletonCard />
<SkeletonCard className="custom-class" />
```

### 2. SkeletonClubCard
Kulüp kartları için özel skeleton bileşeni.

```typescript
<SkeletonClubCard />
<SkeletonClubCard className="custom-class" />
```

### 3. SkeletonTable
Tablo skeleton bileşeni.

```typescript
<SkeletonTable rows={5} columns={4} />
<SkeletonTable rows={10} columns={6} className="custom-table" />
```

### 4. SkeletonForm
Form skeleton bileşeni.

```typescript
<SkeletonForm fields={4} />
<SkeletonForm fields={6} className="custom-form" />
```

### 5. SkeletonList
Liste skeleton bileşeni.

```typescript
<SkeletonList items={5} />
<SkeletonList items={3} className="custom-list" />
```

### 6. SkeletonDashboard
Dashboard skeleton bileşeni.

```typescript
<SkeletonDashboard />
<SkeletonDashboard className="custom-dashboard" />
```

### 7. SkeletonProfile
Profil sayfası skeleton bileşeni.

```typescript
<SkeletonProfile />
<SkeletonProfile className="custom-profile" />
```

### 8. SkeletonNotification
Bildirim skeleton bileşeni.

```typescript
<SkeletonNotification />
<SkeletonNotification className="custom-notification" />
```

### 9. SkeletonCalendar
Takvim skeleton bileşeni.

```typescript
<SkeletonCalendar />
<SkeletonCalendar className="custom-calendar" />
```

### 10. SkeletonChart
Grafik skeleton bileşeni.

```typescript
<SkeletonChart />
<SkeletonChart className="custom-chart" />
```

## LoadingState Bileşeni

En önemli bileşenlerden biri `LoadingState` bileşenidir. Bu bileşen, loading, error ve success durumlarını yönetir.

```typescript
<LoadingState
  isLoading={isLoading}
  error={error?.message}
  onRetry={() => refetch()}
  skeleton={<SkeletonCard />}
>
  {/* Gerçek içerik buraya */}
  <div>Yüklenen içerik</div>
</LoadingState>
```

### Props

- `isLoading`: boolean - Yükleme durumu
- `error`: string | null - Hata mesajı
- `onRetry`: () => void - Tekrar deneme fonksiyonu
- `children`: ReactNode - Gerçek içerik
- `skeleton`: ReactNode - Skeleton bileşeni

## Kullanım Örnekleri

### 1. Basit Loading State

```typescript
import { SkeletonCard, LoadingState } from '../../components/SkeletonComponents';

const MyComponent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  return (
    <LoadingState
      isLoading={isLoading}
      skeleton={<SkeletonCard />}
    >
      <div>Gerçek içerik</div>
    </LoadingState>
  );
};
```

### 2. Error Handling ile

```typescript
const MyComponent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    // Veri yeniden yükle
  };

  return (
    <LoadingState
      isLoading={isLoading}
      error={error}
      onRetry={handleRetry}
      skeleton={<SkeletonCard />}
    >
      <div>Başarılı içerik</div>
    </LoadingState>
  );
};
```

### 3. Tablo ile

```typescript
const TableComponent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  return (
    <LoadingState
      isLoading={isLoading}
      skeleton={<SkeletonTable rows={5} columns={4} />}
    >
      <table>
        {/* Gerçek tablo içeriği */}
      </table>
    </LoadingState>
  );
};
```

### 4. Form ile

```typescript
const FormComponent = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <LoadingState
      isLoading={isLoading}
      skeleton={<SkeletonForm fields={6} />}
    >
      <form>
        {/* Gerçek form içeriği */}
      </form>
    </LoadingState>
  );
};
```

## CSS Özelleştirme

Skeleton bileşenleri CSS ile özelleştirilebilir:

```css
/* Özel skeleton stilleri */
.custom-skeleton {
  background: linear-gradient(90deg, 
    rgba(139, 0, 0, 0.1) 0%, 
    rgba(220, 20, 60, 0.2) 50%, 
    rgba(139, 0, 0, 0.1) 100%);
  animation: custom-shimmer 2s ease-in-out infinite;
}

@keyframes custom-shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
```

## Demo Sayfası

Tüm skeleton bileşenlerini test etmek için demo sayfasını kullanın:

```
/admin/skeleton-demo
/teacher/skeleton-demo
/student/skeleton-demo
/parent/skeleton-demo
/hizmetli/skeleton-demo
```

## Best Practices

1. **Doğru Skeleton Seçimi**: İçeriğinize uygun skeleton bileşeni seçin
2. **Loading State Yönetimi**: `LoadingState` bileşenini kullanın
3. **Error Handling**: Hata durumlarını mutlaka ele alın
4. **Performance**: Gereksiz re-render'ları önleyin
5. **Accessibility**: Screen reader'lar için uygun aria-label'lar ekleyin

## Animasyonlar

Skeleton bileşenleri iki tür animasyon kullanır:

1. **Shimmer Effect**: Soldan sağa akan ışık efekti
2. **Pulse Effect**: Opacity değişimi ile nabız efekti

Animasyonları özelleştirmek için CSS değişkenlerini kullanabilirsiniz:

```css
:root {
  --skeleton-animation-duration: 1.5s;
  --skeleton-shimmer-width: 200px;
  --skeleton-color-primary: rgba(139, 0, 0, 0.1);
  --skeleton-color-secondary: rgba(220, 20, 60, 0.2);
}
```

## Responsive Design

Tüm skeleton bileşenleri responsive tasarım prensiplerine uygun olarak geliştirilmiştir:

- **Desktop**: Tam özellikli görünüm
- **Tablet**: Orta boyut optimizasyonu
- **Mobile**: Kompakt görünüm

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Katkıda Bulunma

Yeni skeleton bileşenleri eklemek için:

1. `SkeletonComponents.tsx` dosyasına bileşeni ekleyin
2. `SkeletonComponents.css` dosyasına stilleri ekleyin
3. Demo sayfasına örnek ekleyin
4. Bu dokümantasyonu güncelleyin

## Lisans

Bu bileşenler TOFAS FEN WebApp projesi için geliştirilmiştir.
