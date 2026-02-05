import React, { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import styles from "./UserAutocomplete.module.scss";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  department?: string;
}

interface UserAutocompleteProps {
  value: User[];
  onChange: (users: User[]) => void;
  placeholder?: string;
  apiEndpoint?: string;
}

// Get initials from name
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Simulated API call - replace with actual fetch to your backend
const searchUsersApi = async (
  query: string,
  endpoint: string
): Promise<User[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));

  // Mock user data - in production, this would be fetched from the backend
  const mockUsers: User[] = [
    { id: "1", email: "john.doe@company.com", name: "John Doe", department: "Engineering" },
    { id: "2", email: "jane.smith@company.com", name: "Jane Smith", department: "Design" },
    { id: "3", email: "bob.wilson@company.com", name: "Bob Wilson", department: "Marketing" },
    { id: "4", email: "alice.johnson@company.com", name: "Alice Johnson", department: "Sales" },
    { id: "5", email: "mike.brown@company.com", name: "Mike Brown", department: "Engineering" },
    { id: "6", email: "sarah.davis@company.com", name: "Sarah Davis", department: "HR" },
    { id: "7", email: "tom.miller@company.com", name: "Tom Miller", department: "Finance" },
    { id: "8", email: "emma.taylor@company.com", name: "Emma Taylor", department: "Engineering" },
    { id: "9", email: "chris.anderson@company.com", name: "Chris Anderson", department: "Product" },
    { id: "10", email: "lisa.martinez@company.com", name: "Lisa Martinez", department: "Legal" },
  ];

  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  return mockUsers
    .filter(
      (user) =>
        user.email.toLowerCase().includes(lowerQuery) ||
        user.name.toLowerCase().includes(lowerQuery) ||
        user.department?.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 8);
};

export const UserAutocomplete: React.FC<UserAutocompleteProps> = ({
  value = [],
  onChange,
  placeholder = "Search users...",
  apiEndpoint = "/api/users/search",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced API search
  const searchUsers = useCallback(
    async (query: string) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!query.trim()) {
        setSuggestions([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      try {
        // In production, use actual fetch:
        // const response = await fetch(`${apiEndpoint}?q=${encodeURIComponent(query)}`, {
        //   signal: abortControllerRef.current.signal,
        // });
        // if (!response.ok) throw new Error('Failed to fetch users');
        // const data = await response.json();

        // Using mock API for demo
        const results = await searchUsersApi(query, apiEndpoint);

        // Filter out already selected users
        const selectedIds = new Set(value.map((u) => u.id));
        const filtered = results.filter((user) => !selectedIds.has(user.id));

        setSuggestions(filtered);
        setSelectedIndex(-1);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Request was cancelled
        }
        console.error("Failed to search users:", err);
        setError("Failed to search users");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiEndpoint, value]
  );

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchUsers(newValue);
    }, 300);
  };

  // Select a user
  const selectUser = (user: User) => {
    onChange([...value, user]);
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Remove a selected user
  const removeUser = (userId: string) => {
    onChange(value.filter((u) => u.id !== userId));
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        selectUser(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSuggestions([]);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeUser(value[value.length - 1].id);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrapper} onClick={handleContainerClick}>
        {/* Selected user chips */}
        {value.map((user) => (
          <div key={user.id} className={styles.userChip}>
            <span className={styles.chipEmail}>{user.email}</span>
            <button
              type="button"
              className={styles.removeChip}
              onClick={(e) => {
                e.stopPropagation();
                removeUser(user.id);
              }}
              aria-label={`Remove ${user.name}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={value.length === 0 ? placeholder : ""}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading || error) && (
        <div className={styles.suggestionsDropdown}>
          {isLoading ? (
            <div className={styles.loadingItem}>
              <div className={styles.loadingSpinner} />
              <span>Searching users...</span>
            </div>
          ) : error ? (
            <div className={styles.errorItem}>{error}</div>
          ) : (
            suggestions.map((user, index) => (
              <div
                key={user.id}
                className={`${styles.suggestionItem} ${
                  index === selectedIndex ? styles.selected : ""
                }`}
                onClick={() => selectUser(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className={styles.suggestionAvatar}>
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>
                <div className={styles.suggestionInfo}>
                  <span className={styles.suggestionName}>{user.name}</span>
                  <span className={styles.suggestionEmail}>
                    {user.email}
                    {user.department && ` • ${user.department}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
