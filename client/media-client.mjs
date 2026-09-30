import { upload } from '@vercel/blob/client';
window.uploadRootBlob=async(pathname,file,mediaId)=>upload(pathname,file,{access:'private',handleUploadUrl:'/api/media/token',clientPayload:JSON.stringify({mediaId}),multipart:file.size>8*1024*1024});
