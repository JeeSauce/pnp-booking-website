import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="August 2026">
      <section>
        <h2>What we collect</h2>
        <p>
          To manage your appointment we collect your full name, mobile number, email address, your
          selected service and technician, your appointment time, and any optional notes or nail
          reference photo you provide.
        </p>
      </section>
      <section>
        <h2>Reference photos</h2>
        <p>
          Nail reference photos are stored privately and are visible only to authorized studio
          staff. They are used solely to prepare for your appointment.
        </p>
      </section>
      <section>
        <h2>How we use your information</h2>
        <p>
          Your details are used to confirm your booking, send appointment reminders, coordinate with
          your technician&rsquo;s calendar, and verify your payment. We do not sell your
          information.
        </p>
      </section>
      <section>
        <h2>Email</h2>
        <p>
          We send transactional emails such as booking confirmations, reminders, and payment
          updates. These are part of the booking service and are not marketing messages.
        </p>
      </section>
      <p className="text-xs">
        This is placeholder privacy text for the demo. Replace it with your finalized privacy policy
        before launch.
      </p>
    </LegalPage>
  );
}
