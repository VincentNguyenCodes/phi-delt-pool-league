import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Player } from "../lib/data";

interface Props {
  label: string;
  players: Player[];
  value: Player | null;
  excluded: number[];
  onChange: (player: Player | null) => void;
  onCreate?: (name: string) => Promise<Player>;
}

export default function PlayerCombobox({ label, players, value, excluded, onChange, onCreate }: Props) {
  const [text, setText] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (value) setText(value.name);
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const query = text.trim().toLowerCase();
  const matches = useMemo(() => {
    const pool = players.filter((p) => !excluded.includes(p.id));
    if (!query) return pool.slice(0, 6);
    const starts = pool.filter((p) => p.name.toLowerCase().startsWith(query));
    const words = pool.filter(
      (p) => !p.name.toLowerCase().startsWith(query) && p.name.toLowerCase().includes(query),
    );
    return [...starts, ...words].slice(0, 6);
  }, [players, excluded, query]);

  const exact = players.some((p) => p.name.toLowerCase() === query);
  const canCreate = Boolean(onCreate) && query.length > 0 && !exact;
  const optionCount = matches.length + (canCreate ? 1 : 0);

  const choose = (player: Player) => {
    onChange(player);
    setText(player.name);
    setOpen(false);
  };

  const create = async () => {
    setBusy(true);
    try {
      if (onCreate) choose(await onCreate(text));
    } finally {
      setBusy(false);
    }
  };

  const pickActive = () => {
    if (active < matches.length) choose(matches[active]);
    else if (canCreate) create();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, optionCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && optionCount > 0) {
      e.preventDefault();
      pickActive();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="combo" ref={boxRef}>
      <label className="combo-label">{label}</label>
      <input
        className={value ? "combo-input chosen" : "combo-input"}
        value={text}
        placeholder="Start typing a name"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        autoCapitalize="words"
        disabled={busy}
        onChange={(e) => {
          setText(e.target.value);
          if (value) onChange(null);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {open && optionCount > 0 && (
        <ul className="combo-list" id={listId} role="listbox">
          {matches.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? "combo-option active" : "combo-option"}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
            >
              {p.name}
            </li>
          ))}
          {canCreate && (
            <li
              role="option"
              aria-selected={active === matches.length}
              className={active === matches.length ? "combo-option add active" : "combo-option add"}
              onMouseEnter={() => setActive(matches.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                create();
              }}
            >
              Add "{text.trim()}" as a new player
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
