import React, { useState, useRef, useEffect, useCallback } from "react";
import { Users } from "lucide-react";

import styles from "./UserAutocomplete.module.scss";
import {
  searchRecipients,
  type RecipientSuggestion,
} from "@/lib/distributionListStorage";

export type DelegateType = "extended" | "exclusive";

/**
 * Unified recipient object. Backwards-compatible with the previous
 * "regular user" shape (id/email/name) — DL entries set `kind = 'DL'`
 * and carry `dlMembers` / `memberCount` for expansion at send time.
 */
export interface User {
  id: string;
  email: string;            // empty string for DL refs
  name: string;
  avatar?: string;
  department?: string;
  delegateType?: DelegateType;

  // Smart Distribution List fields
  kind?: "USER" | "DL";
  memberCount?: number;
  dlMembers?: string[];     // resolved member emails (cached for send/preview)

  /**
   * IDs of Distribution Lists that contributed this user to the recipient bucket.
   * Empty/undefined means the user was added manually. Used to safely remove
   * DL-sourced emails when a DL chip is removed without affecting manual picks.
   */
  sourceDLIds?: string[];
}

interface UserAutocompleteProps {
  value: User[];
  onChange: (users: User[]) => void;
  placeholder?: string;
  apiEndpoint?: string;
}

const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export const UserAutocomplete: React.FC<UserAutocompleteProps> = ({
  value = [],
  onChange,
  placeholder = "Search users or distribution lists (e.g. DSPCH-)...",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<RecipientSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSuggestions([]);
        setIsLoading(false);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const results = await searchRecipients(query, 10);
        const taken = new Set(value.map((u) => (u.kind === "DL" ? `dl:${u.id}` : `u:${u.email}`)));
        const filtered = results.filter((r) =>
          r.type === "DL" ? !taken.has(`dl:${r.id}`) : !taken.has(`u:${r.email}`),
        );
        setSuggestions(filtered);
        setSelectedIndex(-1);
      } catch (err) {
        console.error("Search failed", err);
        setError("Failed to search recipients");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [value],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 300);
  };

  const selectSuggestion = (s: RecipientSuggestion) => {
    if (s.type === "DL") {
      // Fetch the DL members synchronously from storage to cache for send
      // (in production this would be an HTTP GET /api/distribution-lists/{id})
      import("@/lib/distributionListStorage").then(({ getDistributionList }) => {
        const dl = getDistributionList(s.id);
        const user: User = {
          id: s.id,
          email: "",
          name: s.displayName,
          kind: "DL",
          memberCount: s.memberCount,
          dlMembers: dl ? [...dl.toMembers, ...dl.ccMembers, ...dl.bccMembers].map((m) => m.email) : [],
        };
        onChange([...value, user]);
      });
    } else {
      const user: User = {
        id: s.id,
        email: s.email ?? "",
        name: s.displayName,
        kind: "USER",
      };
      onChange([...value, user]);
    }
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const addManualEmail = (raw: string) => {
    const email = raw.trim();
    if (!email.includes("@")) return;
    if (value.some((u) => u.kind !== "DL" && u.email === email)) return;
    const name = email
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    onChange([
      ...value,
      { id: `manual-${Date.now()}`, email, name, kind: "USER" },
    ]);
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((p) => (p < suggestions.length - 1 ? p + 1 : p));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((p) => (p > 0 ? p - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        selectSuggestion(suggestions[selectedIndex]);
      } else if (inputValue.includes("@")) {
        addManualEmail(inputValue);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSuggestions([]);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeAt(value.length - 1);
    } else if (e.key === ";" || e.key === ",") {
      e.preventDefault();
      if (inputValue.includes("@")) addManualEmail(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData.getData("text");
    if (/[,;\n\s]/.test(txt)) {
      e.preventDefault();
      const emails = txt
        .split(/[,;\n\s]+/)
        .map((x) => x.trim())
        .filter((x) => x.includes("@"));
      const existing = new Set(value.filter((u) => u.kind !== "DL").map((u) => u.email));
      const fresh = emails
        .filter((em) => !existing.has(em))
        .map((email) => {
          const name = email
            .split("@")[0]
            .replace(/[._-]/g, " ")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          return {
            id: `manual-${Date.now()}-${Math.random()}`,
            email,
            name,
            kind: "USER" as const,
          };
        });
      if (fresh.length > 0) onChange([...value, ...fresh]);
      setInputValue("");
    } else if (txt.includes("@")) {
      e.preventDefault();
      addManualEmail(txt);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrapper} onClick={() => inputRef.current?.focus()}>
        {value.map((u, i) =>
          u.kind === "DL" ? (
            <span key={`${u.id}-${i}`} className={styles.dlChip} title={(u.dlMembers ?? []).join(", ")}>
              <Users size={11} className={styles.dlChipIcon} />
              <span className={styles.dlChipName}>{u.name}</span>
              {typeof u.memberCount === "number" && (
                <span className={styles.dlChipCount}>({u.memberCount})</span>
              )}
              <button
                type="button"
                className={styles.removeChip}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                aria-label={`Remove ${u.name}`}
              >
                ×
              </button>
            </span>
          ) : (
            <span key={`${u.id}-${i}`} className={styles.userPill}>
              {u.email}
              <button
                type="button"
                className={styles.removeChip}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                aria-label={`Remove ${u.email}`}
              >
                ×
              </button>
            </span>
          ),
        )}

        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={value.length === 0 ? placeholder : ""}
        />
      </div>

      {showSuggestions && (suggestions.length > 0 || isLoading || error) && (
        <div className={styles.suggestionsDropdown}>
          {isLoading ? (
            <div className={styles.loadingItem}>
              <div className={styles.loadingSpinner} />
              <span>Searching...</span>
            </div>
          ) : error ? (
            <div className={styles.errorItem}>{error}</div>
          ) : (
            suggestions.map((s, index) => (
              <div
                key={`${s.type}-${s.id}`}
                className={`${styles.suggestionItem} ${index === selectedIndex ? styles.selected : ""}`}
                onClick={() => selectSuggestion(s)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {s.type === "DL" ? (
                  <div className={`${styles.suggestionAvatar} ${styles.dlAvatar}`}>
                    <Users size={14} />
                  </div>
                ) : (
                  <div className={styles.suggestionAvatar}>{getInitials(s.displayName)}</div>
                )}
                <div className={styles.suggestionInfo}>
                  <span className={styles.suggestionName}>
                    {s.displayName}
                    {s.type === "DL" && <span className={styles.dlBadge}>DL</span>}
                  </span>
                  <span className={styles.suggestionEmail}>{s.subtitle}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
