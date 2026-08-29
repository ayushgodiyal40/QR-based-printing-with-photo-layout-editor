import { Suspense } from "react";
import StudioPageClient from "./StudioPageClient";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Photo & Layout Studio | PrintShop",
  description: "Create passport photos, ID grids, and custom A4 photo print layouts with precision",
};

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center bg-neutral-950 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-3" />
          <span className="text-sm font-medium">Loading Photo Studio...</span>
        </div>
      }
    >
      <StudioPageClient />
    </Suspense>
  );
}
