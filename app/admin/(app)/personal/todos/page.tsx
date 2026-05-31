import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import TodosClient from "./TodosClient";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  await requireAdminSession();

  const todos = await prisma.adminTodo.findMany({
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
  });

  const serialized = todos.map((t) => ({
    id: t.id,
    text: t.text,
    tag: t.tag ?? null,
    completed: t.completed,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  return <TodosClient initialTodos={serialized} />;
}