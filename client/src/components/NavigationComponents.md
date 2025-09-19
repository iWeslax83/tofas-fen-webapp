# Navigation Components Documentation

## Overview

The Navigation Components system provides a comprehensive, responsive, and accessible navigation solution for the TOFAS FEN WebApp. This system includes enhanced sidebar navigation, smart breadcrumbs, improved top navigation, mobile navigation, and navigation analytics.

## Features

### 🎯 Core Features
- **Enhanced Sidebar Navigation**: Categorized, collapsible navigation with favorites system
- **Smart Breadcrumbs**: Automatic breadcrumb generation with icons and responsive design
- **Enhanced Top Navigation**: Global search, view modes, filters, and user actions
- **Mobile Navigation**: Bottom navigation bar and slide-out menu for mobile devices
- **Navigation Analytics**: Track user navigation patterns and page views
- **Role-Based Navigation**: Dynamic navigation items based on user roles
- **Responsive Design**: Optimized for all screen sizes and devices
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support

### 🎨 Design Features
- **TOFAS Theme Integration**: Consistent with brand colors and design language
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Glassmorphism Effects**: Modern glass-like visual effects
- **Dark Mode Support**: Automatic dark mode detection and styling
- **High Contrast Mode**: Enhanced visibility for accessibility
- **Reduced Motion**: Respects user motion preferences

## Components

### NavigationProvider

The main context provider that manages navigation state across the application.

```tsx
import { NavigationProvider } from './components/NavigationComponents';

function App() {
  return (
    <NavigationProvider>
      {/* Your app content */}
    </NavigationProvider>
  );
}
```

**Props:**
- `children`: React.ReactNode - The app content to wrap

**Context Values:**
- `sidebarOpen`: boolean - Sidebar open/close state
- `setSidebarOpen`: function - Toggle sidebar state
- `mobileMenuOpen`: boolean - Mobile menu open/close state
- `setMobileMenuOpen`: function - Toggle mobile menu state
- `searchOpen`: boolean - Search panel open/close state
- `setSearchOpen`: function - Toggle search panel state
- `currentPath`: string - Current route path
- `breadcrumbs`: BreadcrumbItem[] - Generated breadcrumbs for current path

### EnhancedSidebar

A comprehensive sidebar navigation component with categorization, favorites, and role-based filtering.

```tsx
import { EnhancedSidebar } from './components/NavigationComponents';

function Layout() {
  return (
    <div>
      <EnhancedSidebar />
      {/* Main content */}
    </div>
  );
}
```

**Features:**
- **Categorized Navigation**: Items grouped by function (Academic, Activities, Dormitory, etc.)
- **Favorites System**: Users can mark frequently used items as favorites
- **Collapsible Sections**: Each category can be expanded/collapsed
- **Role-Based Filtering**: Shows only relevant items for user role
- **Active State Indication**: Visual feedback for current page
- **Responsive Design**: Adapts to different screen sizes
- **Keyboard Navigation**: Full keyboard accessibility support

**Navigation Categories:**
- **Ana Menü**: Main navigation items
- **Akademik**: Academic-related features (assignments, grades, schedules)
- **Aktiviteler**: Activity-related features (clubs, announcements)
- **Pansiyon**: Dormitory-specific features (meal lists, supervisors)
- **Yönetim**: Administrative features (analytics, reports)
- **Araçlar**: Utility features (calendar, files, communication)

### EnhancedBreadcrumbs

Smart breadcrumb component that automatically generates navigation paths with icons.

```tsx
import { EnhancedBreadcrumbs } from './components/NavigationComponents';

function Page() {
  return (
    <div>
      <EnhancedBreadcrumbs />
      {/* Page content */}
    </div>
  );
}
```

**Features:**
- **Automatic Generation**: Creates breadcrumbs from current URL path
- **Icon Integration**: Each breadcrumb item includes relevant icons
- **Responsive Design**: Adapts to screen size with proper truncation
- **Accessibility**: Proper ARIA labels and semantic HTML
- **Hover Effects**: Interactive feedback on hover
- **Current Page Highlighting**: Visual distinction for current page

**Breadcrumb Structure:**
```
Ana Sayfa / Yönetici Paneli / Kulüpler / Matematik Kulübü
```

### EnhancedTopNavigation

Enhanced top navigation bar with search, view modes, and user actions.

```tsx
import { EnhancedTopNavigation } from './components/NavigationComponents';

function Layout() {
  return (
    <div>
      <EnhancedTopNavigation />
      {/* Main content */}
    </div>
  );
}
```

**Features:**
- **Global Search**: Expandable search input with suggestions
- **View Mode Toggle**: Switch between grid and list views
- **Filter Controls**: Quick access to content filters
- **User Menu Integration**: Seamless integration with existing user menu
- **Notification Bell**: Real-time notification display
- **Responsive Design**: Adapts to mobile and desktop layouts
- **Brand Integration**: TOFAS branding and logo display

