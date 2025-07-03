import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import MealsPage from "./pages/MealsPage";
import TrainingPage from "./pages/TrainingPage";
import ProgressPage from "./pages/ProgressPage";
import CreateWorkoutPage from "./pages/CreateWorkoutPage";
import CreateMealPlanPage from "./pages/CreateMealPlanPage";
import WorkoutDetailPage from "./pages/WorkoutDetailPage";
import AdminDashboard from "./pages/AdminDashboard";
import ClientsPage from "./pages/ClientsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAuthenticated, user, loading } = useAuth();

  console.log('AppRoutes - isAuthenticated:', isAuthenticated, 'user:', user, 'loading:', loading);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('User not authenticated, showing login');
    return <Login />;
  }

  // Admin routes
  if (user?.role === 'admin') {
    console.log('User is admin, showing admin dashboard');
    return (
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Trainer and Client routes
  console.log('User is trainer/client, showing regular dashboard');
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/meals" element={<MealsPage />} />
      <Route path="/training" element={<TrainingPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/create-workout" element={<CreateWorkoutPage />} />
      <Route path="/create-meal-plan" element={<CreateMealPlanPage />} />
      <Route path="/workout/:id" element={<WorkoutDetailPage />} />
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
