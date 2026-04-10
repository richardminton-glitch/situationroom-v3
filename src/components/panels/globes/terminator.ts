/**
 * Day/night terminator — calculates the anti-solar point
 * and returns a GeoJSON circle representing the night hemisphere.
 */

function getSolarPosition(): { lat: number; lon: number } {
  const now = new Date();
  const JD = now.getTime() / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525;

  // Mean longitude of the sun
  const L0 = (280.46646 + 36000.76983 * T) % 360;
  // Mean anomaly
  const M = (357.52911 + 35999.05029 * T) % 360;
  const toRad = (d: number) => (d * Math.PI) / 180;

  // Equation of center
  const C = (1.9146 - 0.004817 * T) * Math.sin(toRad(M))
    + 0.019993 * Math.sin(toRad(2 * M))
    + 0.00029 * Math.sin(toRad(3 * M));

  // Sun's ecliptic longitude
  const sunLon = L0 + C;

  // Obliquity of ecliptic
  const eps = 23.439 - 0.00000036 * (JD - 2451545.0);

  // Right ascension and declination
  const ra = Math.atan2(
    Math.cos(toRad(eps)) * Math.sin(toRad(sunLon)),
    Math.cos(toRad(sunLon))
  );
  const dec = Math.asin(Math.sin(toRad(eps)) * Math.sin(toRad(sunLon)));

  // Greenwich Sidereal Time
  const GMST = (280.46061837 + 360.98564736629 * (JD - 2451545.0)) % 360;

  // Sub-solar point
  const lon = ((((ra * 180) / Math.PI) - GMST + 540) % 360) - 180;
  const lat = (dec * 180) / Math.PI;

  return { lat, lon };
}

/** Anti-solar point — center of the night hemisphere */
export function getAntiSolarPoint(): [number, number] {
  const solar = getSolarPosition();
  return [((solar.lon + 360) % 360) - 180, -solar.lat];
}
