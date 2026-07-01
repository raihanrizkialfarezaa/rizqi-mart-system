import { ReactNode } from "react";
import Sidebar from "@/components/erp/Sidebar";
import Topbar from "@/components/erp/Topbar";

export default function ErpLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Rizqi Mart ERP" />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
