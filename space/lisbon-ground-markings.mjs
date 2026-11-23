export function createLisbonCrosswalkPaint(){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=300;
 const ink=canvas.getContext('2d');
 ink.fillStyle='#eeeee9';
 for(let y=43;y<=235;y+=62)ink.fillRect(27,y,246,31);
 return canvas;
}
