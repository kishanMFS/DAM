import { Navigate, createBrowserRouter, Outlet } from "react-router-dom";
import { Provider } from "react-redux";

import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import ErrorBoundaryWrapper from "../components/ErrorBoundaryWrapper";

import LoginPage from "../pages/Login";
// import Dashboard from "../pages/Dashboard";

import MissingComponent from "../pages/MissingComponent";
import RenderError from "../pages/Error";

import { ErrorContextProvider } from "../context/ErrorContext";
import store from "../store/authStore";
// import { lazy } from "react";

// import AdminLayout from "../pages/AdminLayout";
// import UserLayout from "../pages/UserLayout";

import AdminDashboard from "../pages/AdminDashboard";
import UserDashboard from "../pages/UserDashboard";

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
        path: "admin",
        children: [
          {
            path: "dashboard",
            element: <AdminDashboard />,
          },
        ],
        element: undefined,
      },
      {
        path: "user",
        children: [
          {
            path: "dashboard",
            element: <UserDashboard />,
          },
        ],
        element: undefined,
      },
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
      <Provider store={store}>
        <ErrorBoundaryWrapper>
          <QueryClientProvider client={queryClient}>
            <ErrorContextProvider>
              <Outlet />
            </ErrorContextProvider>
          </QueryClientProvider>
        </ErrorBoundaryWrapper>
      </Provider>
    ),
    errorElement: <RenderError />,
    children: mapRoutes(routes),
  },
]);

export default router;
