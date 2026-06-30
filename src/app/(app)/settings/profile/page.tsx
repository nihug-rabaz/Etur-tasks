import { redirect } from "next/navigation";
import { ProfileSettingsPanel } from "@/components/profile/profile-settings-panel";
import { AuthorizationService } from "@/services/authorization.service";
import { ProfileService } from "@/services/profile.service";

export default async function ProfileSettingsPage() {
  const authorizationService = new AuthorizationService();
  const sessionProfile = await authorizationService.ensureApproved();
  const profileService = new ProfileService();
  const profile = await profileService.getById(sessionProfile.id);
  if (!profile) {
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6">
      <div className="rounded-3xl border border-border-weak bg-gradient-to-l from-surface-1 via-surface-1 to-surface-2/80 p-6">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">הפרופיל שלי</h1>
        <p className="mt-2 text-sm text-text-secondary">עריכת שם תצוגה ותמונת פרופיל שיופיעו לשאר המשתמשים.</p>
      </div>
      <ProfileSettingsPanel
        initialProfile={{
          id: profile.id,
          name: profile.name,
          email: profile.email ?? null,
          avatar: profile.avatar,
          role: profile.role,
        }}
      />
    </section>
  );
}
