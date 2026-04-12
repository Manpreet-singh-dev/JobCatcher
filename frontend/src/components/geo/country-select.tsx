"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { countries, searchCountries, type Country } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value?: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country...",
  className,
  disabled,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? countries.find((c) => c.code === value) : undefined;
  const filtered = query ? searchCountries(query) : countries;

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

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 text-sm text-left transition-colors",
          open ? "border-[#6C63FF] ring-1 ring-[#6C63FF]" : "hover:border-[#6C63FF]/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {selected ? (
          <span className="flex items-center gap-2 text-[#F0F0FF]">
            <span className="text-base">{selected.flag}</span>
            {selected.name}
          </span>
        ) : (
          <span className="text-[#55557A]">{placeholder}</span>
        )}
        <div className="flex items-center gap-1">
          {selected && (
            <span
              className="rounded p-0.5 hover:bg-[#2E2E4A]"
              onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }}
            >
              <X className="h-3.5 w-3.5 text-[#55557A]" />
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-[#55557A] transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] shadow-xl shadow-black/30">
          <div className="flex items-center border-b border-[#2E2E4A] px-3">
            <Search className="h-4 w-4 text-[#55557A]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries..."
              className="w-full bg-transparent px-3 py-2.5 text-sm text-[#F0F0FF] placeholder-[#55557A] outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-[#55557A]">No countries found</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); setQuery(""); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    value === c.code
                      ? "bg-[#6C63FF]/10 text-[#6C63FF]"
                      : "text-[#F0F0FF] hover:bg-[#252540]",
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="text-xs text-[#55557A]">{c.code}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
