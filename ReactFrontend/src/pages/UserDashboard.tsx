import UploadSection from "../components/UploadSection";
import Gallery from "../components/Gallery";
import { useState } from "react";

function UserDashboard() {
  const [shouldPoll, setShouldPoll] = useState(false);

  return (
    <div>
      <UploadSection onUploadComplete={() => setShouldPoll(true)} />

      <Gallery
        shouldPoll={shouldPoll}
        onPollingStopped={() => setShouldPoll(false)}
      />
    </div>
  );
}

export default UserDashboard;
