import { AdminZipInventoryManager } from "@/components/admin-zip-inventory-manager";

type SearchParams = Promise<{
  assigned?: string;
  reassigned?: string;
  released?: string;
  invited?: string;
  error?: string;
}>;

export default async function AdminInventoryManagerPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return <AdminZipInventoryManager searchParams={params} />;
}
