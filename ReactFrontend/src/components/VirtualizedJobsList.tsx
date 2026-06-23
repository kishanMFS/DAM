import { List, type RowComponentProps } from "react-window";
import type { projectJobType } from "../types/projects";
import ProjectDetailsModuleCSS from "../styles/ProjectDetails.module.css";

interface Props {
  jobs: projectJobType[];
  onDownload: (zipname: string) => void;
}

interface RowData {
  jobs: projectJobType[];
  onDownload: (zipname: string) => void;
}

function Row({ index, style, jobs, onDownload }: RowComponentProps<RowData>) {
  const job = jobs[index];

  return (
    <div style={style} className={ProjectDetailsModuleCSS.jobDetails}>
      <div className={ProjectDetailsModuleCSS.jobRow}>{job.jobid}</div>

      <div className={ProjectDetailsModuleCSS.jobRow}>
        {job.status === "COMPLETED" ? (
          <a
            href=""
            onClick={(e) => {
              e.preventDefault();
              onDownload(job.zipname!);
            }}
          >
            {job.zipname}
          </a>
        ) : (
          job.zipname
        )}
      </div>

      <div className={ProjectDetailsModuleCSS.jobRow}>
        {job.status}
        {job.progress! > 0 && job.progress! < 100 && ` (${job.progress}%)`}
      </div>
    </div>
  );
}

export default function VirtualizedJobsList({ jobs, onDownload }: Props) {
  return (
    <List
      rowComponent={Row}
      rowCount={jobs.length}
      rowHeight={25}
      rowProps={{
        jobs,
        onDownload,
      }}
      style={{
        height: 200,
        width: "100%",
      }}
    />
  );
}
