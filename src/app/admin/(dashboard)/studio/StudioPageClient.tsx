"use client";

import { useSearchParams } from "next/navigation";
import StudioWorkstation from "@/components/studio/StudioWorkstation";

export default function StudioPageClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || undefined;

  return <StudioWorkstation initialOrderId={orderId} />;
}
