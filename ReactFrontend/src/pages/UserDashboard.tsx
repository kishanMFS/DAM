import UploadSection from "../components/UploadSection";
import Gallery from "../components/Gallery";
import { useCallback, useState } from "react";
import type { ActiveUploadProgress } from "../types/fileTypes";

function UserDashboard() {
  const [shouldPoll, setShouldPoll] = useState(false);
  const [sourceObjectNames, setSourceObjectNames] = useState<string[]>([]);
  const [activeUploads, setActiveUploads] = useState<ActiveUploadProgress[]>(
    [],
  );

  const updateUploadProgress = useCallback((upload: ActiveUploadProgress) => {
    setActiveUploads((uploads) => {
      const existingIndex = uploads.findIndex((item) => item.id === upload.id);

      if (existingIndex === -1) {
        return [...uploads, upload];
      }

      return uploads.map((item) => (item.id === upload.id ? upload : item));
    });
  }, []);

  const removeSyncedUploads = useCallback((objectNames: string[]) => {
    setActiveUploads((uploads) =>
      uploads.filter((upload) => !objectNames.includes(upload.objectName)),
    );
  }, []);
  const handlePollingStopped = useCallback(() => {
    setShouldPoll(false);
    setSourceObjectNames([]);
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h2 className="mb-2 text-2xl font-bold">User Dashboard</h2>

      <UploadSection
        onUploadComplete={(objectNames) => {
          setSourceObjectNames(objectNames);
          setShouldPoll(true);
        }}
        onProgress={updateUploadProgress}
      />

      <Gallery
        shouldPoll={shouldPoll}
        sourceObjectNames={sourceObjectNames}
        onPollingStopped={handlePollingStopped}
        activeUploads={activeUploads}
        onUploadsSynced={removeSyncedUploads}
      />
    </div>
  );
}

export default UserDashboard;
