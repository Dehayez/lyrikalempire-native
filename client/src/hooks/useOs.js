import { useEffect, useState } from 'react';

export const useOs = () => {
  const [os, setOs] = useState({
    isMac: false,
    isWindows: false,
    isLinux: false,
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    isEdge: false
  });

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // OS detection
    const isMac = /macintosh|mac os x/i.test(userAgent);
    const isWindows = /win32|win64|windows|wince/i.test(userAgent);
    const isLinux = /linux/i.test(userAgent) && !/android/i.test(userAgent);
    const isIOS = /ipad|iphone|ipod/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);
    const isMobile = /mobi|android|iphone|ipod|ipad|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Browser detection
    const isSafari = userAgent.indexOf('safari') !== -1 && userAgent.indexOf('chrome') === -1;
    const isChrome = userAgent.indexOf('chrome') !== -1 && userAgent.indexOf('edge') === -1;
    const isFirefox = userAgent.indexOf('firefox') !== -1;
    const isEdge = userAgent.indexOf('edge') !== -1 || userAgent.indexOf('edg') !== -1;
    
    setOs({
      isMac,
      isWindows,
      isLinux,
      isMobile,
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isFirefox,
      isEdge
    });
  }, []);

  return os;
};

export default useOs; 