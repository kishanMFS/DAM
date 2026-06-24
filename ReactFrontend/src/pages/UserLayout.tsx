import { Outlet, Link } from "react-router-dom";

export default function UserLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-blue-700 text-white p-5">
        <h2 className="font-bold text-xl mb-6">User</h2>

        <nav className="space-y-3">
          <Link to="/user/dashboard" className="block">
            Dashboard
          </Link>

          <Link to="/user/assets" className="block">
            Assets
          </Link>

          <Link to="/user/profile" className="block">
            Profile
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
