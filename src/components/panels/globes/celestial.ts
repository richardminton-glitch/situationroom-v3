/**
 * Celestial calculations — moon position, phase, ISS orbit path.
 * Ported from V2 app.js.
 */

/** Sub-lunar point — where the moon is directly overhead */
export function getMoonPosition(): { lat: number; lon: number } {
  const now = new Date();
  const JD = now.getTime() / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525;

  // Mean longitude, anomaly, distance
  const L = (218.3165 + 481267.8813 * T) % 360;
  const M = (134.9634 + 477198.8676 * T) % 360;
  const F = (93.272 + 483202.0175 * T) % 360;

  const toRad = (d: number) => (d * Math.PI) / 180;

  // Ecliptic longitude & latitude (simplified)
  const eclLon = L + 6.289 * Math.sin(toRad(M));
  const eclLat = 5.128 * Math.sin(toRad(F));

  // Obliquity of ecliptic
  const eps = 23.439 - 0.00000036 * (JD - 2451545.0);

  // Equatorial coordinates
  const sinEcl = Math.sin(toRad(eclLon));
  const cosEcl = Math.cos(toRad(eclLon));
  const sinLat = Math.sin(toRad(eclLat));
  const cosLat = Math.cos(toRad(eclLat));
  const sinEps = Math.sin(toRad(eps));
  const cosEps = Math.cos(toRad(eps));

  const ra = Math.atan2(sinEcl * cosEps - (sinLat / cosLat) * sinEps, cosEcl);
  const dec = Math.asin(sinLat * cosEps + cosLat * sinEps * sinEcl);

  // Greenwich Sidereal Time
  const GMST = (280.46061837 + 360.98564736629 * (JD - 2451545.0)) % 360;
  const lon = (((ra * 180) / Math.PI - GMST + 540) % 360) - 180;
  const lat = (dec * 180) / Math.PI;

  return { lat, lon };
}

/** Moon phase: -1 (new) to +1 (full), phase name, illumination % */
export function getMoonPhase(): { phase: number; name: string; illumination: number } {
  const synodicMonth = 29.53059;
  const knownNew = new Date('2024-01-11T11:57:00Z').getTime();
  const daysSince = (Date.now() - knownNew) / 86400000;
  const cyclePos = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const phase = -Math.cos((2 * Math.PI * cyclePos) / synodicMonth);

  const names = [
    'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
  ];
  const idx = Math.floor((cyclePos / synodicMonth) * 8) % 8;
  const illumination = Math.round((1 - Math.abs(phase)) * 100);

  return { phase, name: names[idx], illumination };
}

/** ISS orbital path — 51.6° inclination, ~180 points */
export function computeISSOrbit(currentLat: number, currentLon: number): [number, number][] {
  const incl = 51.6 * (Math.PI / 180);
  const toDeg = (r: number) => (r * 180) / Math.PI;

  // Argument of latitude (u0) from current position
  const latRad = (currentLat * Math.PI) / 180;
  const u0 = Math.asin(Math.sin(latRad) / Math.sin(incl));

  // Ascending node longitude
  const omega = ((currentLon * Math.PI) / 180) - Math.atan2(Math.sin(u0) * Math.cos(incl), Math.cos(u0));

  const points: [number, number][] = [];
  for (let i = 0; i < 180; i++) {
    const u = u0 + (i * 2 * Math.PI) / 180;
    const lat = toDeg(Math.asin(Math.sin(incl) * Math.sin(u)));
    let lon = toDeg(omega + Math.atan2(Math.sin(u) * Math.cos(incl), Math.cos(u)));
    // Normalize to [-180, 180]
    lon = ((lon + 540) % 360) - 180;
    points.push([lon, lat]);
  }

  return points;
}
