import { Terminal } from "@/components/layout/Terminal";
import { CSVDropzone } from "@/components/import/CSVDropzone";

export default function ImportPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl text-terminal-green">
          <span className="text-terminal-cyan">$</span> import_csv
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Upload your Raymond James portfolio export
        </p>
      </div>

      <Terminal title="import">
        <CSVDropzone />
      </Terminal>
    </div>
  );
}
