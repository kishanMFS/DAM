import { Navigate, createBrowserRouter, Outlet } from "react-router-dom";

import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundaryWrapper from "../components/ErrorBoundaryWrapper";

import LoginPage from "../pages/Login";
// import Dashboard from "../pages/Dashboard";

import MissingComponent from "../pages/MissingComponent";
import RenderError from "../pages/Error";

// import { ProjectContextProvider } from "../context/ProjectContext";
// import { UserAuthContextProvider } from "../context/authenticationContext";
import { ErrorContextProvider } from "../context/ErrorContext";
// import { lazy } from "react";

// import LoginPage from "../pages/Login";

// import AdminLayout from "../pages/AdminLayout";
// import UserLayout from "../pages/UserLayout";

import AdminDashboard from "../pages/AdminDashboard";
// import UserDashboard from "../pages/UserDashboard";

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export interface routesType {
  path: string;
  element: React.ReactNode;
  children?: routesType[];
}

const routes: routesType[] = [
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "login",
    element: <LoginPage />,
  },
  {
    path: "",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Navigate to="/project" replace />,
      },
      {
        path: "dashboard",
        element: <AdminDashboard />,
      },
      // {
      //   path: "projects/:projectId",
      //   element: <ProjectDetails />,
      // },
      // {
      //   path: "projects/:projectId/files",
      //   element: <ProjectFiles />,
      // },
    ],
  },
  {
    path: "/error",
    element: <RenderError />,
  },
  {
    path: "*",
    element: <MissingComponent />,
  },
];

const mapRoutes = (routes: routesType[]): routesType[] => {
  return routes.map((route) => ({
    path: route.path,
    element: route.element,
    errorElement: <RenderError />,
    children: route.children ? mapRoutes(route.children) : undefined,
  }));
};

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ErrorBoundaryWrapper>
        <QueryClientProvider client={queryClient}>
          <ErrorContextProvider>
            {/* <UserAuthContextProvider> */}
            {/* <ProjectContextProvider> */}
            <Outlet />
            {/* </ProjectContextProvider> */}
            {/* </UserAuthContextProvider> */}
          </ErrorContextProvider>
        </QueryClientProvider>
      </ErrorBoundaryWrapper>
    ),
    errorElement: <RenderError />,
    children: mapRoutes(routes),
  },
]);

export default router;
