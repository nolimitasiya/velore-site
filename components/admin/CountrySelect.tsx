"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  COUNTRY_OPTIONS,
  type CountryOption,
  countryNameFromIso2,
  filterCountryOptions,
} from "@/lib/geo/countries";

type CountrySelectProps = {
  value: string | null;
  onChange: (code: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  options?: CountryOption[];
};

export default function CountrySelect({
  value,
  onChange,
  label,
  placeholder = "Search countries...",
  disabled = false,
  options = COUNTRY_OPTIONS,
}: CountrySelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = value ? countryNameFromIso2(value) : "";

  const filtered = useMemo(() => {
    return filterCountryOptions(options, query).slice(0, 50);
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-1">
      {label ? <span className="text-sm font-medium">{label}</span> : null}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white px-3 py-2 text-sm disabled:opacity-50"
        >
          <span className={value ? "text-black" : "text-black/40"}>
            {value ? `${selectedLabel} (${value})` : "Select country"}
          </span>
          <span className="text-xs text-black/40">{open ? "▲" : "▼"}</span>
        </button>

        {open && !disabled && (
          <div className="absolute z-30 mt-2 w-full rounded-xl border border-black/10 bg-white p-2 shadow-lg">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />

            <div className="max-h-64 overflow-auto rounded-lg border border-black/5">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/5"
              >
                <span>Clear selection</span>
              </button>

              {filtered.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    onChange(option.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/5"
                >
                  <span>{option.label}</span>
                  <span className="text-xs text-black/40">{option.code}</span>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="px-3 py-3 text-sm text-black/50">
                  No countries found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}