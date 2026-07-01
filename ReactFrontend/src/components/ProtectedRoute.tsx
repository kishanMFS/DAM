import React, { useEffect } from "react";
import useAuth from "../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import Spinner from "./Spinner";

type childrenType = {
  children: React.ReactNode;
};

function ProtectedRoute({ children }: childrenType) {
  const { isLoggedIn, role, isVerifying, tokenVerificationFailed } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle redirects in useEffect to avoid rendering during update
  useEffect(() => {
    // Skip if still verifying token
    if (isVerifying) return;

    // If token verification failed, redirect to login
    if (tokenVerificationFailed) {
      navigate("/login", { replace: true });
      return;
    }

    // If logged in, check role-based access
    if (isLoggedIn) {
      // Check if current route matches the user's role
      const isAdminRoute = location.pathname.startsWith("/admin");
      const isUserRoute = location.pathname.startsWith("/user");

      // Redirect if role doesn't match current route
      if (isAdminRoute && role !== "ADMIN") {
        navigate("/user/dashboard", { replace: true });
        return;
      }

      if (isUserRoute && role !== "USER") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }
    }
  }, [
    isLoggedIn,
    role,
    isVerifying,
    tokenVerificationFailed,
    location.pathname,
    navigate,
  ]);

  // Show loading spinner while verifying token on page reload
  if (isVerifying) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  // If verification failed or not logged in, block access
  if (!isLoggedIn || tokenVerificationFailed) {
    return null;
  }

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isUserRoute = location.pathname.startsWith("/user");

  // Block access if role doesn't match route
  if ((isAdminRoute && role !== "ADMIN") || (isUserRoute && role !== "USER")) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
