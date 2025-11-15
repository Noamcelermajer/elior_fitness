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
      ? 'h-16 sm:h-20 md:h-24 w-auto'
      : 'h-full w-auto';

  return (
    <div
      className={`${sizeClasses} flex items-center justify-center flex-shrink-0 overflow-hidden`}
      aria-hidden="true"
    >
      <img
        src="/logonavbar.png"
        alt="ECshape logo"
        className="h-full w-auto object-contain"
        loading="lazy"
        style={{ maxHeight: '100%', maxWidth: '100%' }}
      />
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
            <div className="transform hover:scale-105 transition-transform duration-300">
              <LogoBadge variant="mobile" />
            </div>
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
        <div className="max-w-7xl mx-auto px-4 lg:px-6 relative overflow-hidden">
          <div className="flex justify-between items-center h-28 lg:h-32 xl:h-36">
            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0 lg:pr-32 xl:pr-44" style={{ maxWidth: 'min(250px, 20vw)' }}>
              <div className="min-w-0">
                <p className="text-xs lg:text-sm text-muted-foreground break-words leading-tight">
                  {isAdmin ? t('layout.adminSubtitle') : isTrainer ? t('layout.trainerSubtitle') : t('layout.clientSubtitle')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-0.5 lg:gap-1 flex-1 min-w-0 lg:pr-32 xl:pr-44 overflow-hidden">
              {/* Desktop Navigation */}
              <nav className="flex items-center gap-0.5 min-w-0 flex-1 overflow-x-auto scrollbar-hide">
                {navigationItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className={`flex items-center gap-0.5 lg:gap-1 px-1 lg:px-1.5 xl:px-2.5 text-[10px] lg:text-xs xl:text-sm whitespace-nowrap transform hover:scale-105 transition-all duration-200 flex-shrink-0 ${
                      currentPage === item.id 
                        ? "gradient-orange text-background font-semibold shadow-lg" 
                        : "hover:bg-secondary"
                    }`}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <item.icon className="w-3 h-3 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 flex-shrink-0" />
                    <span className="truncate max-w-[60px] lg:max-w-[80px] xl:max-w-none">{item.label}</span>
                  </Button>
                ))}
              </nav>

              {/* User Profile */}
              <div className="flex items-center gap-0.5 lg:gap-1 xl:gap-2 ps-0.5 lg:ps-1 xl:ps-3 border-s border-border/30 flex-shrink-0">
                <LanguageSelector />
                <ThemeToggle />
                <NotificationBell />
                <div className="flex items-center gap-1 lg:gap-1.5 xl:gap-2">
                  <div className="w-6 h-6 lg:w-7 lg:h-7 xl:w-9 xl:h-9 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-xs lg:text-sm xl:text-base shadow-lg flex-shrink-0">
                    👤
                  </div>
                  <div className="text-end hidden xl:block">
                    <p className="text-[10px] xl:text-xs font-semibold text-foreground truncate max-w-[80px] 2xl:max-w-[100px]">{user?.full_name}</p>
                    <p className="text-[9px] xl:text-xs text-muted-foreground">{user?.role ? t(`roles.${user.role}`) : ''}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 w-6 h-6 lg:w-7 lg:h-7 xl:w-9 xl:h-9"
                >
                  <LogOut className="w-3 h-3 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4" />
                </Button>
              </div>
            </div>
            
            {/* Logo on the right side - absolutely positioned */}
            <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-2 lg:pr-4" style={{ width: 'min(160px, 12vw)', maxWidth: '160px' }}>
              <div className="transform hover:scale-105 transition-transform duration-300 h-full w-full flex items-center justify-end overflow-hidden">
                <LogoBadge variant="desktop" />
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
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 lg:hidden shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center justify-around px-1 sm:px-2 pt-2 overflow-x-auto scrollbar-hide" style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-1.5 sm:py-2 px-1.5 sm:px-2 min-w-0 flex-shrink-0 transform hover:scale-110 transition-all duration-200 ${
                currentPage === item.id 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleNavigation(item.href)}
            >
              <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${currentPage === item.id ? 'text-primary' : ''}`} />
              <span className="text-[10px] sm:text-xs font-medium truncate max-w-[60px] sm:max-w-none">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Layout;
