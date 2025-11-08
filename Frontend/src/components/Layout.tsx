import React from 'react';
import { Button } from "@/components/ui/button";
import { Dumbbell, Home, Utensils, Target, TrendingUp, Menu, X, LogOut, User, Shield, Settings, Users } from 'lucide-react';
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
    { id: 'meal-bank', label: t('foodBank.title'), icon: Utensils, href: '/meal-bank' }
  ] : [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: Home, href: '/' },
    { id: 'meals', label: t('navigation.meals'), icon: Utensils, href: '/meals' },
    { id: 'training', label: t('navigation.training'), icon: Target, href: '/training' }, 
    { id: 'progress', label: t('navigation.progress'), icon: TrendingUp, href: '/progress' }
  ];

  const handleNavigation = (href: string) => {
    navigate(href);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border/50 lg:hidden">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${isAdmin ? 'bg-gradient-to-r from-red-500 to-red-600' : 'gradient-orange'} rounded-lg flex items-center justify-center shadow-lg`}>
              {isAdmin ? <Shield className="w-5 h-5 text-background" /> : <Dumbbell className="w-5 h-5 text-background" />}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient">{t('layout.brandName')}</h1>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? t('layout.adminPanel') : isTrainer ? t('layout.trainerDashboard') : t('layout.clientPortal')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <div className="flex items-center gap-2 me-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-sm">
                👤
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">{user?.full_name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${isAdmin ? 'bg-gradient-to-r from-red-500 to-red-600' : 'gradient-orange'} rounded-xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-transform duration-300`}>
                {isAdmin ? <Shield className="w-7 h-7 text-background" /> : <Dumbbell className="w-7 h-7 text-background" />}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">{t('layout.brandName')}</h1>
                <p className="text-sm text-muted-foreground">
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
      <main className="min-h-screen">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Alternative approach */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 lg:hidden mobile-safe shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2">
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
