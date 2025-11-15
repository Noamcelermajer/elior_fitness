import React from 'react';
import { Button } from "@/components/ui/button";
import { Dumbbell, Home, Utensils, Target, TrendingUp, Menu, X, LogOut, User, Shield, Settings, Users, MessageSquare } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

const LogoBadge = ({ variant }: { variant: 'mobile' | 'desktop' }) => {
  const sizeClasses =
    variant === 'mobile'
      ? 'w-20 sm:w-24 md:w-28'
      : 'w-24 lg:w-28 xl:w-32';

  return (
    <div
      className={`${sizeClasses} aspect-square relative flex-shrink-0`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/40 via-primary/10 to-secondary/40 blur-2xl opacity-60" />
      <div className="relative w-full h-full rounded-[22px] border border-white/10 bg-gradient-to-br from-background/95 via-background/70 to-secondary/20 shadow-xl shadow-primary/10 flex items-center justify-center p-2">
        <img
          src="/ecshapelogo.svg"
          alt="ecshape logo"
          className="w-full h-full object-contain drop-shadow-[0_8px_25px_rgba(0,0,0,0.35)]"
          loading="lazy"
        />
      </div>
    </div>
  );
};

const Layout = ({ children, currentPage = 'dashboard' }: LayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isTrainer = user?.role === 'TRAINER';
  const isAdmin = user?.role === 'ADMIN';

  const navigationItems = isAdmin ? [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: Home, href: '/' },
    { id: 'users', label: t('navigation.users'), icon: User, href: '/users' },
    { id: 'system', label: t('navigation.system'), icon: Settings, href: '/system' }
  ] : isTrainer ? [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: Home, href: '/trainer-dashboard' },
    { id: 'exercises', label: t('navigation.exercises'), icon: Dumbbell, href: '/exercises' },
    { id: 'meal-bank', label: t('foodBank.title'), icon: Utensils, href: '/meal-bank' },
    { id: 'chat', label: t('navigation.chat'), icon: MessageSquare, href: '/chat' }
  ] : [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: Home, href: '/' },
    { id: 'meals', label: t('navigation.meals'), icon: Utensils, href: '/meals' },
    { id: 'training', label: t('navigation.training'), icon: Target, href: '/training' }, 
    { id: 'progress', label: t('navigation.progress'), icon: TrendingUp, href: '/progress' },
    { id: 'chat', label: t('navigation.chat'), icon: MessageSquare, href: '/chat' }
  ];

  const handleNavigation = (href: string) => {
    navigate(href);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border/50 lg:hidden">
        <div className="flex items-center justify-between px-2 sm:px-4 h-24 sm:h-28 md:h-32 gap-2 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <LogoBadge variant="mobile" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">
                {isAdmin ? t('layout.adminPanel') : isTrainer ? t('layout.trainerDashboard') : t('layout.clientPortal')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <LanguageSelector />
            <ThemeToggle />
            <div className="flex items-center gap-1 sm:gap-2 me-1 sm:me-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-xs sm:text-sm flex-shrink-0">
                👤
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground hidden md:inline truncate max-w-[80px]">{user?.full_name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-8 h-8 flex-shrink-0"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-lg border-b border-border/50 animate-slide-up">
            <div className="px-4 py-3 space-y-1">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? "default" : "ghost"}
                  className={`w-full justify-start transform hover:scale-105 transition-all duration-200 ${
                    currentPage === item.id 
                      ? "gradient-orange text-background font-semibold shadow-lg" 
                      : "hover:bg-secondary"
                  }`}
                  onClick={() => handleNavigation(item.href)}
                >
                  <item.icon className="w-5 h-5 me-3" />
                  <span>{item.label}</span>
                </Button>
              ))}
              <div className="pt-2 border-t border-border/30">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={logout}
                >
                  <LogOut className="w-5 h-5 me-3" />
                  <span>{t('auth.logout')}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-28 lg:h-32 xl:h-36">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="transform hover:scale-105 transition-transform duration-300">
                <LogoBadge variant="desktop" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground truncate">
                  {isAdmin ? t('layout.adminSubtitle') : isTrainer ? t('layout.trainerSubtitle') : t('layout.clientSubtitle')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Desktop Navigation */}
              <nav className="flex items-center gap-2">
                {navigationItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className={`flex items-center gap-2 px-6 transform hover:scale-105 transition-all duration-200 ${
                      currentPage === item.id 
                        ? "gradient-orange text-background font-semibold shadow-lg" 
                        : "hover:bg-secondary"
                    }`}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Button>
                ))}
              </nav>

              {/* User Profile */}
              <div className="flex items-center gap-3 ps-4 border-s border-border/30">
                <LanguageSelector />
                <ThemeToggle />
                <NotificationBell />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-lg shadow-lg">
                    👤
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold text-foreground">{user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.role ? t(`roles.${user.role}`) : ''}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Alternative approach */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 lg:hidden shadow-2xl z-50">
        <div className="flex items-center justify-around px-2 pt-2" style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 transform hover:scale-110 transition-all duration-200 ${
                currentPage === item.id 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleNavigation(item.href)}
            >
              <item.icon className={`w-5 h-5 ${currentPage === item.id ? 'text-primary' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Layout;
