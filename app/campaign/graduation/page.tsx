export const dynamic = "force-dynamic";
export const revalidate = 0;

import { cookies } from "next/headers";
import GraduationCampaignLogin from "@/components/campaign/GraduationCampaignLogin";
import GraduationCampaignHome from "@/components/campaign/GraduationCampaignHome";

export default async function GraduationCampaignPage() {
  const cookieStore = await cookies();

  const authed = Boolean(
    cookieStore.get(
      "graduation_campaign_authed"
    )?.value
  );

  if (!authed) {
    return <GraduationCampaignLogin />;
  }
  

  return <GraduationCampaignHome />;
}