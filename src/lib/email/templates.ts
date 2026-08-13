import { toManila } from "@/lib/availability/time";
import type { NotificationType } from "@/types/database";

export type BookingEmailTemplateData = {
  bookingCode: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  technicianName: string;
  startsAt: string;
  endsAt: string;
  price: number;
  businessName: string;
  address: string | null;
  facebookUrl: string | null;
  paymentAmountNote: string | null;
};

export type EmailTemplate = { subject: string; html: string; text: string };

type TemplateCopy = {
  subject: string;
  eyebrow: string;
  heading: string;
  intro: string;
  closing: string;
  showPayment?: boolean;
  admin?: boolean;
};

const COLORS = {
  burgundy: "#6f1d3b",
  burgundyDark: "#4b1328",
  blush: "#f8eef1",
  cream: "#fffaf7",
  ink: "#2d2025",
  muted: "#6f6267",
  border: "#ead8de",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function httpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function appointment(data: BookingEmailTemplateData) {
  const start = toManila(data.startsAt);
  const end = toManila(data.endsAt);
  if (!start.isValid || !end.isValid) throw new Error("Email appointment time is invalid.");
  return {
    date: start.toFormat("cccc, LLLL d, yyyy"),
    time: `${start.toFormat("h:mm a")} to ${end.toFormat("h:mm a")} (Asia/Manila)`,
  };
}

function peso(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

function render(data: BookingEmailTemplateData, copy: TemplateCopy): EmailTemplate {
  const schedule = appointment(data);
  const facebookUrl = httpUrl(data.facebookUrl);
  const details: Array<[string, string]> = [
    ["Booking", data.bookingCode],
    ["Service", data.serviceName],
    ["Nail technician", data.technicianName],
    ["Date", schedule.date],
    ["Time", schedule.time],
    ["Amount", peso(data.price)],
  ];
  if (copy.admin) {
    details.splice(1, 0, ["Client", data.clientName], ["Mobile", data.clientPhone]);
  }

  const detailHtml = details
    .map(
      ([label, value]) =>
        `<tr><td style="padding:7px 12px 7px 0;color:${COLORS.muted};font-size:13px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:7px 0;color:${COLORS.ink};font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const paymentHtml = copy.showPayment
    ? `<div style="margin-top:24px;padding:18px;border:1px solid ${COLORS.border};border-radius:12px;background:${COLORS.blush};"><p style="margin:0 0 8px;color:${COLORS.burgundyDark};font-size:15px;font-weight:700;">Payment reminder</p><p style="margin:0;color:${COLORS.ink};font-size:14px;line-height:1.6;">${escapeHtml(data.paymentAmountNote ?? "Please send your payment receipt to the studio through Facebook Messenger for manual verification.")}</p>${
        facebookUrl
          ? `<p style="margin:14px 0 0;"><a href="${escapeHtml(facebookUrl)}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:${COLORS.burgundy};color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;">Open Facebook Messenger</a></p>`
          : ""
      }</div>`
    : "";
  const addressHtml = data.address
    ? `<p style="margin:8px 0 0;color:${COLORS.muted};font-size:13px;line-height:1.5;">${escapeHtml(data.address)}</p>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${COLORS.cream};font-family:Arial,Helvetica,sans-serif;color:${COLORS.ink};"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.cream};"><tr><td align="center" style="padding:32px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid ${COLORS.border};border-radius:18px;background:#ffffff;overflow:hidden;"><tr><td style="padding:28px 30px;background:${COLORS.burgundy};color:#ffffff;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(copy.eyebrow)}</p><h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:normal;">${escapeHtml(copy.heading)}</h1></td></tr><tr><td style="padding:30px;"><p style="margin:0 0 20px;font-size:16px;line-height:1.65;">${escapeHtml(copy.intro)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:14px 18px;border-radius:12px;background:${COLORS.cream};">${detailHtml}</table>${paymentHtml}<p style="margin:24px 0 0;font-size:14px;line-height:1.65;">${escapeHtml(copy.closing)}</p><p style="margin:22px 0 0;color:${COLORS.burgundy};font-family:Georgia,'Times New Roman',serif;font-size:19px;">${escapeHtml(data.businessName)}</p>${addressHtml}</td></tr></table></td></tr></table></body></html>`;

  const textDetails = details.map(([label, value]) => `${label}: ${value}`).join("\n");
  const paymentText = copy.showPayment
    ? `\n\nPayment reminder\n${data.paymentAmountNote ?? "Please send your payment receipt to the studio through Facebook Messenger for manual verification."}${facebookUrl ? `\nFacebook: ${facebookUrl}` : ""}`
    : "";
  const text = `${copy.heading}\n\n${copy.intro}\n\n${textDetails}${paymentText}\n\n${copy.closing}\n\n${data.businessName}${data.address ? `\n${data.address}` : ""}`;

  return { subject: copy.subject, html, text };
}

export function bookingConfirmationTemplate(data: BookingEmailTemplateData): EmailTemplate {
  return render(data, {
    subject: `Booking confirmed - ${data.bookingCode}`,
    eyebrow: "Booking confirmed",
    heading: `Your nail appointment is reserved, ${data.clientName}.`,
    intro: "We look forward to welcoming you. Here are your confirmed appointment details.",
    closing:
      "Your appointment is already reserved. Payment remains pending until the studio manually verifies your receipt.",
    showPayment: true,
  });
}

export function newBookingAdminTemplate(data: BookingEmailTemplateData): EmailTemplate {
  const schedule = appointment(data);
  return render(data, {
    subject: `New booking - ${data.clientName} on ${schedule.date}`,
    eyebrow: "New studio booking",
    heading: "A new appointment has been confirmed.",
    intro:
      "The database booking is confirmed and the client has received their reservation details.",
    closing: "Review payment proof manually when the client sends it through Facebook Messenger.",
    admin: true,
  });
}

export function reminder24hTemplate(data: BookingEmailTemplateData): EmailTemplate {
  return render(data, {
    subject: `Reminder: your appointment is tomorrow - ${data.bookingCode}`,
    eyebrow: "24-hour reminder",
    heading: `We'll see you tomorrow, ${data.clientName}.`,
    intro: "This is a friendly reminder that your nail appointment is coming up in about 24 hours.",
    closing:
      "Please arrive on time so your technician can give your appointment the full scheduled care.",
  });
}

export function reminder2hTemplate(data: BookingEmailTemplateData): EmailTemplate {
  return render(data, {
    subject: `Reminder: your appointment is in about 2 hours - ${data.bookingCode}`,
    eyebrow: "2-hour reminder",
    heading: `Your appointment is almost here, ${data.clientName}.`,
    intro: "Your nail appointment starts in about two hours. We are getting ready to welcome you.",
    closing: "Please allow enough travel time and arrive promptly for your scheduled start.",
  });
}

export function paymentVerifiedTemplate(data: BookingEmailTemplateData): EmailTemplate {
  return render(data, {
    subject: `Payment verified - ${data.bookingCode}`,
    eyebrow: "Payment verified",
    heading: "Your payment has been verified.",
    intro: `Thank you, ${data.clientName}. The studio has manually reviewed and verified your payment receipt.`,
    closing: "Your appointment remains confirmed. We look forward to seeing you.",
  });
}

export function cancelledByAdminTemplate(data: BookingEmailTemplateData): EmailTemplate {
  return render(data, {
    subject: `Appointment cancelled by the studio - ${data.bookingCode}`,
    eyebrow: "Appointment update",
    heading: "Your appointment has been cancelled by the studio.",
    intro: `We're sorry, ${data.clientName}. The studio has cancelled the appointment shown below.`,
    closing:
      "Please contact the studio directly if you need more information or would like to discuss another appointment.",
  });
}

export function rescheduledByAdminTemplate(data: BookingEmailTemplateData): EmailTemplate {
  return render(data, {
    subject: `Appointment rescheduled - ${data.bookingCode}`,
    eyebrow: "Appointment rescheduled",
    heading: "Your appointment has a new schedule.",
    intro: `Hi ${data.clientName}, the studio has rescheduled your appointment. The updated details are below.`,
    closing: "Please contact the studio directly if the updated schedule needs clarification.",
  });
}

export function renderBookingEmail(
  type: NotificationType,
  data: BookingEmailTemplateData,
): EmailTemplate {
  switch (type) {
    case "booking_confirmation":
      return bookingConfirmationTemplate(data);
    case "new_booking_admin":
      return newBookingAdminTemplate(data);
    case "reminder_24h":
      return reminder24hTemplate(data);
    case "reminder_2h":
      return reminder2hTemplate(data);
    case "payment_verified":
      return paymentVerifiedTemplate(data);
    case "cancelled_by_admin":
      return cancelledByAdminTemplate(data);
    case "rescheduled_by_admin":
      return rescheduledByAdminTemplate(data);
  }
}
