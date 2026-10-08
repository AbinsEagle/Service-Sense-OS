import { ChevronLeft } from "lucide-react";
import { category } from "@/config/catalog";
import { IconButton, TopAppBar } from "@/components/m3";
import type { Check } from "@/lib/types";
import { ReportPreview } from "./ReportPreview";

export function HistoryDetail({ check, onBack }: { check: Check; onBack(): void }) {
  return (
    <div className="min-h-svh pb-10">
      <TopAppBar
        leading={
          <IconButton label="Back" onClick={onBack}>
            <ChevronLeft />
          </IconButton>
        }
        title={check.customer.name || check.product.serial}
        subtitle={`${category(check.product.categoryId)?.name} · ${check.product.serial} · ${new Date(check.finishedAt!).toLocaleDateString("en-IN", { dateStyle: "medium" })}`}
      />
      <main className="mx-auto max-w-2xl px-4 pt-2">
        <ReportPreview check={check} />
      </main>
    </div>
  );
}
