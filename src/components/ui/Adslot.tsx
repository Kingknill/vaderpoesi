import React from "react";

interface AdSlotProps {
  adContent?: string; // Allow custom HTML or script for ads (e.g., Google AdSense)
  imageSrc?: string; // Optional image URL for static ads
  altText?: string; // Alt text for image ads
  width?: string; // Custom width (e.g., "300px")
  height?: string; // Custom height (e.g., "250px")
}

const AdSlot: React.FC<AdSlotProps> = ({
  adContent,
  imageSrc,
  altText = "Advertisement",
  width = "300px",
  height = "250px",
}) => {
  return (
    <div
      className="ad-slot"
      style={{ width, height }}
    >
      {adContent ? (
        <div dangerouslySetInnerHTML={{ __html: adContent }} />
      ) : imageSrc ? (
        <img src={imageSrc} alt={altText} style={{ maxWidth: "100%", maxHeight: "100%" }} />
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          Placeholder for advertisement. Add ad content or image URL.
        </p>
      )}
    </div>
  );
};

export default AdSlot;