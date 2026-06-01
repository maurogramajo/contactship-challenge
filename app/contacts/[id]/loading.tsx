import { DetailPageSkeleton } from "@/components/ui/loading-skeleton";

export default function ContactDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DetailPageSkeleton />
    </div>
  );
}
