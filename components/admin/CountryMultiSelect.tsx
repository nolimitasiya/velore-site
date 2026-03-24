"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  COUNTRY_OPTIONS,
  type CountryOption,
  countryNameFromIso2,
  filterCountryOptions,
  normalizeCountryCode,
} from "@/lib/geo/countries";

type CountryMultiSelectProps = {
  value: string[];
  onChange: (codes: string[]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  options?: CountryOption[];
};

export default function CountryMultiSelect({
  value,
  onChange,
  label,
  placeholder = "Search and add countries...",
  disabled = false,
  options = COUNTRY_OPTIONS,
}: CountryMultiSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedValue = useMemo(
    () =>
      Array.from(
        new Set(
          value
            .map((code) => normalizeCountryCode(code))
            .filter((code): code is string => Boolean(code))
        )
      ).sort(),
    [value]
  );

  const selectedSet = useMemo(() => new Set(normalizedValue), [normalizedValue]);

  const filtered = useMemo(() => {
    return filterCountryOptions(options, query).filter(
      (option) => !selectedSet.has(option.code)
    );
  }, [options, query, selectedSet]);

  function addCountry(code: string) {
    const next = Array.from(new Set([...normalizedValue, code])).sort();
    onChange(next);
    setQuery("");
  }

  function removeCountry(code: string) {
    onChange(normalizedValue.filter((item) => item !== code));
  }

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

      <div className="rounded-xl border border-black/10 bg-white p-3">
        {normalizedValue.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {normalizedValue.map((code) => (
              <button
                key={code}
                type="button"
                disabled={disabled}
                onClick={() => removeCountry(code)}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                <span>
                  {countryNameFromIso2(code)} ({code})
                </span>
                <span className="text-xs">×</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-3 text-sm text-black/45">No countries selected.</div>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className="mb-2 flex w-full items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm disabled:opacity-50"
        >
          <span className="text-black/60">Choose countries</span>
          <span className="text-xs text-black/40">{open ? "▲" : "▼"}</span>
        </button>

        {open && !disabled && (
          <div className="rounded-lg border border-black/10 bg-white p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />

            <div className="max-h-64 overflow-auto rounded-lg border border-black/5">
              {filtered.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => addCountry(option.code)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/5"
                >
                  <span>{option.label}</span>
                  <span className="text-xs text-black/40">{option.code}</span>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="px-3 py-3 text-sm text-black/50">
                  No matching countries found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}