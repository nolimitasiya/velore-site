// C:\Users\Asiya\projects\dalra\app\page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers, cookies } from "next/headers";
import Gate from "@/app/(gate)/Gate";
import LiveHome from "@/components/LiveHome";
import { getShopperPreferences } from "@/lib/shopperPreferences";
import SiteShell from "@/components/SiteShell";
import { requireBrandSession } from "@/lib/auth/BrandSession";
import { requireAdminSession } from "@/lib/auth/AdminSession";


export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  headers();

  const sp = (await searchParams) ?? {};
  const shopperPrefs = await getShopperPreferences();

  const region =
    typeof sp.region === "string" ? sp.region : undefined;

  const country =
    typeof sp.country === "string" ? sp.country : shopperPrefs.country;

const launchMode = process.env.LAUNCH_MODE === "true";
const cookieStore = await cookies();

let brandAuthed = false;

if (launchMode) {
  try {
    await requireBrandSession();
    brandAuthed = true;
  } catch {
    brandAuthed = false;
  }
}

let adminAuthed = false;

if (launchMode) {
  try {
    await requireAdminSession();
    adminAuthed = true;
  } catch {
    adminAuthed = false;
  }
}

const isAuthed = adminAuthed || brandAuthed;

  if (launchMode && !isAuthed) {
    return <Gate />;
  }

  return (
     <SiteShell>
    
      <LiveHome region={region} country={country} />
       </SiteShell>
  );
}