### MobileNavigation

Mobile-optimized navigation with bottom navigation bar and slide-out menu.

```tsx
import { MobileNavigation } from './components/NavigationComponents';

function Layout() {
  return (
    <div>
      <MobileNavigation />
      {/* Main content */}
    </div>
  );
}
```

**Features:**
- **Bottom Navigation**: Quick access to main sections
- **Slide-Out Menu**: Full navigation menu accessible from mobile
- **Touch Optimization**: Optimized touch targets for mobile devices
- **Gesture Support**: Swipe gestures for menu interaction
- **Active State**: Visual feedback for current section
- **Responsive**: Automatically shows/hides based on screen size

**Mobile Navigation Tabs:**
- Ana Sayfa (Home)
- Akademik (Academic)
- Aktiviteler (Activities)
- Bildirimler (Notifications)
- Profil (Profile)

### NavigationAnalytics

Invisible component that tracks navigation patterns and user behavior.

```tsx
import { NavigationAnalytics } from './components/NavigationComponents';

function App() {
  return (
    <div>
      <NavigationAnalytics />
      {/* App content */}
    </div>
  );
}
```

**Features:**
- **Page View Tracking**: Records page visits and navigation paths
- **Time Tracking**: Measures time spent on each page
- **User Journey Analysis**: Tracks user navigation patterns
- **Performance Monitoring**: Monitors navigation performance
- **Privacy Compliant**: Respects user privacy preferences
- **Backend Integration**: Sends data to analytics backend

## Usage Examples

### Basic Implementation

```tsx
import React from 'react';
import { 
  NavigationProvider, 
  EnhancedSidebar, 
  EnhancedTopNavigation, 
  EnhancedBreadcrumbs, 
  MobileNavigation, 
  NavigationAnalytics 
} from './components/NavigationComponents';

function App() {
  return (
    <NavigationProvider>
      <div className="app">
        <EnhancedTopNavigation />
        <EnhancedSidebar />
        <MobileNavigation />
        <NavigationAnalytics />
        
        <main className="main-content">
          <EnhancedBreadcrumbs />
          {/* Your page content */}
        </main>
      </div>
    </NavigationProvider>
  );
}
```

### Custom Navigation Items

```tsx
import { useNavigation } from './components/NavigationComponents';

function CustomNavigation() {
  const { setSidebarOpen } = useNavigation();
  
  return (
    <button onClick={() => setSidebarOpen(true)}>
      Open Navigation
    </button>
  );
}
```

### Responsive Layout

```tsx
import React from 'react';
import { EnhancedSidebar, EnhancedTopNavigation } from './components/NavigationComponents';

function Layout({ children }) {
  return (
    <div className="layout">
      <EnhancedTopNavigation />
      <div className="layout-content">
        <EnhancedSidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
```

## Styling

### CSS Variables

The navigation components use CSS variables for consistent theming:

```css
:root {
  /* Primary Colors - Tofaş Red */
  --primary-red: #DC143C;
  --primary-red-dark: #8B0000;
  --primary-red-light: #FF6B6B;
  --primary-red-lighter: #FFE5E5;
  
  /* Secondary Colors */
  --secondary-blue: #1E40AF;
  --secondary-green: #059669;
  --secondary-purple: #7C3AED;
  --secondary-orange: #EA580C;
  --secondary-yellow: #D97706;
  --secondary-indigo: #4338CA;
  --secondary-teal: #0D9488;
  
  /* Neutral Colors */
  --white: #FFFFFF;
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, var(--primary-red-dark) 0%, var(--primary-red) 100%);
  --gradient-secondary: linear-gradient(135deg, var(--secondary-blue) 0%, var(--secondary-purple) 100%);
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-3xl: 2rem;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s ease;
  --transition-slow: 0.5s ease;
  
  /* Z-Index */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-sidebar: 1080;
  --z-mobile-nav: 1090;
}
```

### Custom Styling

You can customize the appearance by overriding CSS variables:

```css
/* Custom theme */
:root {
  --primary-red: #your-custom-red;
  --secondary-blue: #your-custom-blue;
  --font-sans: 'Your Custom Font', sans-serif;
}

/* Custom component styles */
.enhanced-sidebar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(8px);
}
```

## Accessibility

### WCAG 2.1 AA Compliance

The navigation components are designed to meet WCAG 2.1 AA accessibility standards:

- **Keyboard Navigation**: Full keyboard accessibility with proper focus management
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Color Contrast**: Meets minimum contrast ratios
- **Focus Indicators**: Clear focus indicators for all interactive elements
- **Reduced Motion**: Respects user motion preferences
- **High Contrast**: Enhanced visibility in high contrast mode

