import { Outlet, Link } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-slate-900 text-white p-5">
        <h2 className="font-bold text-xl mb-6">Admin</h2>

        <nav className="space-y-3">
          <Link to="/admin/dashboard" className="block">
            Dashboard
          </Link>

          <Link to="/admin/users" className="block">
            Users
          </Link>

          <Link to="/admin/assets" className="block">
            Assets
          </Link>

          <Link to="/admin/analytics" className="block">
            Analytics
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
