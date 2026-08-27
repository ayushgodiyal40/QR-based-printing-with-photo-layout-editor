import OrderTrackingClient from "./OrderTrackingClient";

export const metadata = {
  title: "Track Your Print Order",
  description: "Check the status of your print order.",
};

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderTrackingClient orderId={orderId} />;
}