### ARIA Labels

```tsx
// Proper ARIA labels are automatically applied
<nav className="enhanced-breadcrumbs" aria-label="Breadcrumb">
  <ol className="breadcrumb-list">
    <li className="breadcrumb-item">
      <a href="/" aria-label="Navigate to home page">Ana Sayfa</a>
    </li>
  </ol>
</nav>
```

### Keyboard Navigation

- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and links
- **Arrow Keys**: Navigate within dropdowns and menus
- **Escape**: Close modals and dropdowns
- **Home/End**: Navigate to first/last item in lists

## Performance

### Optimization Features

- **Lazy Loading**: Components load only when needed
- **Memoization**: React.memo for performance optimization
- **Efficient Re-renders**: Minimal re-renders with proper dependency arrays
- **CSS-in-JS**: Optimized styling with minimal CSS overhead
- **Bundle Splitting**: Code splitting for better loading performance

### Performance Monitoring

```tsx
// Navigation analytics tracks performance metrics
const analytics = {
  pageViews: 1247,
  navigationTime: 14520, // milliseconds
  userPath: ['/admin', '/admin/kulupler', '/admin/kulupler/123']
};
```

## Browser Support

### Supported Browsers

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **Mobile Safari**: 14+
- **Chrome Mobile**: 90+

### Polyfills

The components use modern JavaScript features and may require polyfills for older browsers:

```bash
# Install polyfills if needed
npm install core-js regenerator-runtime
```

## Migration Guide

### From Old Navigation

If you're migrating from the old navigation system:

1. **Replace Navigation Components**:
   ```tsx
   // Old
   import Sidebar from './old/Sidebar';
   
   // New
   import { EnhancedSidebar } from './components/NavigationComponents';
   ```

2. **Update Layout Structure**:
   ```tsx
   // Old
   <div className="layout">
     <Sidebar />
     <main>{children}</main>
   </div>
   
   // New
   <NavigationProvider>
     <EnhancedSidebar />
     <EnhancedTopNavigation />
     <MobileNavigation />
     <main>{children}</main>
   </NavigationProvider>
   ```

3. **Update Styling**:
   ```css
   /* Remove old navigation styles */
   .old-sidebar { /* Remove */ }
   
   /* New styles are automatically applied */
   ```

### Breaking Changes

- Navigation state management moved to context
- Sidebar toggle functions changed
- Breadcrumb generation is now automatic
- Mobile navigation requires new components

## Troubleshooting

### Common Issues

**Sidebar not opening:**
```tsx
// Ensure NavigationProvider wraps your app
<NavigationProvider>
  <EnhancedSidebar />
</NavigationProvider>
```

**Breadcrumbs not showing:**
```tsx
// Check if current path is valid
console.log(location.pathname); // Should match expected format
```

**Mobile navigation not working:**
```tsx
// Ensure MobileNavigation is included
<MobileNavigation />
```

**Styling issues:**
```css
/* Check if CSS variables are loaded */
:root {
  --primary-red: #DC143C; /* Should be defined */
}
```

### Debug Mode

Enable debug mode for troubleshooting:

```tsx
// Add to your component
const { currentPath, breadcrumbs } = useNavigation();
console.log('Navigation Debug:', { currentPath, breadcrumbs });
```

## API Reference

### NavigationProvider

**Props:**
- `children`: React.ReactNode

**Context Value:**
```tsx
interface NavigationContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
}
```

### useNavigation Hook

**Returns:**
```tsx
const {
  sidebarOpen,
  setSidebarOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
  searchOpen,
  setSearchOpen,
  currentPath,
  breadcrumbs
} = useNavigation();
```

### Types

```tsx
interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ElementType;
}

interface NavigationItem {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string | number;
  children?: NavigationItem[];
  roles: string[];
  color?: string;
  description?: string;
}
```

## Contributing

### Development Setup

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Start development server**: `npm run dev`
4. **Run tests**: `npm test`

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Implement proper error boundaries
- Write comprehensive tests

### Testing

```tsx
// Example test
import { render, screen } from '@testing-library/react';
import { NavigationProvider, EnhancedSidebar } from './NavigationComponents';

test('renders sidebar with navigation items', () => {
  render(
    <NavigationProvider>
      <EnhancedSidebar />
    </NavigationProvider>
  );
  
  expect(screen.getByText('Ana Sayfa')).toBeInTheDocument();
});
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- **Documentation**: Check this documentation first
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions
- **Email**: support@tofas.edu.tr

## Changelog

### v1.0.0 (2024-01-XX)
- Initial release of Navigation Components
- Enhanced sidebar with categorization
- Smart breadcrumbs with automatic generation
- Mobile navigation with bottom bar
- Navigation analytics tracking
- Full accessibility support
- Responsive design implementation
