import React, { useState } from "react";
import { Skeleton } from "antd";
import { optimizeCloudinaryUrl } from "../utils/optimizeCloudinaryUrl";

interface LazyImageProps {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
  skeletonStyle?: React.CSSProperties;
  optimized?: boolean;
  width?: number | string;
  height?: number | string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  showSkeleton?: boolean; // 新增控制是否顯示骨架屏
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = "",
  optimized = true,
  style,
  className,
  skeletonStyle,
  width = "100%",
  height = "auto",
  loading = "lazy",
  fetchPriority = "auto",
  showSkeleton = true,
}) => {
  const [loaded, setLoaded] = useState(false);
  const imageUrl = optimized ? optimizeCloudinaryUrl(src, 600) : src;

  return (
    <div style={{ position: "relative", width, height, ...style }} className={className}>
      {!loaded && showSkeleton && (
        <Skeleton.Image
          active
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            ...skeletonStyle,
          }}
        />
      )}
      <img
        src={imageUrl}
        alt={alt}
        onLoad={() => setLoaded(true)}
        loading={loading}
        fetchPriority={fetchPriority}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: loaded ? 1 : (showSkeleton ? 0 : 1),
          transition: showSkeleton ? "opacity 0.3s ease-in-out" : "none",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
};

export default LazyImage;