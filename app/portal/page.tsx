"use client";

import { useEffect, useState } from "react";
import { Building2, ArrowRight } from "lucide-react";

type Identity = {
  id: string;
  displayName: string;
  description: string | null;
  primaryContact: string;
  contactPhone: string;
  deliveryAddress: string;
  institution: {
    parentInstitution: { name: string } | null;
  };
};

export default function PortalHome() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/identities")
      .then((r) => r.json())
      .then((res) => {
        setIdentities(res.data?.filter((i: Identity & { isActive: boolean }) => i.isActive) || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function selectIdentity(id: string) {
    setSelecting(id);
    try {
      await fetch("/portal/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityId: id }),
      });
      window.location.href = "/portal/dashboard";
    } catch {
      setSelecting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Portal Pemesanan</h1>
            <p className="mt-1 text-sm text-gray-500">Memuat identitas dapur...</p>
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5">
                <div className="mb-3 h-4 w-2/3 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Portal Pemesanan</h1>
        <p className="mt-1 text-sm text-gray-500">Pilih dapur Anda untuk melanjutkan</p>
      </div>

      {/* Identity Cards */}
      <div className="space-y-3">
        {identities.map((identity) => (
          <button
            key={identity.id}
            onClick={() => selectIdentity(identity.id)}
            disabled={selecting === identity.id}
            className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all active:scale-[0.98] hover:border-primary/50 hover:shadow-md disabled:opacity-50"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-gray-900">{identity.displayName}</h3>
                {identity.description && (
                  <p className="mt-0.5 text-xs text-gray-400">{identity.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>👤 {identity.primaryContact}</span>
                  <span>📞 {identity.contactPhone}</span>
                </div>
                {identity.institution.parentInstitution && (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    🏢 {identity.institution.parentInstitution.name}
                  </div>
                )}
              </div>
              <div className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {selecting === identity.id ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </div>
            </div>
          </button>
        ))}

        {identities.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-400">Tidak ada dapur yang tersedia</p>
            <p className="mt-1 text-xs text-gray-300">Hubungi admin untuk mendaftarkan dapur Anda</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-gray-300">
        Rizqi Mart &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
