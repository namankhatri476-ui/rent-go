import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  logoUrl: string | null;
}

const defaults: PlatformSettings = {
  platformName: "RentPR",
  supportEmail: "support@rentpr.in",
  maintenanceMode: false,
  logoUrl: null,
};

export const usePlatformSettings = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-settings-general"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "general")
        .maybeSingle();
      if (error) throw error;
      if (!data) return defaults;
      const val = data.value as Record<string, any>;
      return {
        platformName: val.platformName || defaults.platformName,
        supportEmail: val.supportEmail || defaults.supportEmail,
        maintenanceMode: val.maintenanceMode || false,
        logoUrl: val.logoUrl || null,
      } as PlatformSettings;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { settings: data || defaults, isLoading };
};
