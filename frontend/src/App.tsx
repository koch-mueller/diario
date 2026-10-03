import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { TranslationProvider } from "./features/translation/TranslationContext";
import { HouseholdProvider } from "./context/HouseholdContext";
import { BudgetPage } from "./pages/BudgetPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HouseholdPage } from "./pages/HouseholdPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ShoppingListPage } from "./pages/ShoppingListPage";
import { TasksPage } from "./pages/TasksPage";

/**
 * Definiert die Routen und globalen Provider der Anwendung.
 */
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HouseholdProvider>
          <TranslationProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="household" element={<HouseholdPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="shopping-list" element={<ShoppingListPage />} />
                  <Route path="budget" element={<BudgetPage />} />
                  <Route path="calendar" element={<CalendarPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TranslationProvider>
        </HouseholdProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
