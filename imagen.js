// Optimiza imágenes en el navegador antes de subirlas a Supabase Storage.
const OK=['image/jpeg','image/png','image/webp','image/gif']
export const fmt=b=>b<1048576?Math.max(1,Math.round(b/1024))+' KB':(b/1048576).toFixed(1)+' MB'
const toBlob=(c,type,q)=>new Promise(r=>c.toBlob(r,type,q))
export async function optimizeImage(file,{maxSide=1600,quality=0.85,smallBytes=300*1024}={}){
 if(!file||!OK.includes(file.type))throw new Error('Formato no compatible. Usá una imagen JPG, PNG o WebP.')
 const same={file,before:file.size,after:file.size,changed:false}
 if(file.type==='image/gif')return same // se sube tal cual para no romper la animación
 let bmp
 try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'})}
 catch{try{bmp=await createImageBitmap(file)}catch{throw new Error('No se pudo leer la imagen. Probá con otra (JPG o PNG).')}}
 const w=bmp.width,h=bmp.height,scale=Math.min(1,maxSide/Math.max(w,h))
 if(scale===1&&file.size<=smallBytes){bmp.close?.();return same} // ya es chica: no se toca
 const c=document.createElement('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale)
 const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bmp,0,0,c.width,c.height);bmp.close?.()
 let blob=await toBlob(c,'image/webp',quality),ext='webp'
 if(!blob||blob.type!=='image/webp'){ // navegador sin WebP: JPEG solo para fotos (el PNG puede tener transparencia)
  if(file.type==='image/jpeg'){blob=await toBlob(c,'image/jpeg',quality);ext='jpg'}else return same}
 if(!blob)throw new Error('No se pudo optimizar la imagen.')
 if(scale===1&&blob.size>=file.size)return same // si no mejora, se conserva la original
 const name=file.name.replace(/\.[^.]+$/,'')+'.'+ext
 return{file:new File([blob],name,{type:blob.type}),before:file.size,after:blob.size,changed:true}}
