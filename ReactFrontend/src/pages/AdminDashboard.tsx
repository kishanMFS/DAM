import Gallery from "../components/Gallery";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-4 gap-6 mt-8">
        <div className="bg-white shadow rounded p-6">Total Assets</div>

        <div className="bg-white shadow rounded p-6">Total Users</div>

        <div className="bg-white shadow rounded p-6">Downloads</div>

        <div className="bg-white shadow rounded p-6">Storage Used</div>
      </div>

      <Gallery />
    </div>
  );
}
