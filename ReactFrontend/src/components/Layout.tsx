import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import useErrorContext from "../hooks/useError";
import Error from "./Error";

function Layout() {
  const { logoutUser } = useAuth();
  const { errorMessage, closeError } = useErrorContext();

  const [currentDateTime, setCurrentDateTime] = useState(
    new Date().toLocaleString(),
  );
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setCurrentDateTime(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleLogout = () => {
    logoutUser();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo / Title */}
          <div className="text-xl font-bold text-slate-800">DAM Dashboard</div>

          {/* Date Time */}
          <div
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
            onMouseEnter={() => setIsRunning(false)}
            onMouseLeave={() => setIsRunning(true)}
          >
            {currentDateTime}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {errorMessage && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <Error message={errorMessage} onClose={closeError} />
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
