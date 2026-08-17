import { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import HomeView from "./views/HomeView";
import RetentionAdvisorView from "./views/RetentionAdvisorView";
import ReportsView from "./views/ReportsView";
import CohortAnalysisView from "./views/CohortAnalysisView";
import UserAnalyticsView from "./views/UserAnalyticsView";
import "./App.css";

function AppContent() {
  const [activeView, setActiveView] = useState("home");

  const renderView = () => {
    switch (activeView) {
      case "home":
        return <HomeView onNavigate={setActiveView} />;
      case "advisor":
        return <RetentionAdvisorView />;
      case "cohort":
        return <CohortAnalysisView />;
      case "reports":
        return <ReportsView />;
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
        <div className="main-scroll">
          {renderView()}
        </div>
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
