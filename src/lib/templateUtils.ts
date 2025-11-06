import { Section } from "@/types/section";

export const renderSectionContent = (section: Section): string => {
  let content = section.content;
  
  if (!section.variables) {
    return content;
  }

  // Replace all variables in the content
  Object.entries(section.variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    
    if (Array.isArray(value)) {
      // For list variables, generate <li> tags
      const listItems = value.map(item => `<li>${item}</li>`).join('');
      content = content.replace(placeholder, listItems);
    } else {
      // For text/url variables, replace directly
      content = content.replace(new RegExp(placeholder, 'g'), value as string);
    }
  });

  return content;
};
