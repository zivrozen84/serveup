"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type PulseCallback = (() => void) | null;

const noop = () => {};
const noopRegister = (_: PulseCallback) => {};

const UnsavedChangesContext = createContext<{
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  registerPulseCallback: (cb: PulseCallback) => void;
  triggerPulse: () => void;
}>({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: noop,
  registerPulseCallback: noopRegister,
  triggerPulse: noop,
});

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const pulseRef = useRef<PulseCallback>(null);
  const registerPulseCallback = useCallback((cb: PulseCallback) => {
    pulseRef.current = cb;
  }, []);
  const triggerPulse = useCallback(() => {
    pulseRef.current?.();
  }, []);
  return (
    <UnsavedChangesContext.Provider
      value={{ hasUnsavedChanges, setHasUnsavedChanges, registerPulseCallback, triggerPulse }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}
