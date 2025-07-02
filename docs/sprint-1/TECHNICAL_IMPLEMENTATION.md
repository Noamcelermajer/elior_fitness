# Sprint 1: Technical Implementation Details

## 🏗️ Architecture Overview

### **Frontend Stack**
- **Framework**: Next.js 14.2.21 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.1
- **Icons**: Lucide React
- **HTTP Client**: Native Fetch API
- **State Management**: React Hooks + localStorage

### **Design Patterns**
- **Component Architecture**: Atomic Design (atoms → molecules → organisms)
- **API Layer**: Service pattern with centralized error handling
- **Authentication**: JWT with localStorage persistence
- **Routing**: File-based routing with role-based guards

## 📁 File Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── auth/
│   │   │   └── login/
│   │   │       └── page.tsx      # Login page component
│   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   │   └── page.tsx      # Admin dashboard
│   │   │   └── trainer/
│   │   │       └── page.tsx      # Trainer dashboard
│   │   ├── globals.css           # Global styles & Tailwind config
│   │   ├── layout.tsx            # Root layout with fonts
│   │   └── page.tsx              # Main dashboard (client view)
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.tsx        # Button with variants & loading
│   │   │   ├── Card.tsx          # Card with glass/neumorphic styles
│   │   │   └── ProgressRing.tsx  # SVG progress visualization
│   │   ├── layout/
│   │   │   └── Header.tsx        # Page header component
│   │   └── navigation/
│   │       └── BottomNavigation.tsx # Mobile bottom nav
│   ├── lib/
│   │   └── api.ts                # API service layer
│   └── types/
│       └── index.ts              # TypeScript type definitions
├── public/                       # Static assets
├── tailwind.config.ts            # Tailwind configuration
├── next.config.ts                # Next.js configuration
└── package.json                  # Dependencies
```

## 🎨 Design System Implementation

### **Color Palette**
```css
:root {
  /* Primary Colors */
  --primary: 0 84% 60%;           /* #FF5252 - Vibrant Red */
  --primary-foreground: 0 0% 98%; /* White text on primary */
  
  /* Accent Colors */
  --accent: 25 95% 53%;           /* #FF6B35 - Orange */
  --accent-foreground: 0 0% 98%;  /* White text on accent */
  
  /* Neutral Colors */
  --background: 0 0% 3.9%;        /* #0A0A0A - Near black */
  --foreground: 0 0% 98%;         /* #FAFAFA - Near white */
  --card: 0 0% 7%;                /* #121212 - Dark gray */
  --muted: 0 0% 45%;              /* #737373 - Mid gray */
  
  /* Semantic Colors */
  --destructive: 0 84% 60%;       /* Error red */
  --border: 0 0% 14.9%;           /* Border color */
}
```

### **Typography**
```typescript
// Font Configuration (layout.tsx)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

### **Component Styles**

#### **Glassmorphism Effect**
```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

#### **Neumorphism Effect**
```css
.neumorphic {
  background: linear-gradient(145deg, #0f0f0f, #0c0c0c);
  box-shadow: 
    5px 5px 10px #050505,
    -5px -5px 10px #131313,
    inset 1px 1px 2px #131313,
    inset -1px -1px 2px #050505;
}
```

## 🔧 Core Components

### **Button Component**
```typescript
interface ButtonProps {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}
```

Features:
- Multiple variants with distinct styles
- Loading state with spinner
- Disabled state handling
- Size variations
- Fully accessible

### **Card Component**
```typescript
interface CardProps {
  variant?: 'default' | 'glass' | 'neumorphic';
  className?: string;
  children: React.ReactNode;
}
```

Features:
- Three visual variants
- Responsive padding
- Smooth transitions
- Dark mode optimized

### **ProgressRing Component**
```typescript
interface ProgressRingProps {
  progress: number;      // 0-100
  size?: number;         // Diameter in pixels
  strokeWidth?: number;  // Ring thickness
  showPercentage?: boolean;
}
```

Features:
- SVG-based circular progress
- Animated progress updates
- Customizable colors
- Optional percentage display

## 🔐 Authentication Implementation

### **API Service Layer**
```typescript
class ApiService {
  private baseURL: string;
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Automatic token injection
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }
    
    // Centralized error handling
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
  }
}
```

### **Login Flow**
1. User enters credentials
2. API call to `/api/auth/login`
3. Receive JWT token
4. Store token in localStorage
5. Fetch user data (or use temporary workaround)
6. Redirect based on user role

### **Protected Routes**
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    // Additional validation...
  };
  checkAuth();
}, [router]);
```

## 🌐 API Integration

### **Endpoints Integrated**
| Endpoint | Method | Purpose | Status |
|----------|--------|---------|---------|
| `/health` | GET | Health check | ✅ Working |
| `/api/auth/login` | POST | User login | ✅ Working |
| `/api/auth/me` | GET | Get current user | ⚠️ CORS issue |
| `/api/auth/setup/admin` | POST | Initial admin setup | ✅ Working |
| `/api/auth/register/client` | POST | Register client | ⚠️ Requires auth |

### **Request/Response Types**
```typescript
interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'trainer' | 'client';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
```

## 🐛 Known Issues & Workarounds

### **CORS Issue with Authenticated Endpoints**
**Problem**: Authenticated GET requests fail with "Failed to fetch"  
**Cause**: CORS preflight handling for Authorization header  
**Workaround**: Temporary user object creation from login data

### **Backend Configuration Changes**
1. Updated OAuth2 token URL from `/api/auth/token` to `/api/auth/login`
2. Modified CORS configuration for specific origins
3. Added explicit Authorization header allowance

## 📱 Mobile Optimization

### **Responsive Breakpoints**
- Mobile: < 640px (default)
- Tablet: 640px - 1024px (sm:)
- Desktop: > 1024px (lg:)

### **Mobile-First Features**
- Bottom navigation for easy thumb access
- Touch-friendly button sizes (min 44x44px)
- Swipe gestures preparation
- Optimized card layouts for small screens
- Full-width forms on mobile

## 🚀 Performance Optimizations

1. **Code Splitting**: Automatic with Next.js App Router
2. **Font Optimization**: Next.js font loading
3. **Image Optimization**: Ready for Next.js Image component
4. **CSS Optimization**: Tailwind CSS purging unused styles
5. **Client-Side Caching**: localStorage for auth state

## 🔒 Security Considerations

1. **JWT Storage**: localStorage (consider httpOnly cookies for production)
2. **API Key Protection**: Environment variables
3. **Input Validation**: HTML5 form validation
4. **XSS Protection**: React's built-in escaping
5. **HTTPS**: Required for production deployment

## 📈 Future Improvements

1. **Error Boundary**: Global error handling component
2. **Loading States**: Skeleton screens for better UX
3. **Offline Support**: Service Worker implementation
4. **State Management**: Consider Redux/Zustand for complex state
5. **Testing**: Jest + React Testing Library setup
6. **CI/CD**: GitHub Actions for automated deployment 