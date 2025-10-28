import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { supabase } from "./lib/supabase";

function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function getSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
    }
    getSession();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, _session) => {
        // refresh session state
        supabase.auth.getSession().then((r) => setSession(r.data.session));
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!session) {
    return (
      <Login
        onSuccess={() =>
          supabase.auth.getSession().then((r) => setSession(r.data.session))
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main>
        <Home />
      </main>
    </div>
  );
}

export default App;
