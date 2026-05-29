export const optimizeCloudinaryUrl = (url: string, width = 800): string => {
    if (!url.includes("cloudinary.com")) return url;
  
    const insertPoint = "/upload/";
    const transformation = `q_auto,f_auto,w_${width}/`;
  
    // 確保只有插入一次 transformation
    if (url.includes(transformation)) return url;
  
    return url.replace(insertPoint, `${insertPoint}${transformation}`);
  };