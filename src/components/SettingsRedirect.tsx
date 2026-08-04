import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import ExternalRedirect from './ExternalRedirect';

interface SettingsRedirectProps {
  settingKey: 'shop_url' | 'membership_url';
  fallbackUrl: string;
}

const SettingsRedirect = ({ settingKey, fallbackUrl }: SettingsRedirectProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data, error } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-tan/10">
        <div className="w-16 h-16 border-4 border-brown/20 border-t-brown rounded-full animate-spin mb-4"></div>
        <p className="text-lg text-gray-700">Redirecting to external site...</p>
      </div>
    );
  }

  return <ExternalRedirect url={data?.[settingKey] || fallbackUrl} />;
};

export default SettingsRedirect;
