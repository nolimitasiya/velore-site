"use client";

type Item = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  socialMedia: string | null;
  status: string;
  createdAt: Date;
  internalNotes: { id: string; content: string; createdAt: Date }[];
};

import StatusSelect from "./StatusSelect";
import ApplicationNotesButton from "./ApplicationNotesButton";
import Link from "next/link";

function statusBadge(status: string) {
  const s = String(status || "").toLowerCase();
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em]";
  if (s === "onboarded") return { cls: `${base} border-purple-200 bg-purple-50 text-purple-800`, label: "ONBOARDED" };
  if (s === "invited") return { cls: `${base} border-blue-200 bg-blue-50 text-blue-700`, label: "INVITED" };
  if (s === "contract_sent") return { cls: `${base} border-yellow-200 bg-yellow-50 text-yellow-800`, label: "CONTRACT SENT" };
  if (s === "contract_signed") return { cls: `${base} border-green-200 bg-green-50 text-green-800`, label: "CONTRACT SIGNED" };
  if (s === "contacted") return { cls: `${base} border-amber-200 bg-amber-50 text-amber-800`, label: "CONTACTED" };
  if (s === "rejected") return { cls: `${base} border-orange-200 bg-orange-50 text-orange-800`, label: "REJECTED" };
  return { cls: `${base} border-neutral-200 bg-neutral-50 text-neutral-700`, label: "NEW" };
}

function rowHighlight(status: unknown) {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "contacted") return "row--contacted";
  if (s === "invited") return "row--invited";
  if (s === "contract_sent") return "row--contract_sent";
  if (s === "contract_signed") return "row--contract_signed";
  if (s === "onboarded") return "row--onboarded";
  if (s === "rejected") return "row--rejected";
  return "row--new";
}

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

export default function ApplicationsTable({ items }: { items: Item[] }) {
  function syncScroll(fromId: string, toId: string) {
    return (e: React.UIEvent<HTMLDivElement>) => {
      const target = document.getElementById(toId);
      if (target) target.scrollLeft = e.currentTarget.scrollLeft;
    };
  }

  return (
    <>
      <div
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#e8ddd4] scrollbar-track-transparent"
        id="apps-scroll-top"
        onScroll={syncScroll("apps-scroll-top", "apps-scroll-bottom")}
      >
        <div style={{ height: 8 }} className="min-w-[1180px]" />
      </div>

      <div
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#e8ddd4] scrollbar-track-transparent"
        id="apps-scroll-bottom"
        onScroll={syncScroll("apps-scroll-bottom", "apps-scroll-top")}
      >
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-[#fdf7f4] text-left">
            <tr className="text-xs uppercase tracking-[0.16em] text-[#a89280]">
              <th className="px-6 py-4 font-semibold">Contact</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold">Phone</th>
              <th className="px-6 py-4 font-semibold">Website</th>
              <th className="px-6 py-4 font-semibold">Social</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Created</th>
              <th className="px-6 py-4 font-semibold">Stage</th>
              <th className="px-6 py-4 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const name = [a.firstName, a.lastName].filter(Boolean).join(" ") || "—";
              const b = statusBadge(a.status);
              return (
                <tr
                  key={a.id}
                  className={["border-t border-black/5 align-top transition-colors hover:bg-black/[0.02]", rowHighlight(a.status)].join(" ")}
                >
                  <td className="px-6 py-4">
  <Link
    href={`/admin/brands/applications/${a.id}`}
    className="font-medium text-neutral-950 underline decoration-transparent underline-offset-4 transition hover:text-[#7B2D3E] hover:decoration-[#7B2D3E]/40"
  >
    {name}
  </Link>
</td>
                  <td className="px-6 py-4">
                    <a className="break-all text-neutral-700 underline decoration-black/20 underline-offset-4 transition hover:text-neutral-950" href={`mailto:${a.email}`}>
                      {a.email}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    {a.phone ? (
                      <a className="text-neutral-700 underline decoration-black/20 underline-offset-4 transition hover:text-neutral-950" href={`tel:${a.phone}`}>
                        {a.phone}
                      </a>
                    ) : <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {a.website ? (
                      <a className="break-all text-neutral-700 underline decoration-black/20 underline-offset-4 transition hover:text-neutral-950"
                        href={a.website.startsWith("http") ? a.website : `https://${a.website}`}
                        target="_blank" rel="noreferrer">
                        {a.website}
                      </a>
                    ) : <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {a.socialMedia ? (
                      <a className="break-all text-neutral-700 underline decoration-black/20 underline-offset-4 transition hover:text-neutral-950"
                        href={a.socialMedia.startsWith("http") ? a.socialMedia : `https://${a.socialMedia}`}
                        target="_blank" rel="noreferrer">
                        {a.socialMedia}
                      </a>
                    ) : <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={b.cls}>{b.label}</span>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {fmt(a.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusSelect id={String(a.id)} value={String(a.status)} />
                  </td>
                  <td className="px-6 py-4">
                    <ApplicationNotesButton applicationId={String(a.id)} initialNotes={a.internalNotes} />
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-sm text-neutral-500">
                  No applications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}