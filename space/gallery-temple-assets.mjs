// Real photographic CC0 materials, hosted locally. Colour maps are sRGB;
// OpenGL normals and roughness maps are linear. Nothing fetches Poly Haven at runtime.
const path=name=>'/assets/temple/'+name;
const surface=name=>Object.freeze({color:path(name+'-color.webp'),normal:path(name+'-normal.webp'),roughness:path(name+'-roughness.webp')});
export const TEMPLE_ASSETS=Object.freeze({
 stone:surface('stone'),
 // Plain weathered grain avoids printing brick joints on fluted column shafts.
 column:surface('column'),
 floor:surface('floor'),
 sky:Object.freeze({day:path('day-sky.jpg'),night:path('night-sky.jpg'),environment:path('day-environment.hdr')}),
 license:path('LICENSE.txt')
});
export const TEMPLE_ASSET_SOURCES=Object.freeze({
 license:'CC0-1.0',licenseURL:'https://polyhaven.com/license',
 stone:'https://polyhaven.com/a/old_sandstone_02',
 column:'https://polyhaven.com/a/beige_wall_001',
 floor:'https://polyhaven.com/a/monastery_stone_floor',
 day:'https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky',
 night:'https://polyhaven.com/a/clarens_night_02',
 textureSize:1024,skySize:2048,hdrSize:1024
});
