import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import HomeView from "./views/HomeView";
import RetentionAdvisorView from "./views/RetentionAdvisorView";
import CohortAnalysisView from "./views/CohortAnalysisView";
import UserAnalyticsView from "./views/UserAnalyticsView";
import LoginPage from "./views/LoginPage";
import "./App.css";

function AppContent() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState("home");

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading Patient Churn Prediction...</p>
      </div>
    );
  }

  // Force login page every time if user is not logged in
  if (!user) {
    return <LoginPage />;
  }

  const renderView = () => {
    switch (activeView) {
      case "home":
        return <HomeView onNavigate={setActiveView} />;
      case "advisor":
        return <RetentionAdvisorView />;
      case "cohort":
        return <CohortAnalysisView />;
      case "analytics":
        return <UserAnalyticsView />;
      default:
        return <HomeView onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main-content">
        <Header />
        <div className="main-scroll">{renderView()}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
