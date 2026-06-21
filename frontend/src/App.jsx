import { lazy, Suspense, useState, useEffect } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import ProtectedRoute from "./components/ProtectedRoute";
import OfflineNotice from "./components/OfflineNotice";
import { SocketProvider } from "./context/SocketContext";


// Centralized dynamic imports for easier prefetching
export const PageImports = {
  Home: () => import("./pages/Home"),
  Login: () => import("./pages/Login"),
  Signup: () => import("./pages/Signup"),
  ForgotPassword: () => import("./pages/ForgotPassword"),
  Dashboard: () => import("./pages/Dashboard"),
  History: () => import("./pages/History"),
  Profile: () => import("./pages/Profile"),
  Chats: () => import("./pages/Chats"),
  ErrandStream: () => import("./pages/ErrandStream"),
};

// Lazy load pages for performance
const Home = lazy(PageImports.Home);
const Login = lazy(PageImports.Login);
const Signup = lazy(PageImports.Signup);
const ForgotPassword = lazy(PageImports.ForgotPassword);
const Dashboard = lazy(PageImports.Dashboard);
const History = lazy(PageImports.History);
const Profile = lazy(PageImports.Profile);
const Chats = lazy(PageImports.Chats);
const ErrandStream = lazy(PageImports.ErrandStream);

const PageLoader = () => (
  <div className="page-loader">
    <div className="loader" />
    <span className="page-loader-text">Loading...</span>
  </div>
);

// Auth pages where Navbar and BottomNav should be hidden
const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

const AppLayout = () => {
  const location = useLocation();
  const [isAuth, setIsAuth] = useState(
    localStorage.getItem("isAuthenticated") === "true",
  );

  useEffect(() => {
    // Sync auth state whenever location changes
    setIsAuth(localStorage.getItem("isAuthenticated") === "true");
  }, [location.pathname]);

  const isAuthPage = AUTH_PATHS.includes(location.pathname);

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public home — redirect to dashboard if already logged in */}
          <Route
            path="/"
            element={isAuth ? <Navigate to="/dashboard" replace /> : <Home />}
          />

          {/* Auth pages — redirect away if already logged in */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected pages */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <Chats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stream"
            element={
              <ProtectedRoute>
                <ErrandStream />
              </ProtectedRoute>
            }
          />

          {/* Catch-all: redirect unknown routes */}
          <Route
            path="*"
            element={<Navigate to={isAuth ? "/dashboard" : "/"} replace />}
          />
        </Routes>
      </Suspense>
      {!isAuthPage && isAuth && <BottomNav />}
      <OfflineNotice />
    </>
  );
};

function App() {
  return (
    <Router>
      <SocketProvider>
        <AppLayout />
      </SocketProvider>
    </Router>
  );
}

export default App;
