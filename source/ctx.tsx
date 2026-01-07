// ctx.tsx
import { createContext, useContext, useState } from "react";
import React from "react";

const Ctx = createContext({ currentPage: "welcome", setCurrentPage: (_: string) => {} });
export const useString = () => useContext(Ctx);

export const StringProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentPage, setCurrentPage] = useState("welcome");
  return <Ctx.Provider value={{ currentPage, setCurrentPage }}>{children}</Ctx.Provider>;
};
