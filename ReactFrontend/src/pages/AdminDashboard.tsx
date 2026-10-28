import { useEffect } from "react";
import Gallery from "../components/Gallery";
import useErrorContext from "../hooks/useError";
import { useApi } from "../hooks/useAPI";

type DashboardStats = {
  totalAssets: number;
  totalUsers: number;
  totalDownloads: number;
  storageUsed: number; // bytes
};

type DashboardStatsResponse = {
  success: boolean;
  message: string;
  data: DashboardStats;
};

const emptyStats: DashboardStats = {
  totalAssets: 0,
  totalUsers: 0,
  totalDownloads: 0,
  storageUsed: 0,
};

export default function AdminDashboard() {
  const { showErrorMessage } = useErrorContext();
  const { data: statsResponse, error } = useApi<DashboardStatsResponse>({
    queryKey: ["adminStats"],
    url: "/assets/dashboard",
    method: "GET",
  });
  const stats = statsResponse?.data ?? emptyStats;

  useEffect(() => {
    if (!error) return;
    const message =
      error instanceof Error
        ? error.message
        : error &&
            typeof error === "object" &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : "Unable to fetch dashboard statistics";
    showErrorMessage(message);
  }, [error, showErrorMessage]);

  return (
    <div>
      <h2 className="text-3xl font-bold">Admin Dashboard</h2>

      <div className="grid grid-cols-1 gap-6 mt-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Assets</p>
          <span className="mt-3 block text-4xl font-bold text-slate-800">
            {stats.totalAssets}
          </span>
        </div>

        <div className="rounded-xl bg-white p-6 shadow border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Users</p>
          <span className="mt-3 block text-4xl font-bold text-slate-800">
            {stats.totalUsers}
          </span>
        </div>

        <div className="rounded-xl bg-white p-6 shadow border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Downloads</p>
          <span className="mt-3 block text-4xl font-bold text-slate-800">
            {stats.totalDownloads}
          </span>
        </div>

        <div className="rounded-xl bg-white p-6 shadow border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Storage Used</p>
          <span className="mt-3 block text-4xl font-bold text-slate-800">
            {Number(stats.storageUsed).toFixed(2)} MB
          </span>
        </div>
      </div>

      <Gallery isAdmin />
    </div>
  );
}
