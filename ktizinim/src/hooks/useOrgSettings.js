import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export function useOrgSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    base44.entities.OrgSettings.list().then(rows => {
      setSettings(rows[0] || null);
      setLoading(false);
    });
  };

  useEffect(load, []);

  return { settings, loading, reload: load };
}