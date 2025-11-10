import { SectionDefinition } from "@/types/section";

const STORAGE_KEY = 'custom_sections';

export const saveCustomSection = (section: SectionDefinition): void => {
  const customSections = getCustomSections();
  customSections.push(section);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customSections));
};

export const getCustomSections = (): SectionDefinition[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  return JSON.parse(stored);
};

export const deleteCustomSection = (type: string): void => {
  const customSections = getCustomSections();
  const filtered = customSections.filter(s => s.type !== type);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};
