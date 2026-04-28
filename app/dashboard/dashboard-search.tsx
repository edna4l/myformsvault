"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { DashboardSearchGroup, DashboardSearchItem } from "@/lib/dashboard-search";

type DashboardSearchProps = {
  items: DashboardSearchItem[];
};

const groups: DashboardSearchGroup[] = ["Templates", "Vault", "Answer History"];

function Highlight({ text, query }: { query: string; text: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());

  if (!query || index < 0) {
    return text;
  }

  return (
    <>
      {text.slice(0, index)}
      <strong>{text.slice(index, index + query.length)}</strong>
      {text.slice(index + query.length)}
    </>
  );
}

export function DashboardSearch({ items }: DashboardSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const results = useMemo(() => {
    const normalizedQuery = debouncedQuery.toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return items
      .filter((item) => item.searchText.toLowerCase().includes(normalizedQuery))
      .slice(0, 18);
  }, [debouncedQuery, items]);

  return (
    <div className="dashboard-search" onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}>
      <label className="dashboard-search-label" htmlFor="dashboard-global-search">
        Search templates and vault
      </label>
      <input
        id="dashboard-global-search"
        type="search"
        value={query}
        placeholder="Search templates, fields, answers..."
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && debouncedQuery ? (
        <div className="dashboard-search-results">
          {results.length === 0 ? (
            <div className="dashboard-search-empty">No matching templates or vault details.</div>
          ) : (
            groups.map((group) => {
              const groupResults = results.filter((item) => item.group === group);

              if (groupResults.length === 0) {
                return null;
              }

              return (
                <section key={group} className="dashboard-search-group">
                  <span>{group}</span>
                  {groupResults.map((item) => (
                    <Link key={item.id} href={item.href} className="dashboard-search-result">
                      <strong>
                        <Highlight text={item.label} query={debouncedQuery} />
                      </strong>
                      <small>
                        <Highlight text={item.subtitle} query={debouncedQuery} />
                      </small>
                    </Link>
                  ))}
                </section>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
