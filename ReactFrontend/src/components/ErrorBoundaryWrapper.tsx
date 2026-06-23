import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GlobalErrorBoundary from "./GlobalErrorBoundary";

interface childrenType {
  children: React.ReactNode;
  // onError: (err: unknown) => void;
}
const ErrorBoundaryWrapper = ({ children }: childrenType) => {
  const navigate = useNavigate();
  const [error, setError] = useState<Error | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (error && location.pathname !== "/error") {
      navigate("/error", {
        state: { error: error?.message || "Render failed" },
        replace: true,
      });
    }
  }, [error, location.pathname, navigate]);

  return (
    <GlobalErrorBoundary
      onError={(err: Error) => {
        setError(err);
      }}
    >
      {children}
    </GlobalErrorBoundary>
  );
};

export default ErrorBoundaryWrapper;
