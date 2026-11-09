import {createCastleSpace} from './gallery-castle-space.mjs';

export function createModernGallery(scene,renderer,options={}){
 return createCastleSpace(scene,renderer,{...options,place:'lisbon',style:'azulejo'});
}
