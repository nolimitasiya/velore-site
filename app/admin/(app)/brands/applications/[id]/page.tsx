import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import StatusSelect from "../StatusSelect";
import ApplicationNotesButton from "../ApplicationNotesButton";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmt(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function leadBadgeClass(value: string | null | undefined) {
  if (value === "HOT") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (value === "WARM") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (value === "COLD") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return "bg-neutral-50 text-neutral-500 border-neutral-200";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-neutral-900">
        {value || "—"}
      </div>
    </div>
  );
}



function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-neutral-950">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

async function updateLeadQualification(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const leadTemperature = String(formData.get("leadTemperature") || "");
  const leadScoreRaw = String(formData.get("leadScore") || "");
  const nextFollowUpRaw = String(formData.get("nextFollowUpAt") || "");

  await prisma.brandApplication.update({
    where: { id },
    data: {
      leadTemperature: leadTemperature ? (leadTemperature as any) : null,
      leadScore: leadScoreRaw ? Number(leadScoreRaw) : null,
      nextFollowUpAt: nextFollowUpRaw ? new Date(nextFollowUpRaw) : null,
    },
  });

  revalidatePath(`/admin/brands/applications/${id}`);
}

export default async function BrandApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;

  const application = await prisma.brandApplication.findUnique({
    where: { id },
    include: {
  internalNotes: {
    orderBy: { createdAt: "desc" },
  },
  activities: {
  orderBy: { createdAt: "desc" },
},
},
  });

  if (!application) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Application not found</h1>
        <Link
          className="mt-4 inline-block text-sm underline"
          href="/admin/brands/applications"
        >
          Back to applications
        </Link>
      </main>
    );
  }

  const app = application as any;

const brandDisplayName =
  app.brandName ||
  app.companyName ||
  app.businessName ||
  app.brand ||
  app.name ||
  app.email ||
  "Brand application";

const contactDisplayName =
  app.contactName ||
  app.fullName ||
  app.name ||
  app.firstName ||
  "—";

const instagramDisplay =
  app.instagram ||
  app.instagramHandle ||
  app.instagramUrl ||
  "—";

const countryDisplay =
  app.country ||
  app.brandCountry ||
  app.location ||
  "—";

const cityDisplay =
  app.city ||
  app.brandCity ||
  "—";

const activities = application.activities ?? [];


  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
        <div className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin · Brand CRM
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {brandDisplayName}
              </h1>

              <p className="mt-2 text-sm text-white/55">
                Application created {fmt(application.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatusSelect
              id={application.id}
              value={application.status}
              />

              <Link
                href="/admin/brands/applications"
                className="inline-flex h-10 items-center rounded-2xl border border-white/20 bg-white/10 px-4 text-sm text-white/80 transition hover:bg-white/15"
              >
                Back
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SectionCard eyebrow="Overview" title="Brand Overview">
            <div className="grid gap-5 sm:grid-cols-2">
              <DetailItem label="Brand name" value={brandDisplayName} />

              <DetailItem
                label="Website"
                value={
                  application.website ? (
                    <a
                      href={application.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#7B2D3E] underline decoration-[#7B2D3E]/30 underline-offset-4 hover:decoration-[#7B2D3E]"
                    >
                      {application.website}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />

              <DetailItem
                label="Instagram"
                value={instagramDisplay}
              />

              <DetailItem label="Country" value={countryDisplay} />
              <DetailItem label="City" value={cityDisplay} />
              <DetailItem
                label="Source"
                value={application.applicationSource}
              />
              <DetailItem label="Status" value={application.status} />
              <DetailItem label="Submitted" value={fmt(application.createdAt)} />
            </div>
          </SectionCard>

          <SectionCard eyebrow="Contact" title="Contact Information">
            <div className="grid gap-5 sm:grid-cols-2">
              <DetailItem label="Contact name" value={contactDisplayName} />

              <DetailItem
                label="Email"
                value={
                  application.email ? (
                    <a
                      href={`mailto:${application.email}`}
                      className="text-[#7B2D3E] underline decoration-[#7B2D3E]/30 underline-offset-4 hover:decoration-[#7B2D3E]"
                    >
                      {application.email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />

              <DetailItem
                label="Phone"
                value={
                  application.phone ? (
                    <a
                      href={`tel:${application.phone}`}
                      className="text-[#7B2D3E] underline decoration-[#7B2D3E]/30 underline-offset-4 hover:decoration-[#7B2D3E]"
                    >
                      {application.phone}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </SectionCard>
          <SectionCard eyebrow="Qualification" title="Lead Qualification">
  <form action={updateLeadQualification} className="space-y-5">
    <input type="hidden" name="id" value={application.id} />

    <div className="grid gap-5 sm:grid-cols-3">
      <div>
  <label
    htmlFor="leadTemperature"
    className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400"
  >
    Lead temperature
  </label>

  <select
    id="leadTemperature"
    name="leadTemperature"
    aria-label="Lead temperature"
    defaultValue={application.leadTemperature ?? ""}
    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-[#7B2D3E]"
  >
    <option value="">Not set</option>
    <option value="HOT">🔥 Hot</option>
    <option value="WARM">🌤️ Warm</option>
    <option value="COLD">❄️ Cold</option>
  </select>
</div>

      <div>
        <label
  htmlFor="leadScore"
  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400"
>
  Lead score
</label>

<input
  id="leadScore"
  name="leadScore"
  aria-label="Lead score"
  type="number"
  min="1"
  max="10"
  defaultValue={application.leadScore ?? ""}
  placeholder="1–10"
  className="mt-2 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#7B2D3E]"
/>
      </div>

      <div>
        <label
  htmlFor="nextFollowUpAt"
  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400"
>
  Next follow-up
</label>

<input
  id="nextFollowUpAt"
  name="nextFollowUpAt"
  aria-label="Next follow-up date"
  type="date"
  defaultValue={
    application.nextFollowUpAt
      ? application.nextFollowUpAt.toISOString().slice(0, 10)
      : ""
  }
  className="mt-2 w-full rounded-2xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-[#7B2D3E]"
/>
      </div>
    </div>

    <button
      type="submit"
      className="rounded-2xl bg-[#7B2D3E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#692635]"
    >
      Save qualification
    </button>
  </form>
</SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SectionCard eyebrow="Notes" title="Internal Notes">
            <div className="mb-4">
              <ApplicationNotesButton
                applicationId={application.id}
                initialNotes={application.internalNotes}
              />
            </div>

            {application.internalNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-neutral-50 p-5 text-sm text-neutral-500">
                No notes yet.
              </div>
            ) : (
              <div className="space-y-3">
                {application.internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-black/10 bg-neutral-50/70 p-4"
                  >
                    <p className="text-sm leading-6 text-neutral-800">
                      {note.content}
                    </p>
                    <p className="mt-2 text-xs text-neutral-400">
                      {fmt(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard eyebrow="Timeline" title="Activity Timeline">
  {activities.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-black/10 bg-neutral-50 p-5 text-sm text-neutral-500">
      No activity yet.
    </div>
  ) : (
    <div className="space-y-3">
      {activities.map((activity: any) => (
        <div
          key={activity.id}
          className="rounded-2xl border border-black/10 bg-neutral-50/70 p-4"
        >
          <p className="text-sm font-medium text-neutral-900">
            {activity.message}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {fmt(activity.createdAt)}
          </p>
        </div>
      ))}
    </div>
  )}
</SectionCard>
        </div>
      </div>
    </main>
  );
}