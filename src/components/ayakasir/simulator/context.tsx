"use client";

import { createContext, useContext, useReducer } from "react";
import type { SimulatorState, SimAction } from "./types";
import type { SimCopy } from "./i18n";
import { simulatorReducer, initialState } from "./reducer";

interface SimulatorContextValue {
  state: SimulatorState;
  dispatch: React.Dispatch<SimAction>;
  copy: SimCopy;
  locale: string;
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export function SimulatorProvider({
  children,
  copy,
  locale,
}: {
  children: React.ReactNode;
  copy: SimCopy;
  locale: string;
}) {
  const [state, dispatch] = useReducer(simulatorReducer, initialState);

  return (
    <SimulatorContext.Provider value={{ state, dispatch, copy, locale }}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error("useSimulator must be used within SimulatorProvider");
  return ctx;
}
