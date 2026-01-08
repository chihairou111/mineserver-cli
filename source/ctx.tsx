// ctx.tsx
import { createContext, useContext, useState } from "react";
import React from "react";

interface ContextType {
  currentPage: string;
  setCurrentPage: (_: string) => void;
  lastPage: string;
  setLastPage: (_: string) => void;
}

const Ctx = createContext<ContextType>({
  currentPage: "welcome",
  setCurrentPage: (_: string) => {},
  lastPage: "welcome",
  setLastPage: (_: string) => {},
});

export const useString = () => useContext(Ctx);

export const StringProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentPage, setCurrentPage] = useState("welcome");
  const [lastPage, setLastPage] = useState("welcome");
  return (
    <Ctx.Provider value={{ currentPage, setCurrentPage, lastPage, setLastPage }}>
      {children}
    </Ctx.Provider>
  );
};
