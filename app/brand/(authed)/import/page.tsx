import ImportClient from "@/components/import/ImportClient";

export default function Page() {
  return (
    <ImportClient
      mode="brand"
      title="Import"
      validateUrl="/api/brand/import/validate"
      importUrl="/api/brand/import"
      historyUrl="/api/brand/import/history"
      requireToken={false}
    />
  );
}
