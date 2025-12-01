"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Detects if the user is on a mobile device and redirects them to the mobile gate page.
 * This component should be placed in layouts that require desktop access.
 * 
 * Detection strategy:
 * - Primary: Check for mobile user agent strings (phones, tablets)
 * - This ensures desktop users who resize their window are NOT redirected
 * - Only actual mobile devices get redirected
 */
export function MobileRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Don't redirect if already on mobile-gate page
    if (pathname === "/mobile-gate") {
      setIsChecking(false);
      return;
    }

    const checkMobile = () => {
      // Check for mobile user agent
      const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || "";
      
      // Common mobile user agent patterns - covers iOS, Android, and other mobile platforms
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileDevice = mobileRegex.test(userAgent.toLowerCase());

      if (isMobileDevice) {
        router.replace("/mobile-gate");
      } else {
        setIsChecking(false);
      }
    };

    // Small delay to ensure accurate detection
    const timer = setTimeout(checkMobile, 100);
    
    return () => clearTimeout(timer);
  }, [router, pathname]);

  // Show nothing while checking - the redirect happens fast
  if (isChecking) {
    return null;
  }

  return null;
}

