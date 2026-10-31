import {createCastleSpace} from './gallery-castle-space.mjs';

export function createNewYorkGallery(scene,renderer,options={}){
 return createCastleSpace(scene,renderer,{...options,place:'new-york'});
}
