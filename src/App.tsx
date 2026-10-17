import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { isUnlocked } from "@/lib/auth";
import { PrefsProvider } from "@/lib/prefs";
import { syncFromServer } from "@/lib/store";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Identity from "@/pages/Identity";
import Login from "@/pages/Login";
import Present from "@/pages/Present";
import Remote from "@/pages/Remote";
import Viewer from "@/pages/Viewer";

function RequireCode({ children }: { children: ReactNode }) {
  const loc = useLocation();
  if (!isUnlocked()) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return children;
}

export default function App() {
  useEffect(() => {
    syncFromServer();
  }, []);
  return (
    <PrefsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireCode><Dashboard /></RequireCode>} />
          <Route path="/identity" element={<RequireCode><Identity /></RequireCode>} />
          <Route path="/p/:id" element={<RequireCode><Editor /></RequireCode>} />
          <Route path="/present/:id" element={<RequireCode><Present /></RequireCode>} />
          {/* Remote asks for the passcode itself so a phone can pair in one step. */}
          <Route path="/remote/:id" element={<Remote />} />
          {/* Audience view is public: shared by link / QR. */}
          <Route path="/view/:id" element={<Viewer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </PrefsProvider>
  );
}
