import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";
import useErrorContext from "../hooks/useError";
import Error from "./Error";

function Layout() {
  const { logoutUser } = useAuth();
  const { errorMessage, closeError } = useErrorContext();
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("dam-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("dam-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // const [currentDateTime, setCurrentDateTime] = useState(
  //   new Date().toLocaleString(),
  // );
  // const [isRunning, setIsRunning] = useState(true);

  // useEffect(() => {
  //   if (!isRunning) return;

  //   const interval = setInterval(() => {
  //     setCurrentDateTime(new Date().toLocaleString());
  //   }, 1000);

  //   return () => clearInterval(interval);
  // }, [isRunning]);

  const handleLogout = () => {
    logoutUser();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded bg-white p-3 text-blue-800 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-blue-700"
      >
        Skip to main content
      </a>
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo / Title */}
          <div className="text-xl font-bold text-slate-800">DAM Dashboard</div>

          {/* Date Time */}
          {/* <div
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
            onMouseEnter={() => setIsRunning(false)}
            onMouseLeave={() => setIsRunning(true)}
          >
            {currentDateTime}
          </div> */}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkMode((enabled) => !enabled)}
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              aria-pressed={darkMode}
              className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xl text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out of your account"
              className="min-h-11 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
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
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-7xl p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-700 sm:p-6"
      >
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
