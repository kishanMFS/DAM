import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";

function ProtectedAppRoute() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

export default ProtectedAppRoute;
