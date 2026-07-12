import { PlaceholderPage } from '@/components/PlaceholderPage';

export default function StoreDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PlaceholderPage
      title="Store Detail"
      description={`Details for store ${params.id}. Coming soon.`}
    />
  );
}
