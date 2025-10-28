import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { supabase } from "./lib/supabase";
import TestPage from "./pages/TestPage";
import type { Session } from "@supabase/supabase-js";
import AdminHome from "./pages/AdminHome";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
        } else {
          setSession(null);
          // Attempt to refresh expired token
          if (session) {
            const {
              data: { session: refreshedSession },
            } = await supabase.auth.refreshSession();
            if (refreshedSession && !isSessionExpired(refreshedSession)) {
              setSession(refreshedSession);
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
        case "TOKEN_REFRESHED":
          if (currentSession && !isSessionExpired(currentSession)) {
            setSession(currentSession);
          }
          break;

        case "SIGNED_OUT":
        case "USER_UPDATED":
          setSession(null);
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
  }, []);


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

  if (!session) {
    return (
      <Login
        onSuccess={() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && !isSessionExpired(session)) {
              setSession(session);
            }
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main>
        {
          session.user.user_metadata?.role !== 'admin' ? <Home /> : <AdminHome />
        }
      </main>
    </div>
  );
}

export default App;
