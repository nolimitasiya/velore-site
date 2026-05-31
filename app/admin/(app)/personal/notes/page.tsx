import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import NotesClient from "./NotesClient";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  await requireAdminSession();

  const notes = await prisma.adminNote.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const serialized = notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));

  return <NotesClient initialNotes={serialized} />;
}