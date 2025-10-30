import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
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
  const [loading, setLoading] = useState(true); // Start as true
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (!mounted) return;

      console.log("Auth state change:", event, session);

      setSession(session);

      if (event === "INITIAL_SESSION") {
        if (session) {
          if (window.location.pathname === "/login") {
            navigate("/", { replace: true });
          }
        }
        setLoading(false);
      }

      if (event === "SIGNED_IN") {
        navigate("/", { replace: true });
        setLoading(false);
      }

      if (event === "SIGNED_OUT") {
        navigate("/login", { replace: true });
        setLoading(false);
      }
      

      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN" && event !== "SIGNED_OUT") {
         setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Session...</p>
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
                console.log("Login successful, listener will navigate.");
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

