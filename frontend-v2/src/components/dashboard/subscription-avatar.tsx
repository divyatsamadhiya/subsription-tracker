"use client";

import { getBrandColor } from "@/lib/brand-colors";
import { getBrandIcon } from "@/lib/brand-icons";
import type { SubscriptionCategory } from "@/lib/types";

const CATEGORY_HEX: Record<SubscriptionCategory, string> = {
  entertainment: "#7C3AED",
  productivity: "#10B981",
  utilities: "#F59E0B",
  health: "#EC4899",
  other: "#3B82F6",
};

export function SubscriptionAvatar({
  name,
  category,
  size = "md",
}: {
  name: string;
  category: SubscriptionCategory;
  size?: "sm" | "md";
}) {
  const brandColor = getBrandColor(name);
  const brandIcon = getBrandIcon(name);
  const bgColor = brandColor ?? CATEGORY_HEX[category];
  const initial = name[0]?.toUpperCase() ?? "?";
  const iconColor = brandIcon?.hex === "000000" ? "currentColor" : `#${brandIcon?.hex}`;
  const dimensions = size === "sm" ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-2xl";
  const glyphSize = size === "sm" ? "size-4" : "size-5";

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${dimensions} text-[11px] font-bold text-white`}
      style={{
        backgroundColor: brandIcon ? `${bgColor}1A` : bgColor,
        color: brandIcon ? iconColor : "#FFFFFF",
      }}
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
