"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Ban, CheckCircle, Loader2, ArrowLeft, Building2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/erp/Panel";
import { cn } from "@/lib/utils/cn";

type Identity = {
  id: string;
  displayName: string;
  primaryContact: string;
  contactPhone: string;
  deliveryAddress: string;
  isActive: boolean;
  institution: {
    id: string;
    name: string;
    type: string;
    parentInstitution: { id: string; name: string } | null;
  };
};

export default function IdentitiesPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/identities")
      .then((r) => r.json())
      .then((res) => setIdentities(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/identities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) {
        setIdentities((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isActive: !current } : i))
        );
      }
    } catch {}
  }

  const activeIdentities = identities.filter((i) => i.isActive);
  const inactiveIdentities = identities.filter((i) => !i.isActive);

  return (
    <div>
      <Link
        href="/erp"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="Identitas Dapur (Customer Portal)"
          description="Kelola identitas dapur yang muncul di portal pemesanan B2B."
        />
        <Link
          href="/erp/customers/identities/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Identitas
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active identities */}
          <Panel>
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Aktif ({activeIdentities.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Dapur</th>
                    <th className="pb-2 font-medium">Yayasan</th>
                    <th className="pb-2 font-medium">Kontak</th>
                    <th className="pb-2 font-medium">Alamat Pengiriman</th>
                    <th className="pb-2 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {activeIdentities.map((identity) => (
                    <tr key={identity.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <div className="font-medium text-gray-900">{identity.displayName}</div>
                            <div className="text-xs text-gray-500">{identity.institution.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {identity.institution.parentInstitution?.name || "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-gray-900">{identity.primaryContact}</div>
                        <div className="text-xs text-gray-500">{identity.contactPhone}</div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 max-w-xs truncate">
                        {identity.deliveryAddress}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/erp/customers/identities/${identity.id}/edit`}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => toggleActive(identity.id, identity.isActive)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeIdentities.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Belum ada identitas aktif
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Inactive identities */}
          {inactiveIdentities.length > 0 && (
            <Panel>
              <h3 className="mb-4 text-base font-semibold text-gray-500">
                Nonaktif ({inactiveIdentities.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {inactiveIdentities.map((identity) => (
                      <tr key={identity.id} className="border-b last:border-0 opacity-60">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-gray-300" />
                            <div>
                              <div className="font-medium text-gray-900">{identity.displayName}</div>
                              <div className="text-xs text-gray-500">{identity.institution.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {identity.institution.parentInstitution?.name || "-"}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="text-gray-900">{identity.primaryContact}</div>
                          <div className="text-xs text-gray-500">{identity.contactPhone}</div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500 max-w-xs truncate">
                          {identity.deliveryAddress}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => toggleActive(identity.id, identity.isActive)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
