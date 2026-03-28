import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import CompanySelect from "./pages/CompanySelect";
import Dashboard from "./pages/Dashboard";
import MeetingForm from "./pages/MeetingForm";
import EvaluationForm from "./pages/EvaluationForm";
import Archive from "./pages/Archive";
import Statistics from "./pages/Statistics";
import UserManagement from "./pages/UserManagement";
import DashboardLayout from "./components/DashboardLayout";

function DashboardPage({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={CompanySelect} />
      <Route path="/dashboard">
        <DashboardPage><Dashboard /></DashboardPage>
      </Route>
      <Route path="/meetings/new">
        <DashboardPage><MeetingForm /></DashboardPage>
      </Route>
      <Route path="/meetings/:id">
        <DashboardPage><MeetingForm /></DashboardPage>
      </Route>
      <Route path="/evaluations/new">
        <DashboardPage><EvaluationForm /></DashboardPage>
      </Route>
      <Route path="/evaluations/:id">
        <DashboardPage><EvaluationForm /></DashboardPage>
      </Route>
      <Route path="/archive">
        <DashboardPage><Archive /></DashboardPage>
      </Route>
      <Route path="/statistics">
        <DashboardPage><Statistics /></DashboardPage>
      </Route>
      <Route path="/users">
        <DashboardPage><UserManagement /></DashboardPage>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
