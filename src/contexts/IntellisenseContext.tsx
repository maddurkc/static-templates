import { createContext, useContext, ReactNode } from "react";
import { GlobalApiConfig, DEFAULT_GLOBAL_API_CONFIG } from "@/types/global-api-config";

interface IntellisenseContextType {
  globalApiConfig: GlobalApiConfig;
}

const IntellisenseContext = createContext<IntellisenseContextType>({
  globalApiConfig: DEFAULT_GLOBAL_API_CONFIG,
});

export const IntellisenseProvider = ({ 
  globalApiConfig, 
  children 
}: { 
  globalApiConfig: GlobalApiConfig; 
  children: ReactNode; 
}) => (
  <IntellisenseContext.Provider value={{ globalApiConfig }}>
    {children}
  </IntellisenseContext.Provider>
);

export const useIntellisenseContext = () => useContext(IntellisenseContext);
