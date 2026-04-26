import { captureLeadAction } from "./actions";
import HomeMarketing from "./home-marketing";

type HomePageProps = {
  searchParams: Promise<{
    submitted?: string;
    error?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const submitted = params.submitted === "1";
  const leadError = params.error === "lead";

  return <HomeMarketing submitted={submitted} leadError={leadError} captureLeadAction={captureLeadAction} />;
}
