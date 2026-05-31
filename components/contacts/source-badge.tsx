"use client";

import { Badge } from "@/components/ui/badge";
import type { Contact } from "@/db/schema";

interface SourceBadgeProps {
  source: Contact["source"];
  className?: string;
}

export function SourceBadge({ source, className = "" }: SourceBadgeProps) {
  if (source === "hubspot") {
    return (
      <Badge variant="hubspot" className={className}>
        HubSpot
      </Badge>
    );
  }

  return (
    <Badge variant="contactship" className={className}>
      ContactShip
    </Badge>
  );
}
