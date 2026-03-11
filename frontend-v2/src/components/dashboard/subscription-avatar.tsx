"use client";

import { getBrandColor } from "@/lib/brand-colors";
import { getBrandIcon } from "@/lib/brand-icons";
import { CATEGORY_HEX } from "@/lib/category-colors";
import type { SubscriptionCategory } from "@/lib/types";

export function SubscriptionAvatar({
  name,
  category,
  size = "md",
}: {
  name: string;
  category: SubscriptionCategory;
  size?: "xs" | "sm" | "md";
}) {
  const brandColor = getBrandColor(name);
  const brandIcon = getBrandIcon(name);
  const bgColor = brandColor ?? CATEGORY_HEX[category];
  const initial = name[0]?.toUpperCase() ?? "?";
  const iconColor = brandIcon?.hex === "000000" ? "currentColor" : `#${brandIcon?.hex}`;
  const dimensions =
    size === "xs"
      ? "h-7 w-7 rounded-lg"
      : size === "sm"
        ? "h-8 w-8 rounded-xl"
        : "h-10 w-10 rounded-2xl";
  const glyphSize = size === "xs" ? "size-3.5" : size === "sm" ? "size-4" : "size-5";

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${dimensions} text-[11px] font-bold text-white`}
      style={{
        backgroundColor: brandIcon ? `${bgColor}1A` : bgColor,
        color: brandIcon ? iconColor : "#FFFFFF",
      }}
      aria-hidden="true"
    >
      {brandIcon ? (
        <svg
          viewBox="0 0 24 24"
          className={glyphSize}
          fill="currentColor"
          role="img"
          aria-label={`${brandIcon.title} logo`}
        >
          <path d={brandIcon.path} />
        </svg>
      ) : (
        initial
      )}
    </div>
  );
}
