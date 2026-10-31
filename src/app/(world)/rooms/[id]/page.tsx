"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useWorld } from "@/store/world";
import { useT } from "@/lib/i18n/use";
import { RoomEditor } from "@/components/room/RoomEditor";
import { Empty } from "@/components/ui/bits";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const room = useWorld((s) => s.rooms.find((r) => r.id === id));
  const { t } = useT();
  if (!room) {
    return (
      <div className="card">
        <Empty emoji="🚪" text={t("errors.notFound")} action={<Link href="/rooms" className="btn btn-primary">{t("nav.rooms")}</Link>} />
      </div>
    );
  }
  return <RoomEditor key={room.id} initial={room} startInPreview={params.get("view") === "1"} />;
}

export default function RoomPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
