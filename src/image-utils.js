// Beta 0.9.2: a phone photo is 3-10 MB; a Bingo cell shows it a few dozen pixels wide. Shrink it before it is uploaded (long side 1280px, JPEG),
// and fall back to the original file if the browser cannot decode it (the upload still works, just bigger).
export async function shrinkImage(file,maxSide=1280,quality=0.82){
  try{
    const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
    return blob&&blob.size?blob:file;
  }catch{return file}
}
