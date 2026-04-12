"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, MapPin, Plus } from "lucide-react";
import { getCitiesByCountry, searchCities, formatCityDisplay, type City } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface CitySelectProps {
  countryCode?: string | string[];
  value: string[];
  onChange: (cities: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  max?: number;
}

export function CitySelect({
  countryCode,
  value,
  onChange,
  placeholder = "Select cities...",
  className,
  disabled,
  allowCustom = true,
  max = 10,
}: CitySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasCountry = Array.isArray(countryCode)
    ? countryCode.length > 0
    : !!countryCode;

  const availableCities = useMemo(() => {
    if (query) return searchCities(query, countryCode);
    if (hasCountry) return getCitiesByCountry(countryCode!);
    return [];
  }, [countryCode, query, hasCountry]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function toggleCity(cityName: string) {
    if (value.includes(cityName)) {
      onChange(value.filter((c) => c !== cityName));
    } else if (value.length < max) {
      onChange([...value, cityName]);
    }
  }

  function addCustom() {
    const trimmed = query.trim();
    if (trimmed && !value.includes(trimmed) && value.length < max) {
      onChange([...value, trimmed]);
      setQuery("");
    }
  }

  const showCustom =
    allowCustom &&
    query.trim().length > 0 &&
    !value.includes(query.trim()) &&
    !availableCities.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-3 py-2 text-sm text-left transition-colors",
          open ? "border-[#6C63FF] ring-1 ring-[#6C63FF]" : "hover:border-[#6C63FF]/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {value.length === 0 && (
          <span className="text-[#55557A] px-1">{placeholder}</span>
        )}
        {value.map((city) => (
          <span
            key={city}
            className="flex items-center gap-1 rounded-lg bg-[#6C63FF]/10 px-2.5 py-1 text-xs text-[#6C63FF]"
          >
            <MapPin className="h-3 w-3" />
            {city}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((c) => c !== city));
              }}
              className="ml-0.5 rounded-full hover:bg-[#6C63FF]/20"
            >
              <span className="text-[10px]">&times;</span>
            </button>
          </span>
        ))}
        <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-[#55557A] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] shadow-xl shadow-black/30">
          <div className="flex items-center border-b border-[#2E2E4A] px-3">
            <Search className="h-4 w-4 text-[#55557A]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && showCustom) { e.preventDefault(); addCustom(); } }}
              placeholder={hasCountry ? "Search cities..." : "Select a country first, or type city name..."}
              className="w-full bg-transparent px-3 py-2.5 text-sm text-[#F0F0FF] placeholder-[#55557A] outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {showCustom && (
              <button
                type="button"
                onClick={addCustom}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#00D4AA] hover:bg-[#252540]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add &quot;{query.trim()}&quot;
              </button>
            )}
            {availableCities.length === 0 && !showCustom ? (
              <div className="px-3 py-4 text-center text-sm text-[#55557A]">
                {hasCountry ? "No cities found. Type to add custom." : "Select a country first"}
              </div>
            ) : (
              availableCities.map((city) => (
                <button
                  key={`${city.country}-${city.name}`}
                  type="button"
                  onClick={() => toggleCity(city.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    value.includes(city.name)
                      ? "bg-[#6C63FF]/10 text-[#6C63FF]"
                      : "text-[#F0F0FF] hover:bg-[#252540]",
                  )}
                >
                  <MapPin className="h-3.5 w-3.5 text-[#55557A]" />
                  <span className="flex-1 text-left">{formatCityDisplay(city)}</span>
                  {value.includes(city.name) && (
                    <span className="text-xs text-[#6C63FF]">&#10003;</span>
                  )}
                </button>
              ))
            )}
          </div>
          {value.length >= max && (
            <div className="border-t border-[#2E2E4A] px-3 py-2 text-center text-xs text-[#55557A]">
              Maximum {max} cities selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
