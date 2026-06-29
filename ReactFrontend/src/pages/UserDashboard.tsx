import UploadSection from "../components/UploadSection";

function UserDashboard() {
  return (
    <div>
      {/* <h1 className="text-3xl font-bold">My Assets</h1>

      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded shadow p-6">Upload Asset</div>

        <div className="bg-white rounded shadow p-6">My Downloads</div>

        <div className="bg-white rounded shadow p-6">Recent Files</div>
      </div> */}

      <UploadSection />
    </div>
  );
}

export default UserDashboard;
