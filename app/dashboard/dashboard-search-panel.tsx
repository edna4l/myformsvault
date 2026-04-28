import { DashboardSearch } from "@/app/dashboard/dashboard-search";
import { getDashboardSearchIndex } from "@/lib/dashboard-search";

export async function DashboardSearchPanel() {
  const items = await getDashboardSearchIndex();

  return <DashboardSearch items={items} />;
}
