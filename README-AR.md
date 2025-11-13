
# Jeru3D Web – v3 (Next.js + MapLibre + MapTiler + WebXR/Three.js)

**חדש:** Mesh אמיתי ל‑AR – בניית רשת גבהים מ‑**Terrain‑RGB** ב‑WebWorker + טקסטורה מ‑Satellite (stitching לפי AOI), והנחה ב‑AR בעזרת **WebXR Hit‑Test**.

## איך זה עובד
- ה‑Worker (`public/workers/terrain-worker.js`) מוריד אריחי **Terrain‑RGB** עבור AOI ברמת זום שתגדיר, **מפענח RGB→גובה** (`elev = -10000 + (r*256*256+g*256+b)*0.1`) ויוצר **heightmap** מדולל (`step=2` לשמירת ביצועים).  
- במקביל, ה‑Worker תופר אריחי **Satellite** (אפשר להחליף ל‑Hybrid בהמשך) לתמונת טקסטורה אחת.  
- רכיב `three-ar.tsx` בונה **PlaneGeometry** עם חלוקות בהתאם לרוחב/גובה ה‑heightmap, משלב את הגבהים כ‑Y, ומלביש את הטקסטורה. קנה‑מידה מטרי מקורב לפי קווי רוחב/אורך.  
- **Tap‑to‑place**: לאחר הופעת ה‑Reticle (Hit‑Test), לחיצה תניח את המודל.

> **מקורות:** Terrain‑RGB ודרך חישוב RGB→גובה + זום מרבי ~Z14, והדגמת hillshade/terrain בצד JS; WebXR/Three.js (ARButton, hit‑test) ודוקו MDN/W3C.  
> MapTiler (Terrain‑RGB/Hillshade): [[1]](https://docs.maptiler.com/guides/map-tiling-hosting/data-hosting/rgb-terrain-by-maptiler/) [[2]](https://docs.maptiler.com/sdk-js/examples/dynamic-hillshade/)  
> MapLibre GL Style Spec – `hillshade`, `raster-dem`: [[3]](https://maplibre.org/maplibre-style-spec/layers/) [[4]](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-hillshade-layer/)  
> WebXR/Three.js AR: [[5]](https://threejs.org/manual/en/webxr-basics.html) [[6]](https://developers.google.com/ar/develop/webxr/hello-webxr) [[7]](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API) [[8]](https://www.w3.org/TR/webxr/)

## ריצה
```
npm i
cp .env.local.example .env.local  # הגדר NEXT_PUBLIC_MAPTILER_KEY
npm run dev
```
- מפה: `http://localhost:3000`  
- AR: `http://localhost:3000/ar` (**דורש HTTPS ומכשיר/דפדפן תומך WebXR**).

## הערות ביצועים
- שליטת רזולוציית ה‑mesh דרך `step` ב‑worker (ברירת‑מחדל 2).  
- מומלץ להתחיל Z של DEM ~12–13 ו‑Texture ~14, כדי לשמור על כמות אריחים סבירה.

## Deploy with Vercel
הכפתור ב‑README הראשי יוצר פרויקט חדש ומבקש `NEXT_PUBLIC_MAPTILER_KEY` אוטומטית.
