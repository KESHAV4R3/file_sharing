export interface ParsedAgent {
  deviceType: string;
  os: string;
  browser: string;
  browserVersion: string;
}

export function parseUserAgent(ua: string): ParsedAgent {
  if (!ua) {
    return {
      deviceType: 'Unknown Device',
      os: 'Unknown OS',
      browser: 'Unknown Browser',
      browserVersion: '',
    };
  }

  // 1. Device Type
  let deviceType = 'Desktop / Laptop';
  if (/ipad|tablet/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'Mobile Phone';
  } else if (/macintosh|mac os x/i.test(ua)) {
    deviceType = 'MacBook / Mac';
  } else if (/windows/i.test(ua)) {
    deviceType = 'Windows PC / Laptop';
  } else if (/linux/i.test(ua)) {
    deviceType = 'Linux PC / Laptop';
  } else if (/cros/i.test(ua)) {
    deviceType = 'Chromebook';
  }

  // 2. OS
  let os = 'Unknown OS';
  if (/macintosh|mac os x/i.test(ua)) {
    const match = ua.match(/mac os x ([\d_]+)/i);
    const ver = match ? match[1].replace(/_/g, '.') : '';
    os = ver ? `macOS (${ver})` : 'macOS';
  } else if (/windows nt 10\.0/i.test(ua)) {
    os = 'Windows 10 / 11';
  } else if (/windows nt 6\.3/i.test(ua)) {
    os = 'Windows 8.1';
  } else if (/windows nt 6\.1/i.test(ua)) {
    os = 'Windows 7';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/android/i.test(ua)) {
    const match = ua.match(/android ([\d.]+)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/os ([\d_]+)/i);
    const ver = match ? match[1].replace(/_/g, '.') : '';
    os = ver ? `iOS ${ver}` : 'iOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  } else if (/cros/i.test(ua)) {
    os = 'ChromeOS';
  }

  // 3. Browser & Version
  let browser = 'Unknown Browser';
  let browserVersion = '';

  if (/edg\/([\d.]+)/i.test(ua)) {
    browser = 'Microsoft Edge';
    browserVersion = ua.match(/edg\/([\d.]+)/i)?.[1] || '';
  } else if (/brave/i.test(ua) || (typeof (navigator as any) !== 'undefined' && (navigator as any).brave)) {
    browser = 'Brave';
  } else if (/opr\/([\d.]+)|opera/i.test(ua)) {
    browser = 'Opera';
    browserVersion = ua.match(/opr\/([\d.]+)/i)?.[1] || '';
  } else if (/chrome\/([\d.]+)/i.test(ua)) {
    browser = 'Google Chrome';
    browserVersion = ua.match(/chrome\/([\d.]+)/i)?.[1] || '';
  } else if (/firefox\/([\d.]+)/i.test(ua)) {
    browser = 'Mozilla Firefox';
    browserVersion = ua.match(/firefox\/([\d.]+)/i)?.[1] || '';
  } else if (/version\/([\d.]+).*safari/i.test(ua)) {
    browser = 'Apple Safari';
    browserVersion = ua.match(/version\/([\d.]+)/i)?.[1] || '';
  } else if (/safari/i.test(ua)) {
    browser = 'Safari';
  }

  return {
    deviceType,
    os,
    browser,
    browserVersion,
  };
}

export interface GeolocationData {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  timezone?: string;
}

export async function resolveIpLocation(
  ip: string,
  headers: Headers,
  clientTimezone?: string
): Promise<GeolocationData> {
  // Check Vercel or proxy geo headers first
  const vercelCity = headers.get('x-vercel-ip-city');
  const vercelCountry = headers.get('x-vercel-ip-country');
  const vercelRegion = headers.get('x-vercel-ip-country-region');
  const vercelTimezone = headers.get('x-vercel-ip-timezone');

  if (vercelCity || vercelCountry) {
    return {
      city: vercelCity ? decodeURIComponent(vercelCity) : '',
      country: vercelCountry || '',
      countryCode: vercelCountry || '',
      region: vercelRegion || '',
      timezone: vercelTimezone || clientTimezone || '',
    };
  }

  // Check Cloudflare headers
  const cfCountry = headers.get('cf-ipcountry');
  if (cfCountry && cfCountry !== 'XX') {
    return {
      country: cfCountry,
      countryCode: cfCountry,
      timezone: clientTimezone || '',
    };
  }

  // Check if private / loopback IP
  const isPrivateIp =
    !ip ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip === 'localhost';

  if (isPrivateIp) {
    return {
      city: 'Localhost',
      country: clientTimezone ? clientTimezone.split('/')[0] : 'Local Network',
      timezone: clientTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      isp: 'Local Development Server',
    };
  }

  // Fallback to public IP geo API with a short timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,timezone,isp`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        return {
          city: data.city || '',
          region: data.regionName || '',
          country: data.country || '',
          countryCode: data.countryCode || '',
          timezone: data.timezone || clientTimezone || '',
          isp: data.isp || '',
        };
      }
    }
  } catch {
    // Ignore geo lookup network errors
  }

  return {
    timezone: clientTimezone || '',
  };
}
