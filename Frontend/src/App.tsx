import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { NotificationContainer } from "./components/NotificationContainer";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import MealsPage from "./pages/MealsPage";
import TrainingPage from "./pages/TrainingPage";
import ProgressPage from "./pages/ProgressPage";
import CreateWorkoutPage from "./pages/CreateWorkoutPage";
import CreateExercisePage from "./pages/CreateExercisePage";
import CreateMealPlanPage from "./pages/CreateMealPlanPage";
import WorkoutDetailPage from "./pages/WorkoutDetailPage";
import AdminDashboard from "./pages/AdminDashboard";
import ClientsPage from "./pages/ClientsPage";
import NotFound from "./pages/NotFound";
import UsersPage from './pages/UsersPage';
import SystemPage from './pages/SystemPage';
import TrainerDashboard from './pages/TrainerDashboard';
import ClientProfile from './pages/ClientProfile';
import CreateExercise from './pages/CreateExercise';
import CreateWorkout from './pages/CreateWorkout';
import CreateMealPlanV2 from './pages/CreateMealPlanV2';
import ExerciseBank from './pages/ExerciseBank';
import SecretUsersPage from './pages/SecretUsersPage';
import CreateWorkoutPlanV2 from './pages/CreateWorkoutPlanV2';

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public route - Login page */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />

      {/* Admin routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users" 
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <UsersPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/system" 
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <SystemPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/secret-users" 
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <SecretUsersPage />
          </ProtectedRoute>
        } 
      />

      {/* Trainer routes */}
      <Route 
        path="/trainer-dashboard" 
        element={
          <ProtectedRoute requiredRole="TRAINER">
            <TrainerDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/client/:clientId" 
        element={
          <ProtectedRoute requiredRole="TRAINER">
            <ClientProfile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-exercise" 
        element={
          <ProtectedRoute requiredRole="TRAINER">
            <CreateExercise />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-workout" 
        element={
          <ProtectedRoute requiredRole="TRAINER">
            <CreateWorkout />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-meal-plan" 
        element={
          <ProtectedRoute requiredRole="TRAINER">
            <CreateMealPlanV2 />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-workout-plan-v2" 
        element={
          <ProtectedRoute requiredRole="TRAINER">
            <CreateWorkoutPlanV2 />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/exercises" 
        element={
          <ProtectedRoute requiredRole="TRAINER">
            <ExerciseBank />
          </ProtectedRoute>
        } 
      />

      {/* Trainer/Client routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/meals" 
        element={
          <ProtectedRoute>
            <MealsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/training" 
        element={
          <ProtectedRoute>
            <TrainingPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/progress" 
        element={
          <ProtectedRoute>
            <ProgressPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-workout-old" 
        element={
          <ProtectedRoute>
            <CreateWorkoutPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-exercise-old" 
        element={
          <ProtectedRoute>
            <CreateExercisePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-meal-plan-old" 
        element={
          <ProtectedRoute>
            <CreateMealPlanPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/workout/:id" 
        element={
          <ProtectedRoute>
            <WorkoutDetailPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/clients" 
        element={
          <ProtectedRoute>
            <ClientsPage />
          </ProtectedRoute>
        } 
      />

      {/* Catch all route - redirect to login */}
      <Route 
        path="*" 
        element={
          <ProtectedRoute>
            <NotFound />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <NotificationContainer />
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
