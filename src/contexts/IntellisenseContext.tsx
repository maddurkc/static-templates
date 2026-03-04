import { createContext, useContext, ReactNode } from "react";
import { GlobalApiConfig, DEFAULT_GLOBAL_API_CONFIG } from "@/types/global-api-config";

interface IntellisenseContextType {
  globalApiConfig: GlobalApiConfig;
  enabled: boolean;
}

const IntellisenseContext = createContext<IntellisenseContextType>({
  globalApiConfig: DEFAULT_GLOBAL_API_CONFIG,
  enabled: true,
});

export const IntellisenseProvider = ({ 
  globalApiConfig, 
  enabled = true,
  children 
}: { 
  globalApiConfig: GlobalApiConfig; 
  enabled?: boolean;
  children: ReactNode; 
}) => (
  <IntellisenseContext.Provider value={{ globalApiConfig, enabled }}>
    {children}
  </IntellisenseContext.Provider>
);

export const useIntellisenseContext = () => useContext(IntellisenseContext);
