import React, { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import styles from "./EmailAutocomplete.module.scss";

interface EmailAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Mock email data - simulates backend database
const MOCK_EMAILS = [
  { email: "john.doe@company.com", name: "John Doe" },
  { email: "jane.smith@company.com", name: "Jane Smith" },
  { email: "bob.wilson@company.com", name: "Bob Wilson" },
  { email: "alice.johnson@company.com", name: "Alice Johnson" },
  { email: "mike.brown@company.com", name: "Mike Brown" },
  { email: "sarah.davis@company.com", name: "Sarah Davis" },
  { email: "tom.miller@company.com", name: "Tom Miller" },
  { email: "emma.taylor@company.com", name: "Emma Taylor" },
  { email: "chris.anderson@company.com", name: "Chris Anderson" },
  { email: "lisa.martinez@company.com", name: "Lisa Martinez" },
  { email: "david.garcia@external.org", name: "David Garcia" },
  { email: "laura.robinson@external.org", name: "Laura Robinson" },
  { email: "james.clark@partner.net", name: "James Clark" },
  { email: "jennifer.lewis@partner.net", name: "Jennifer Lewis" },
  { email: "robert.walker@client.io", name: "Robert Walker" },
];

// Simulated API call with delay
const searchEmails = async (query: string): Promise<typeof MOCK_EMAILS> => {
  // Simulate network delay (200-500ms)
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  return MOCK_EMAILS.filter(
    item =>
      item.email.toLowerCase().includes(lowerQuery) ||
      item.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 8); // Limit results
};

export const EmailAutocomplete: React.FC<EmailAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter email addresses",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<typeof MOCK_EMAILS>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Parse comma-separated emails into array
  const selectedEmails = value
    .split(",")
    .map(e => e.trim())
    .filter(e => e.length > 0);

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchEmails(query);
        // Filter out already selected emails
        const filtered = results.filter(
          r => !selectedEmails.includes(r.email)
        );
        setSuggestions(filtered);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Failed to search emails:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
  }, [selectedEmails]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    debouncedSearch(newValue);
  };

  // Select an email from suggestions
  const selectEmail = (email: string) => {
    const newEmails = [...selectedEmails, email];
    onChange(newEmails.join(", "));
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Remove a selected email
  const removeEmail = (emailToRemove: string) => {
    const newEmails = selectedEmails.filter(e => e !== emailToRemove);
    onChange(newEmails.join(", "));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        selectEmail(suggestions[selectedIndex].email);
      } else if (inputValue.includes("@") && inputValue.trim()) {
        // Allow manual entry of email
        selectEmail(inputValue.trim());
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSuggestions([]);
    } else if (e.key === "Backspace" && !inputValue && selectedEmails.length > 0) {
      // Remove last email when backspace on empty input
      removeEmail(selectedEmails[selectedEmails.length - 1]);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrapper}>
        {/* Selected email chips */}
        {selectedEmails.map((email, index) => (
          <span key={`${email}-${index}`} className={styles.emailChip}>
            {email}
            <button
              type="button"
              className={styles.removeChip}
              onClick={() => removeEmail(email)}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={selectedEmails.length === 0 ? placeholder : ""}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className={styles.suggestionsDropdown}>
          {isLoading ? (
            <div className={styles.loadingItem}>Searching...</div>
          ) : (
            suggestions.map((item, index) => (
              <div
                key={item.email}
                className={`${styles.suggestionItem} ${
                  index === selectedIndex ? styles.selected : ""
                }`}
                onClick={() => selectEmail(item.email)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className={styles.suggestionName}>{item.name}</span>
                <span className={styles.suggestionEmail}>{item.email}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
