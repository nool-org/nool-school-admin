'use client';

import { useEffect, useState } from 'react';

/** A search box for the server-paged lists: the server searches every page
 * (not just the rows on screen), asked 300 ms after typing stops. */
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(value);
  // the URL changed under us (back button, a cleared filter): show it
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return undefined;
    const timer = setTimeout(() => onChange(draft), 300);
    return () => clearTimeout(timer);
  }, [draft, value, onChange]);
  return (
    <input
      type="search"
      className="field list-search"
      placeholder={placeholder}
      aria-label={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
    />
  );
}
