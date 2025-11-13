
export function metersPerDegree(latDeg: number){
  const lat = latDeg * Math.PI/180;
  const mPerDegLat = 111132.92 - 559.82 * Math.cos(2*lat) + 1.175 * Math.cos(4*lat) - 0.0023 * Math.cos(6*lat);
  const mPerDegLon = 111412.84 * Math.cos(lat) - 93.5 * Math.cos(3*lat) + 0.118 * Math.cos(5*lat);
  return { mPerDegLat, mPerDegLon };
}
