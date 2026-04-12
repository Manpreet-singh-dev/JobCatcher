"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { currencies, searchCurrencies, getCurrencyByCode, type Currency } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface CurrencySelectProps {
  value?: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const POPULAR_CODES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY", "SGD", "AED", "CHF"];

export function CurrencySelect({
  value,
  onChange,
  placeholder = "Select currency...",
  className,
  disabled,
}: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? getCurrencyByCode(value) : undefined;

  const filtered = query
    ? searchCurrencies(query)
    : currencies;

  const popular = POPULAR_CODES
    .map((code) => currencies.find((c) => c.code === code)!)
    .filter(Boolean);

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

  function renderItem(c: Currency) {
    return (
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
        <span className="w-8 font-mono text-xs text-[#8888AA]">{c.symbol}</span>
        <span className="flex-1 text-left">{c.name}</span>
        <span className="text-xs text-[#55557A]">{c.code}</span>
      </button>
    );
  }

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
            <span className="font-mono text-xs text-[#8888AA]">{selected.symbol}</span>
            {selected.code} &mdash; {selected.name}
          </span>
        ) : (
          <span className="text-[#55557A]">{placeholder}</span>
        )}
        <ChevronDown className={cn("h-4 w-4 text-[#55557A] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] shadow-xl shadow-black/30">
          <div className="flex items-center border-b border-[#2E2E4A] px-3">
            <Search className="h-4 w-4 text-[#55557A]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search currencies..."
              className="w-full bg-transparent px-3 py-2.5 text-sm text-[#F0F0FF] placeholder-[#55557A] outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {query ? (
              filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-[#55557A]">No currencies found</div>
              ) : (
                filtered.map(renderItem)
              )
            ) : (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-[#55557A]">Popular</div>
                {popular.map(renderItem)}
                <div className="my-1 border-t border-[#2E2E4A]" />
                <div className="px-3 py-1.5 text-xs font-medium text-[#55557A]">All Currencies</div>
                {filtered.map(renderItem)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
