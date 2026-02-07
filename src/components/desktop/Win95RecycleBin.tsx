import { useState } from "react";
import { Win95Window } from "./Win95Window";
import styles from "./Win95RecycleBin.module.scss";

interface Win95RecycleBinProps {
  onClose: () => void;
  onMinimize?: () => void;
  isActive: boolean;
  onFocus: () => void;
  zIndex: number;
}

interface RecycleBinFile {
  name: string;
  originalLocation: string;
  dateDeleted: string;
  size: string;
}

const RECYCLE_BIN_FILES: RecycleBinFile[] = [
  {
    name: "my_patience_for_IE11.dll",
    originalLocation: "C:\\Career\\Frontend",
    dateDeleted: "3/15/2021 2:30 PM",
    size: "14.2 KB",
  },
  {
    name: "unnecessary_meetings.ics",
    originalLocation: "C:\\Calendar\\Recurring",
    dateDeleted: "6/1/2024 9:00 AM",
    size: "99.9 MB",
  },
  {
    name: "imposter_syndrome.exe",
    originalLocation: "C:\\Brain\\Doubts",
    dateDeleted: "12/31/2025 11:59 PM",
    size: "404 KB",
  },
  {
    name: "pixel_perfect_from_figma.psd",
    originalLocation: "C:\\Brain\\Opinions",
    dateDeleted: "8/14/2022 3:45 PM",
    size: "128 KB",
  },
  {
    name: "it_works_on_my_machine.log",
    originalLocation: "C:\\Excuses",
    dateDeleted: "11/20/2023 5:15 PM",
    size: "1 KB",
  },
  {
    name: "promise_to_write_tests_later.todo",
    originalLocation: "C:\\Lies\\Technical Debt",
    dateDeleted: "3/22/2019 10:00 AM",
    size: "0 KB",
  },
  {
    name: "quick_5min_fix.bat",
    originalLocation: "C:\\Weekend\\Plans",
    dateDeleted: "Every Friday",
    size: "256 KB",
  },
  {
    name: "side_project_i_will_finish.zip",
    originalLocation: "C:\\Dreams",
    dateDeleted: "4/1/2020 12:00 AM",
    size: "0 KB",
  },
  {
    name: "tabs_vs_spaces_debate.txt",
    originalLocation: "C:\\Arguments\\Eternal",
    dateDeleted: "1/1/1970 12:00 AM",
    size: "\u221E KB",
  },
];

/**
 * Win95-style Recycle Bin window with a detail list view.
 * Displays humorous "deleted" files themed around a developer career.
 */
export function Win95RecycleBin({
  onClose,
  onMinimize,
  isActive,
  onFocus,
  zIndex,
}: Win95RecycleBinProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <Win95Window
      title="Recycle Bin"
      onClose={onClose}
      onMinimize={onMinimize}
      isActive={isActive}
      onFocus={onFocus}
      zIndex={zIndex}
      initialWidth={560}
      initialHeight={380}
      minWidth={400}
      minHeight={250}
      initialX="center"
      initialY="center"
      contentClassName={styles.recycleBinContent}
    >
      <div className={styles.innerContent}>
        {/* Menu bar */}
        <div className={styles.menuBar}>
          <button type="button">File</button>
          <button type="button">Edit</button>
          <button type="button">View</button>
          <button type="button">Help</button>
        </div>

        {/* Column headers */}
        <div className={styles.columnHeaders} role="row">
          <div className={styles.columnHeader} role="columnheader">
            Name
          </div>
          <div className={styles.columnHeader} role="columnheader">
            Original Location
          </div>
          <div className={styles.columnHeader} role="columnheader">
            Date Deleted
          </div>
          <div className={styles.columnHeader} role="columnheader">
            Size
          </div>
        </div>

        {/* File list */}
        <div className={styles.fileList} role="grid" aria-label="Deleted files">
          {RECYCLE_BIN_FILES.map((file, index) => (
            <div
              key={file.name}
              className={`${styles.fileRow} ${selectedIndex === index ? styles.selected : ""}`}
              onClick={() => setSelectedIndex(index)}
              role="row"
              aria-selected={selectedIndex === index}
            >
              <div className={styles.fileCell} role="gridcell">
                <FileIcon name={file.name} />
                {file.name}
              </div>
              <div className={styles.fileCell} role="gridcell">
                {file.originalLocation}
              </div>
              <div className={styles.fileCell} role="gridcell">
                {file.dateDeleted}
              </div>
              <div className={styles.fileCell} role="gridcell">
                {file.size}
              </div>
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div className={styles.statusBar}>
          <div className={styles.statusSection}>
            {RECYCLE_BIN_FILES.length} object(s)
          </div>
          <div className={styles.statusSection}>{"\u221E"} KB</div>
        </div>
      </div>
    </Win95Window>
  );
}

/** Small 16x16 file-type icon based on extension */
function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  // Color mapping by file type
  const colorMap: Record<string, string> = {
    dll: "#808000",
    ics: "#008080",
    exe: "#000080",
    psd: "#800080",
    log: "#808080",
    todo: "#008000",
    bat: "#000",
    zip: "#804000",
    txt: "#000080",
  };

  const color = colorMap[ext] ?? "#808080";

  return (
    <svg
      className={styles.fileIcon}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Page shape */}
      <path d="M 2 1 L 10 1 L 14 5 L 14 15 L 2 15 Z" fill="#fff" />
      <path
        d="M 2 1 L 10 1 L 14 5 L 14 15 L 2 15 Z"
        fill="none"
        stroke="#000"
        strokeWidth="1"
      />
      {/* Folded corner */}
      <path
        d="M 10 1 L 10 5 L 14 5"
        fill="#c0c0c0"
        stroke="#000"
        strokeWidth="0.5"
      />
      {/* Extension label */}
      <rect x="1" y="9" width="10" height="5" rx="1" fill={color} />
      <text
        x="6"
        y="13"
        fill="#fff"
        fontSize="4"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        textAnchor="middle"
      >
        {ext.toUpperCase().slice(0, 3)}
      </text>
    </svg>
  );
}
