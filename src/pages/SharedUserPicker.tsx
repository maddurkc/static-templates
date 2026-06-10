import React, { useEffect, useRef, useState } from "react";
import { X, UserPlus, AlertCircle } from "lucide-react";
import {
  searchUsers,
  type DirectoryUser,
} from "@/lib/distributionListStorage";
import styles from "./DistributionLists.module.scss";

interface Props {
  selected: DirectoryUser[];
  onChange: (users: DirectoryUser[]) => void;
  placeholder?: string;
}

/**
 * Autocomplete picker for selecting org users to share a DL with.
 * Used only when DL visibility = SHARED.
 */
export const SharedUserPicker: React.FC<Props> = ({
  selected,
  onChange,
  placeholder = "Search users by name, email, ELID, LANID, or department...",
}) => {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const taken = new Set(selected.map((s) => s.id));
      const rows = (await searchUsers(input, 8)).filter((u) => !taken.has(u.id));
      setResults(rows);
      setLoading(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, selected]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const add = (u: DirectoryUser) => {
    onChange([...selected, u]);
    setInput("");
    setResults([]);
    setOpen(false);
  };

  const remove = (id: string) => onChange(selected.filter((u) => u.id !== id));

  return (
    <div className={styles.shareWrap} ref={wrapRef}>
      <div className={styles.shareInputRow}>
        <UserPlus size={14} className={styles.shareInputIcon} />
        <input
          className={styles.shareInput}
          value={input}
          placeholder={placeholder}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => input && setOpen(true)}
        />
      </div>

      {open && (loading || results.length > 0) && (
        <div className={styles.shareDropdown}>
          {loading ? (
            <div className={styles.shareDropdownEmpty}>Searching...</div>
          ) : (
            results.map((u) => (
              <div
                key={u.id}
                className={styles.shareDropdownItem}
                onClick={() => add(u)}
              >
                <div className={styles.shareAvatar}>
                  {u.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className={styles.shareInfo}>
                  <span className={styles.shareName}>
                    {u.name}
                    {u.lanid ? <span className={styles.shareBadge}>{u.lanid}</span> : null}
                  </span>
                  <span className={styles.shareSub}>
                    {u.email}
                    {u.elid ? ` · ELID ${u.elid}` : ""}
                    {u.department ? ` · ${u.department}` : ""}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className={styles.shareChips}>
          {selected.map((u) => (
            <span key={u.id} className={styles.shareChip}>
              {u.name}
              <button onClick={() => remove(u.id)} aria-label={`Remove ${u.name}`}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {selected.length === 0 && (
        <div className={styles.shareInlineError}>
          <AlertCircle size={14} />
          <span>Select at least one user — only they will see this list in Run Templates.</span>
        </div>
      )}
    </div>
  );
};
