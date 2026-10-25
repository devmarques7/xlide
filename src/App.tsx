import { useEffect, type ReactNode } from "react";
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { isUnlocked } from "@/lib/auth";
import { PrefsProvider } from "@/lib/prefs";
import { syncFromServer } from "@/lib/store";
import { startUpdateCheck } from "@/lib/update-check";
import { LOCALES, type Locale } from "@/lib/types";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Identity from "@/pages/Identity";
import Login from "@/pages/Login";
import Music from "@/pages/Music";
import Present from "@/pages/Present";
import Print from "@/pages/Print";
import Remote from "@/pages/Remote";
import Viewer from "@/pages/Viewer";

/** Static hosts without SPA rewrites (e.g. a preview) use #/ routes. */
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;

function RequireCode({ children }: { children: ReactNode }) {
  const loc = useLocation();
  if (!isUnlocked()) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return children;
}

export default function App() {
  useEffect(() => {
    syncFromServer();
    startUpdateCheck(() => {
      const l = document.documentElement.lang.slice(0, 2) as Locale;
      return LOCALES.includes(l) ? l : "en";
    });
  }, []);
  return (
    <PrefsProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireCode><Dashboard /></RequireCode>} />
          <Route path="/identity" element={<RequireCode><Identity /></RequireCode>} />
          <Route path="/p/:id" element={<RequireCode><Editor /></RequireCode>} />
          <Route path="/present/:id" element={<RequireCode><Present /></RequireCode>} />
          <Route path="/music" element={<RequireCode><Music /></RequireCode>} />
          <Route path="/print/:id" element={<RequireCode><Print /></RequireCode>} />
          <Route path="/fill/:id" element={<Print fill />} />
          {/* Remote asks for the passcode itself so a phone can pair in one step. */}
          <Route path="/remote/:id" element={<Remote />} />
          {/* Audience view is public: shared by link / QR. */}
          <Route path="/view/:id" element={<Viewer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </PrefsProvider>
  );
}
