import { DomainTabsSettingsPanel } from "@/components/admin/domain-tabs-settings-panel";
import { OneSignalTestPanel } from "@/components/admin/onesignal-test-panel";
import { AuthorizationService } from "@/services/authorization.service";

export default async function AdminSettingsPage() {
  await new AuthorizationService().ensureAdmin();

  return (
    <section className="space-y-5 pb-8">
      <div className="dashboard-glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-text-primary">הגדרות מערכת</h1>
        <p className="mt-1 text-sm text-text-secondary">
          התאמת אייקונים ותמונות לטאבים במסך הראשי, ובדיקת התראות דפדפן.
        </p>
      </div>
      <OneSignalTestPanel />
      <DomainTabsSettingsPanel />
    </section>
  );
}
