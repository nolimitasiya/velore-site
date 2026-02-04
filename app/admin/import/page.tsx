import ImportClient from "@/components/import/ImportClient";

export default function Page() {
  return (
    <ImportClient
      mode="admin"
      title="Import"
      validateUrl="/api/admin/import/validate"
      importUrl="/api/admin/import"
      historyUrl="/api/admin/import/history"
      requireToken={true}
    />
  );
}
