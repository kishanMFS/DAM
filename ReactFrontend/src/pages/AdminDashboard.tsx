import { useEffect, useState } from "react";
import Gallery from "../components/Gallery";
import fileService from "../services/fileService";
import useErrorContext from "../hooks/useError";

type DashboardStats = {
  totalAssets: number;
  totalUsers: number;
  totalDownloads: number;
  storageUsed: number; // bytes
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    totalUsers: 0,
    totalDownloads: 0,
    storageUsed: 0,
  });
  const { showErrorMessage } = useErrorContext();

  useEffect(() => {
    const getDashboard = async () => {
      try {
        const adminStats = await fileService.getAdminStats();
        setStats(adminStats.data);
      } catch (err) {
        // console.error(err);
        if (err instanceof Error) {
          showErrorMessage(err.message);
        }
      }
    };

    getDashboard();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

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

      <Gallery />
    </div>
  );
}
