"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, GitPullRequest, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExportButton } from "@/components/reports/ExportButton";
import type { ReportModule, ReportFilters as Filters } from "@/lib/api/reports";

interface ModuleCardProps {
  module: ReportModule;
  label: string;
  icon: React.ElementType;
  iconColor: string;
}

function ModuleCard({ module, label, icon: Icon, iconColor }: ModuleCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>({});

  return (
    <Card className="shadow-sm">
      <CardHeader
        className="cursor-pointer select-none flex flex-row items-center justify-between py-4"
        onClick={() => setIsOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-5 pt-0">
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Apply Filters (optional)</p>
            <ReportFilters filters={filters} onChange={setFilters} />
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Filters are applied to the exported file.
            </p>
            <ExportButton module={module} filters={filters} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

const MODULES: ModuleCardProps[] = [
  { module: "implementations", label: "Venue Implementations", icon: Building2, iconColor: "text-blue-600" },
  { module: "change-requests", label: "Change Requests", icon: GitPullRequest, iconColor: "text-indigo-600" },
  { module: "product-updates", label: "Product Updates", icon: Package, iconColor: "text-purple-600" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Export delivery data for each module as Excel or CSV.
        </p>
      </motion.div>

      <div className="space-y-4">
        {MODULES.map((m, i) => (
          <motion.div
            key={m.module}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <ModuleCard {...m} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
