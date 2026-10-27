import { lazy } from "react";

export const LoginPage = lazy(() => import("../pages/Login"));
export const ProtectedAppRoute = lazy(() => import("./ProtectedAppRoute"));
export const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
export const UserDashboard = lazy(() => import("../pages/UserDashboard"));
export const RenderError = lazy(() => import("../pages/Error"));
export const MissingComponent = lazy(() => import("../pages/MissingComponent"));

export function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span
        className="size-10 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
