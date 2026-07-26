import { getReferralInfo } from "@/lib/referral-info";
import ReferralLandingPage from "./ReferralLandingPage";

// Server Component: trae el referral-info en el servidor para que la landing
// pinte instantánea (sin spinner ni fetch cliente). El estado del embudo
// (landing → form → success) sigue en el componente cliente.
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const info = await getReferralInfo(code);
  return <ReferralLandingPage initialInfo={info} code={code} />;
}
