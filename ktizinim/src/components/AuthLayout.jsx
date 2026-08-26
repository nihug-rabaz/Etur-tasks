import React from "react";
import { useOrgSettings } from "@/hooks/useOrgSettings";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  const { settings } = useOrgSettings();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="לוגו" className="inline-flex w-14 h-14 object-contain rounded-2xl mb-4" />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}