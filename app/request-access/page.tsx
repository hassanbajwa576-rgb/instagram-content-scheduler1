import RequestAccessForm from '@/components/RequestAccessForm';

export const metadata = { title: 'Request Instagram tester access · Universal Scheduler' };

export default async function RequestAccess({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return <RequestAccessForm fromSignIn={from === 'instagram'} />;
}
