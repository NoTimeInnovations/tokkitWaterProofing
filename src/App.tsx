import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import AdminHome from "./pages/AdminHome";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider />
    </BrowserRouter>
  );
}

function AuthProvider() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentPath = window.location.pathname;

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Error getting session:", error);
          return;
        }

        const isSessExpired = session && isSessionExpired(session);

        // Check if session exists and is not expired
        if (session && isSessExpired === false) {
          setSession(session);
          // Only navigate if on login page or root without params
          if (currentPath === "/login") {
            // Navigate based on user role after login
            if (session.user?.user_metadata?.role === "admin") {
              navigate("/call-history", { replace: true });
            } else {
              navigate("/", { replace: true });
            }
          }
          // If already on a valid path, stay there
        } else {
          setSession(null);
          // Attempt to refresh expired token
          if (session) {
            const {
              data: { session: refreshedSession },
            } = await supabase.auth.refreshSession();
            if (refreshedSession && !isSessionExpired(refreshedSession)) {
              setSession(refreshedSession);
              if (currentPath === "/login") {
                if (refreshedSession.user?.user_metadata?.role === "admin") {
                  navigate("/call-history", { replace: true });
                } else {
                  navigate("/", { replace: true });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Session initialization error:", error);
        setSession(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      console.log("Auth state change:", event);

      switch (event) {
        case "SIGNED_IN":
          if (currentSession) {
            setSession(currentSession);
            // Navigate based on user role after sign in
            if (currentSession.user?.user_metadata?.role === "admin") {
              navigate("/call-history", { replace: true });
            } else {
              navigate("/", { replace: true });
            }
          }
          break;

        case "SIGNED_OUT":
          setSession(null);
          navigate("/login", { replace: true });
          break;

        case "USER_UPDATED":
          if (currentSession) {
            setSession(currentSession);
          }
          break;

        case "TOKEN_REFRESHED":
          if (currentSession) {
            setSession(currentSession);
          }
          break;

        default:
          const {
            data: { session: latestSession },
          } = await supabase.auth.getSession();
          if (latestSession && !isSessionExpired(latestSession)) {
            setSession(latestSession);
          } else {
            setSession(null);
          }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const isSessionExpired = (session: Session): boolean => {
    if (!session?.expires_at) return true;

    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    return now >= expiresAt - bufferTime;
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const {
        data: { session: refreshedSession },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Token refresh failed:", error);
        return false;
      }

      if (refreshedSession && !isSessionExpired(refreshedSession)) {
        setSession(refreshedSession);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Token refresh error:", error);
      return false;
    }
  };

  useEffect(() => {
    if (!session) return;

    const checkTokenExpiry = () => {
      if (isSessionExpired(session)) {
        console.log("Token expired or about to expire, refreshing...");
        refreshToken();
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !session ? (
            <Login
              onSuccess={() => {
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session && !isSessionExpired(session)) {
                    setSession(session);
                  }
                });
              }}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/call-history"
        element={
          session ? (
            <div className="min-h-screen bg-gray-100">
              <main>
                <AdminHome
                  onNavigateToHome={() => navigate("/")}
                  onViewTask={(taskId: string) => {
                    navigate(`/?taskId=${taskId}`);
                  }}
                />
              </main>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/"
        element={
          session ? (
            <div className="min-h-screen bg-gray-100">
              <main>
                <Home
                  onNavigateToAdmin={() => navigate("/call-history")}
                  initialTaskId={searchParams.get("taskId") || undefined}
                />
              </main>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;