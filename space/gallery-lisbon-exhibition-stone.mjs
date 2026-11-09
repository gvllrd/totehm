import {createHeritageMasonry} from './gallery-heritage-masonry.mjs';

// The restored glass pavilion keeps a low, sheltered reading corner and a
// stone exhibition backing. These are interior fittings, not castle towers.
export const LISBON_EXHIBITION_STONE=Object.freeze([
 {id:'lisbon-artwork-backing',minX:-9.55,maxX:1.8,minZ:-17.02,maxZ:-16.77,minY:-.09,maxY:5.5},
 {id:'lisbon-reading-west',minX:-12.95,maxX:-12.75,minZ:-16.98,maxZ:-12.65,minY:-.09,maxY:3.3},
 {id:'lisbon-reading-east',minX:-11.25,maxX:-11.05,minZ:-16.98,maxZ:-12.65,minY:-.09,maxY:3.3},
 {id:'lisbon-reading-back',minX:-12.95,maxX:-11.05,minZ:-16.98,maxZ:-16.78,minY:-.09,maxY:3.3}
].map(Object.freeze));

export function createLisbonExhibitionStone(parent,options={}){
 const stone=createHeritageMasonry(parent,{...options,walls:LISBON_EXHIBITION_STONE});
 stone.root.name='Lisbon — stone exhibition backing and sheltered reading alcove';
 for(const object of stone.solids)object.userData={...object.userData,exhibitionStone:true};
 return{...stone,obstacles:LISBON_EXHIBITION_STONE,
  diagnostics:()=>({...stone.diagnostics(),kind:'lisbon-interior-exhibition-stone',readingAlcove:true,castleTowers:false})
 };
}
