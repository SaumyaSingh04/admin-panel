"use client";

import { useParams } from "next/navigation";
import { ResourcePage } from "@/components/resource-page";
import { Empty, PageHeader } from "@/components/ui";
import { RESOURCES } from "@/lib/resources";

export default function ManageResourcePage() {
  const { resource } = useParams<{ resource: string }>();
  const cfg = RESOURCES[resource];
  if (!cfg) return <><PageHeader title="Not found" /><Empty>Unknown section “{resource}”.</Empty></>;
  // Keyed so switching sections resets filters and pagination.
  return <ResourcePage key={resource} {...cfg} />;
}
