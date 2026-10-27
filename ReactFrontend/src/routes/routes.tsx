import { Suspense } from "react";
import { Navigate, createBrowserRouter, Outlet } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import ErrorBoundaryWrapper from "../components/ErrorBoundaryWrapper";
import RouteErrorFallback from "../components/RouteErrorFallback";
import { ErrorContextProvider } from "../context/ErrorContext";
import {
  AdminDashboard,
  LoginPage,
  MissingComponent,
  ProtectedAppRoute,
  RenderError,
  RouteLoading,
  UserDashboard,
} from "./lazyRouteComponents";
import store from "../store/authStore";

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
  element?: React.ReactNode;
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
    element: <ProtectedAppRoute />,
    children: [
      {
        path: "admin",
        children: [
          {
            path: "dashboard",
            element: <AdminDashboard />,
          },
        ],
      },
      {
        path: "user",
        children: [
          {
            path: "dashboard",
            element: <UserDashboard />,
          },
        ],
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

const mapRoutes = (routeList: routesType[]): routesType[] => {
  return routeList.map((route) => ({
    path: route.path,
    element: route.element,
    errorElement: <RouteErrorFallback />,
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
              <Suspense fallback={<RouteLoading />}>
                <Outlet />
              </Suspense>
            </ErrorContextProvider>
          </QueryClientProvider>
        </ErrorBoundaryWrapper>
      </Provider>
    ),
    errorElement: <RouteErrorFallback />,
    children: mapRoutes(routes),
  },
]);

export default router;
