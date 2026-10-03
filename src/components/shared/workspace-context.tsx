"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { AppShellContext } from "./app-shell";

const WorkspaceContext = createContext<AppShellContext | null>(null);

export function WorkspaceProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AppShellContext | null;
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
