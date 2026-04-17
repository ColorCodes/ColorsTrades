import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { CsvImporter } from "./csv-importer";

export default async function CsvImportPage() {
  const user = await requireUser();
  const accounts = await prisma.propFirmAccount.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl sm:text-2xl font-bold">CSV import</h1>
      <p className="text-sm text-muted-foreground">Upload a trade CSV, map the columns, preview, then import.</p>
      <CsvImporter accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
    </div>
  );
}
