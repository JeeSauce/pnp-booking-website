import { describe, expect, it } from "vitest";
import {
  bookingConfirmationTemplate,
  cancelledByAdminTemplate,
  newBookingAdminTemplate,
  paymentVerifiedTemplate,
  reminder2hTemplate,
  reminder24hTemplate,
  rescheduledByAdminTemplate,
  type BookingEmailTemplateData,
} from "@/lib/email/templates";

const RAW_START = "2026-08-12T01:30:00.000Z";
const RAW_END = "2026-08-12T03:30:00.000Z";

const data: BookingEmailTemplateData = {
  bookingCode: "PNP-EMAIL1",
  clientName: "Maria Santos",
  clientPhone: "09170000000",
  serviceName: "Gel Manicure",
  technicianName: "Ana Reyes",
  startsAt: RAW_START,
  endsAt: RAW_END,
  price: 850,
  businessName: "Poin't & Polish",
  address: "123 Example Ave, Makati City",
  facebookUrl: "https://facebook.com/pointandpolish",
  paymentAmountNote: "Please pay the full service price.",
};

const templates = [
  ["booking confirmation", bookingConfirmationTemplate],
  ["new booking admin", newBookingAdminTemplate],
  ["24-hour reminder", reminder24hTemplate],
  ["2-hour reminder", reminder2hTemplate],
  ["payment verified", paymentVerifiedTemplate],
  ["admin cancellation", cancelledByAdminTemplate],
  ["admin reschedule", rescheduledByAdminTemplate],
] as const;

describe("booking email templates", () => {
  it.each(templates)(
    "renders the %s template with Manila time and no storage internals",
    (_, render) => {
      const result = render(data);

      expect(result.subject.length).toBeGreaterThan(5);
      expect(result.html).toContain("Wednesday, August 12, 2026");
      expect(result.html).toContain("9:30 AM to 11:30 AM (Asia/Manila)");
      expect(result.text).toContain("Wednesday, August 12, 2026");
      expect(result.text).toContain("9:30 AM to 11:30 AM (Asia/Manila)");
      expect(result.html).toContain("font-family:Arial,Helvetica,sans-serif");
      expect(result.html).toContain("#6f1d3b");
      expect(result.html).not.toContain(RAW_START);
      expect(result.html).not.toContain(RAW_END);
      expect(result.text).not.toContain(RAW_START);
      expect(result.text).not.toContain(RAW_END);
      expect(JSON.stringify(result)).not.toContain("reference_photo_path");
      expect(JSON.stringify(result)).not.toContain("service-role");
    },
  );

  it("escapes client-controlled values in HTML", () => {
    const result = bookingConfirmationTemplate({
      ...data,
      clientName: "<script>alert('x')</script>",
      paymentAmountNote: "<b>Pay now</b>",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain("<b>Pay now</b>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("&lt;b&gt;Pay now&lt;/b&gt;");
  });

  it("does not turn unsafe stored URLs into email links", () => {
    const result = bookingConfirmationTemplate({
      ...data,
      facebookUrl: "javascript:alert(1)",
    });

    expect(result.html).not.toContain("javascript:");
    expect(result.text).not.toContain("javascript:");
  });
});
