import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { updatePageSEO, generateOrganizationStructuredData, SEOProps } from '@/lib/seo';

export function useSEO(seoProps: Partial<SEOProps>) {
  const location = useLocation();
  
  useEffect(() => {
    // Update SEO with current URL
    const currentUrl = `${window.location.origin}${location.pathname}`;
    updatePageSEO({ ...seoProps, url: currentUrl });
    
    // Always include organization structured data
    generateOrganizationStructuredData();
    
    // Cleanup function to remove specific structured data when component unmounts
    return () => {
      // Remove article or event specific structured data
      const articleScript = document.querySelector('script[data-structured-data="article"]');
      const eventScript = document.querySelector('script[data-structured-data="event"]');
      
      if (articleScript) articleScript.remove();
      if (eventScript) eventScript.remove();
    };
  }, [location.pathname, seoProps]);
}

export default useSEO;
