import type { Metadata } from "next";
import Image from "next/image";
import { Save, Upload } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActionNotice } from "@/components/dashboard/action-notice";
import { SubmitButton } from "@/components/dashboard/form-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBusinessSettings, uploadMariBankQr } from "./actions";

export const metadata: Metadata = { title: "Business settings" };

type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function BusinessSettingsPage({ searchParams }: PageProps) {
  await requireRole("owner");
  const params = await searchParams;
  const supabase = await createClient();
  const { data: settings, error } = await supabase
    .from("business_settings")
    .select("*")
    .limit(1)
    .single();
  if (error || !settings) throw new Error("Business settings could not be loaded.");

  const qrUrl = settings.maribank_qr_path
    ? supabase.storage.from("business-assets").getPublicUrl(settings.maribank_qr_path).data
        .publicUrl
    : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Studio setup"
        title="Business settings"
        description="Configure booking limits, client-facing payment instructions, business details, and the MariBank QR."
      />
      <ActionNotice success={params.success} error={params.error} />

      <form action={updateBusinessSettings} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={settings.id} />
        <input type="hidden" name="timezone" value="Asia/Manila" />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="business-name">Business name</Label>
              <Input
                id="business-name"
                name="business_name"
                defaultValue={settings.business_name}
                required
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" value="Asia/Manila" disabled />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="address">Studio address</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={settings.address ?? ""}
                maxLength={500}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="facebook-url">Facebook page URL</Label>
              <Input
                id="facebook-url"
                name="facebook_url"
                type="url"
                defaultValue={settings.facebook_url ?? ""}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notification-email">Notification email</Label>
              <Input
                id="notification-email"
                name="notification_email"
                type="email"
                defaultValue={settings.notification_email ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking rules</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="minimum-notice">Minimum notice (minutes)</Label>
              <Input
                id="minimum-notice"
                name="minimum_notice_minutes"
                type="number"
                min={0}
                max={10080}
                defaultValue={settings.minimum_notice_minutes}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="booking-window">Booking window (weeks)</Label>
              <Input
                id="booking-window"
                name="booking_window_weeks"
                type="number"
                min={1}
                max={52}
                defaultValue={settings.booking_window_weeks}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="slot-interval">Slot interval (minutes)</Label>
              <Input
                id="slot-interval"
                name="slot_interval_minutes"
                type="number"
                min={5}
                max={240}
                step={5}
                defaultValue={settings.slot_interval_minutes}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="default-buffer">Default buffer (minutes)</Label>
              <Input
                id="default-buffer"
                name="default_buffer_minutes"
                type="number"
                min={0}
                max={240}
                step={5}
                defaultValue={settings.default_buffer_minutes}
                required
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="cancellation-policy">No-cancellation policy</Label>
              <Textarea
                id="cancellation-policy"
                name="cancellation_policy"
                defaultValue={settings.cancellation_policy ?? ""}
                maxLength={2000}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manual payment instructions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="maribank-name">MariBank account name</Label>
              <Input
                id="maribank-name"
                name="maribank_account_name"
                defaultValue={settings.maribank_account_name ?? ""}
                maxLength={150}
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="payment-note">Payment amount note</Label>
              <Textarea
                id="payment-note"
                name="payment_amount_note"
                defaultValue={settings.payment_amount_note ?? ""}
                maxLength={500}
              />
            </div>
          </CardContent>
        </Card>

        <div>
          <SubmitButton pendingLabel="Saving settings...">
            <Save /> Save business settings
          </SubmitButton>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">MariBank QR</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr] md:items-start">
          <div className="rounded-xl border border-border bg-white p-6">
            {qrUrl ? (
              <Image
                src={qrUrl}
                alt="Current MariBank payment QR"
                width={640}
                height={640}
                unoptimized
                className="h-auto w-full object-contain"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-center text-sm text-muted-foreground">
                No QR uploaded yet
              </div>
            )}
          </div>
          <div>
            <p className="text-sm leading-6 text-muted-foreground">
              Upload the original QR image. It is displayed on a white background with its
              proportions unchanged—never cropped, stretched, recolored, or covered.
            </p>
            <form action={uploadMariBankQr} className="mt-5 flex flex-col gap-4">
              <input type="hidden" name="settings_id" value={settings.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="qr-image">QR image</Label>
                <Input
                  id="qr-image"
                  name="image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                />
                <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP; up to 5 MB.</p>
              </div>
              <div>
                <SubmitButton pendingLabel="Uploading...">
                  <Upload /> Upload QR
                </SubmitButton>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
