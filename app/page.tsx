export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default function Page() {
  headers(); // force runtime evaluation (prevents static ○ /)

  const launchMode = process.env.LAUNCH_MODE === "true"; // true = coming soon

  redirect(launchMode ? "/brand-apply" : "/live");
}
