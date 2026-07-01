import UploadSection from "../components/UploadSection";
import Gallery from "../components/Gallery";
import { useState } from "react";

function UserDashboard() {
  const [shouldPoll, setShouldPoll] = useState(false);

  return (
    <div>
      <h1 className="text-3xl font-bold">User Dashboard</h1>

      <UploadSection onUploadComplete={() => setShouldPoll(true)} />

      <Gallery
        shouldPoll={shouldPoll}
        onPollingStopped={() => setShouldPoll(false)}
      />
    </div>
  );
}

export default UserDashboard;
