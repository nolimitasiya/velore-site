"use client";

import React from "react";

type Col<T> = {
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = "Nothing to show.",
}: {
  columns: Col<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyText?: string;
}) {
  if (!rows.length) {
    return <div className="text-sm text-black/60">{emptyText}</div>;
  }

  return (
    <div className="overflow-auto rounded-2xl border">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-black/[0.03]">
          <tr className="border-b">
            {columns.map((c, i) => (
              <th key={i} className={`p-2 text-left font-medium ${c.className ?? ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={String(rowKey(r))}
              className="border-b last:border-b-0 odd:bg-black/[0.01]"
            >
              {columns.map((c, i) => (
                <td key={i} className={`p-2 align-top ${c.className ?? ""}`}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
