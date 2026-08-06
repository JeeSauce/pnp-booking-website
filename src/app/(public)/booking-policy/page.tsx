import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";

export const metadata: Metadata = {
  title: "Booking policy",
};

export default function BookingPolicyPage() {
  return (
    <LegalPage title="Booking policy" updated="August 2026">
      <section>
        <h2>Appointments</h2>
        <p>
          Every appointment is a two-hour session with your chosen technician at our single studio.
          Bookings are confirmed automatically the moment you complete the form.
        </p>
      </section>
      <section>
        <h2>No online cancellation or rescheduling</h2>
        <p>
          Appointments cannot be cancelled or rescheduled from the website. You will review and
          accept this policy before confirming your booking. If you need to make a change, please
          contact the studio directly and our team will assist you.
        </p>
      </section>
      <section>
        <h2>Payment</h2>
        <p>
          Payment is made manually by scanning our MariBank QR code. After paying, send your receipt
          to us through Facebook Messenger. Your appointment is reserved right away; our team then
          verifies your payment. Bookings begin as &ldquo;payment unverified&rdquo; until confirmed
          by staff.
        </p>
      </section>
      <section>
        <h2>Arrival</h2>
        <p>
          Please arrive on time so your full two hours can be dedicated to your service. Late
          arrivals may shorten the session.
        </p>
      </section>
      <p className="text-xs">
        This is placeholder policy text for the demo. Replace it with your studio&rsquo;s finalized
        policy before launch.
      </p>
    </LegalPage>
  );
}
