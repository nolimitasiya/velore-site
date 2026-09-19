"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type NotificationActionsProps = {
  notificationId: string;
  isUnread: boolean;
  primaryHref?: string | null;
  primaryLabel?: string | null;
  productHref?: string | null;
};

export function NotificationActions({
  notificationId,
  isUnread,
  primaryHref,
  primaryLabel,
  productHref,
}: NotificationActionsProps) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  async function markRead() {
    const response = await fetch(
      `/api/admin/notifications/${notificationId}/read`,
      {
        method: "PATCH",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ??
          "Unable to mark notification as read."
      );
    }
  }

  async function handleMarkRead() {
    if (!isUnread || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await markRead();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark notification as read."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleNavigate(href: string) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (isUnread) {
        await markRead();
      }

      router.push(href);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open notification."
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {primaryHref && primaryLabel && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              handleNavigate(primaryHref)
            }
            className="rounded-lg border border-[#7B2D3E] px-3 py-1.5 text-xs font-medium text-[#7B2D3E] transition hover:bg-[#7B2D3E] hover:text-white disabled:cursor-wait disabled:opacity-50"
          >
            {primaryLabel}
          </button>
        )}

        {productHref && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              handleNavigate(productHref)
            }
            className="text-xs font-medium text-[#a89280] transition hover:text-[#7B2D3E] disabled:cursor-wait disabled:opacity-50"
          >
            View product
          </button>
        )}

        {isUnread && (
          <button
            type="button"
            disabled={busy}
            onClick={handleMarkRead}
            className="text-xs font-medium text-[#a89280] transition hover:text-[#7B2D3E] disabled:cursor-wait disabled:opacity-50"
          >
            {busy ? "Working…" : "Mark read"}
          </button>
        )}

        <span className="text-[11px] uppercase tracking-[0.14em] text-[#b9a99d]">
          {isUnread ? "Unread" : "Read"}
        </span>
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

type MarkAllReadButtonProps = {
  unreadCount: number;
};

export function MarkAllReadButton({
  unreadCount,
}: MarkAllReadButtonProps) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  async function handleMarkAllRead() {
    if (busy || unreadCount === 0) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/notifications/read-all",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ??
            "Unable to mark all notifications as read."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark all notifications as read."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={busy || unreadCount === 0}
        onClick={handleMarkAllRead}
        className="rounded-lg border border-[#e8ddd4] bg-white px-3 py-2 text-xs font-medium text-[#806f62] transition hover:border-[#7B2D3E] hover:text-[#7B2D3E] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Marking…" : "Mark all as read"}
      </button>

      {error && (
        <div className="text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}