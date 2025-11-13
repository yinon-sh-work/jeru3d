// public/workers/terrain-worker.js
// Receives: { apiKey, aoi: {minLon, minLat, maxLon, maxLat}, zDem, zTex, step }
// Returns: { width, height, gridStep, heights (Float32Array), textureBitmap }

self.onmessage = async (e) => {
  const { apiKey, aoi, zDem=12, zTex=14, step=2 } = e.data;
  try {
    const dem = await buildHeightmap(apiKey, aoi, zDem, step);
    const tex = await buildTexture(apiKey, aoi, zTex, dem.pixelW, dem.pixelH);
    const bmp = await createImageBitmap(tex.canvas);
    self.postMessage({ width: dem.width, height: dem.height, gridStep: dem.gridStep, heights: dem.heights, textureBitmap: bmp }, [dem.heights.buffer, bmp]);
  } catch (err) {
    self.postMessage({ error: err?.message || String(err) });
  }
}

function lngLatToTile(lon, lat, z){
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
  const s = Math.sin(lat * Math.PI/180);
  const y = Math.floor((1 - Math.log((1+s)/(1-s)) / Math.PI) / 2 * Math.pow(2, z));
  return {x,y}
}
function tileBounds(x,y,z){
  const n = Math.pow(2,z);
  const lon1 = x / n * 360 - 180;
  const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2*y/n))) * 180/Math.PI;
  const lon2 = (x+1)/n*360 - 180;
  const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2*(y+1)/n))) * 180/Math.PI;
  return {minLon:lon1, minLat:lat2, maxLon:lon2, maxLat:lat1};
}

async function buildHeightmap(apiKey, aoi, z, step){
  // Compute tile range
  const tmin = lngLatToTile(aoi.minLon, aoi.maxLat, z);
  const tmax = lngLatToTile(aoi.maxLon, aoi.minLat, z);
  const tiles = [];
  for(let ty=tmin.y; ty<=tmax.y; ty++){
    for(let tx=tmin.x; tx<=tmax.x; tx++) tiles.push({tx,ty});
  }
  const tileSize = 256;
  const mosaicW = (tmax.x - tmin.x + 1) * tileSize;
  const mosaicH = (tmax.y - tmin.y + 1) * tileSize;

  // Draw DEM mosaic to offscreen canvas
  const canvas = new OffscreenCanvas(mosaicW, mosaicH);
  const ctx = canvas.getContext('2d');
  const fetches = tiles.map(async ({tx,ty}) => {
    const url = `https://api.maptiler.com/tiles/terrain-rgb/${z}/${tx}/${ty}.png?key=${apiKey}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('DEM tile fetch failed');
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const dx = (tx - tmin.x) * tileSize;
    const dy = (ty - tmin.y) * tileSize;
    ctx.drawImage(bmp, dx, dy);
  });
  await Promise.all(fetches);

  // Read pixels & decode Terrain-RGB
  const img = ctx.getImageData(0,0,mosaicW, mosaicH);
  // Downsample by 'step' to reduce mesh resolution
  const w = Math.floor(mosaicW / step);
  const h = Math.floor(mosaicH / step);
  const heights = new Float32Array(w*h);
  for(let y=0, yi=0; y<h; y++){
    const sy = y*step;
    for(let x=0; x<w; x++, yi++){
      const sx = x*step;
      const i = (sy*mosaicW + sx)*4;
      const r = img.data[i], g = img.data[i+1], b = img.data[i+2];
      const elev = -10000 + ((r*256*256 + g*256 + b) * 0.1); // Terrain‑RGB formula
      heights[yi] = elev;
    }
  }
  return { width:w, height:h, gridStep: step, heights, pixelW: mosaicW, pixelH: mosaicH, canvas };
}

async function buildTexture(apiKey, aoi, z, mosaicW, mosaicH){
  const tmin = lngLatToTile(aoi.minLon, aoi.maxLat, z);
  const tmax = lngLatToTile(aoi.maxLon, aoi.minLat, z);
  const tileSize = 256;
  const canvas = new OffscreenCanvas((tmax.x - tmin.x + 1)*tileSize, (tmax.y - tmin.y + 1)*tileSize);
  const ctx = canvas.getContext('2d');
  const tiles = [];
  for(let ty=tmin.y; ty<=tmax.y; ty++){
    for(let tx=tmin.x; tx<=tmax.x; tx++) tiles.push({tx,ty});
  }
  // Satellite imagery tiles
  const fetches = tiles.map(async ({tx,ty}) => {
    const url = `https://api.maptiler.com/tiles/satellite-v2/${z}/${tx}/${ty}.jpg?key=${apiKey}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Texture tile fetch failed');
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const dx = (tx - tmin.x) * tileSize;
    const dy = (ty - tmin.y) * tileSize;
    ctx.drawImage(bmp, dx, dy);
  });
  await Promise.all(fetches);
  return { canvas };
}
