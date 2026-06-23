import { Navigate, createBrowserRouter, Outlet } from "react-router-dom";

import Login from "../pages/Login";
import Projects from "../pages/Projects";
import ProjectDetails from "../pages/ProjectDetails";
import ProjectFiles from "../pages/ProjectFiles";
import MissingComponent from "../pages/MissingComponent";
import RenderError from "../pages/Error";

import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import { UserAuthContextProvider } from "../context/authenticationContext";
import { ProjectContextProvider } from "../context/ProjectContext";
import { ErrorContextProvider } from "../context/ErrorContext";
import ErrorBoundaryWrapper from "../components/ErrorBoundaryWrapper";
// import { lazy } from "react";

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
    element: <Login />,
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
        path: "projects",
        element: <Projects />,
      },
      {
        path: "projects/:projectId",
        element: <ProjectDetails />,
      },
      {
        path: "projects/:projectId/files",
        element: <ProjectFiles />,
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
      <ErrorBoundaryWrapper>
        <ErrorContextProvider>
          <UserAuthContextProvider>
            <ProjectContextProvider>
              <Outlet />
            </ProjectContextProvider>
          </UserAuthContextProvider>
        </ErrorContextProvider>
      </ErrorBoundaryWrapper>
    ),
    errorElement: <RenderError />,
    children: mapRoutes(routes),
  },
]);

export default router;
