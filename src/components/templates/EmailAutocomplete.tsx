import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Users } from "lucide-react";
import styles from "./EmailAutocomplete.module.scss";

interface EmailAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface EmailContact {
  email: string;
  name: string;
  initials?: string;
}

// Mock email data - simulates backend database
const MOCK_EMAILS: EmailContact[] = [
  { email: "john.doe@company.com", name: "John Doe", initials: "JD" },
  { email: "jane.smith@company.com", name: "Jane Smith", initials: "JS" },
  { email: "bob.wilson@company.com", name: "Bob Wilson", initials: "BW" },
  { email: "alice.johnson@company.com", name: "Alice Johnson", initials: "AJ" },
  { email: "mike.brown@company.com", name: "Mike Brown", initials: "MB" },
  { email: "sarah.davis@company.com", name: "Sarah Davis", initials: "SD" },
  { email: "tom.miller@company.com", name: "Tom Miller", initials: "TM" },
  { email: "emma.taylor@company.com", name: "Emma Taylor", initials: "ET" },
  { email: "chris.anderson@company.com", name: "Chris Anderson", initials: "CA" },
  { email: "lisa.martinez@company.com", name: "Lisa Martinez", initials: "LM" },
  { email: "david.garcia@external.org", name: "David Garcia", initials: "DG" },
  { email: "laura.robinson@external.org", name: "Laura Robinson", initials: "LR" },
  { email: "james.clark@partner.net", name: "James Clark", initials: "JC" },
  { email: "jennifer.lewis@partner.net", name: "Jennifer Lewis", initials: "JL" },
  { email: "robert.walker@client.io", name: "Robert Walker", initials: "RW" },
];

// Simulated API call with delay
const searchEmails = async (query: string): Promise<EmailContact[]> => {
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

// Get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Get name from email for selected emails that might not be in the mock data
const getNameFromEmail = (email: string): string => {
  const contact = MOCK_EMAILS.find(c => c.email === email);
  if (contact) return contact.name;
  
  // Parse name from email if not found
  const localPart = email.split('@')[0];
  return localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const EmailAutocomplete: React.FC<EmailAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter a name or email address",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<EmailContact[]>([]);
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
    } else if (e.key === ";" || e.key === ",") {
      // Also accept semicolon or comma to add email
      e.preventDefault();
      if (inputValue.includes("@") && inputValue.trim()) {
        selectEmail(inputValue.trim());
      }
    }
  };

  // Handle paste - parse multiple emails from clipboard
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Check if pasted text contains email separators (comma, semicolon, newline, space)
    if (pastedText.includes(',') || pastedText.includes(';') || pastedText.includes('\n') || pastedText.includes(' ')) {
      e.preventDefault();
      
      // Split by common separators and clean up
      const emails = pastedText
        .split(/[,;\n\s]+/)
        .map(email => email.trim())
        .filter(email => email.includes('@') && email.length > 0);
      
      if (emails.length > 0) {
        // Filter out already selected emails
        const newEmails = emails.filter(email => !selectedEmails.includes(email));
        if (newEmails.length > 0) {
          const updatedEmails = [...selectedEmails, ...newEmails];
          onChange(updatedEmails.join(", "));
          setInputValue("");
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    } else if (pastedText.includes('@')) {
      // Single email pasted
      e.preventDefault();
      const email = pastedText.trim();
      if (!selectedEmails.includes(email)) {
        const updatedEmails = [...selectedEmails, email];
        onChange(updatedEmails.join(", "));
        setInputValue("");
        setSuggestions([]);
        setShowSuggestions(false);
      }
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

  // Focus input when clicking the container
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrapper} onClick={handleContainerClick}>
        {/* Selected email chips - Outlook style */}
        {selectedEmails.map((email, index) => {
          const name = getNameFromEmail(email);
          return (
            <div key={`${email}-${index}`} className={styles.emailChip}>
              <span className={styles.chipAvatar}>
                {getInitials(name)}
              </span>
              <span className={styles.chipName}>{name}</span>
              <button
                type="button"
                className={styles.removeChip}
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(email);
                }}
                aria-label={`Remove ${name}`}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={selectedEmails.length === 0 ? placeholder : ""}
        />
      </div>

      {/* Suggestions dropdown - Outlook style */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className={styles.suggestionsDropdown}>
          {isLoading ? (
            <div className={styles.loadingItem}>
              <div className={styles.loadingSpinner} />
              <span>Searching contacts...</span>
            </div>
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
                <div className={styles.suggestionAvatar}>
                  {item.initials || getInitials(item.name)}
                </div>
                <div className={styles.suggestionInfo}>
                  <span className={styles.suggestionName}>{item.name}</span>
                  <span className={styles.suggestionEmail}>{item.email}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
