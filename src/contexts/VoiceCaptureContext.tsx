import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export type VoiceFieldSchema = {
  name: string;
  type?: "string" | "number" | "date" | "boolean";
  description?: string;
};

export type VoiceFormDescriptor = {
  formId: string;
  title: string;
  fields: VoiceFieldSchema[];
};

interface VoiceCaptureContextValue {
  activeForm: VoiceFormDescriptor | null;
  autoListen: boolean;
  setAutoListen: (v: boolean) => void;
  registerForm: (f: VoiceFormDescriptor) => () => void;
}

const VoiceCaptureContext = createContext<VoiceCaptureContextValue | null>(null);

const STORAGE_KEY = "prime.voice.auto-listen";

export function VoiceCaptureProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<VoiceFormDescriptor[]>([]);
  const [activeForm, setActiveForm] = useState<VoiceFormDescriptor | null>(null);
  const [autoListen, setAutoListenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "true";
  });

  const setAutoListen = useCallback((v: boolean) => {
    setAutoListenState(v);
    try { window.localStorage.setItem(STORAGE_KEY, String(v)); } catch {}
  }, []);

  const registerForm = useCallback((f: VoiceFormDescriptor) => {
    stackRef.current = [...stackRef.current, f];
    setActiveForm(stackRef.current[stackRef.current.length - 1]);
    return () => {
      stackRef.current = stackRef.current.filter((x) => x.formId !== f.formId);
      setActiveForm(stackRef.current[stackRef.current.length - 1] ?? null);
    };
  }, []);

  return (
    <VoiceCaptureContext.Provider value={{ activeForm, autoListen, setAutoListen, registerForm }}>
      {children}
    </VoiceCaptureContext.Provider>
  );
}

export function useVoiceCapture(): VoiceCaptureContextValue {
  const ctx = useContext(VoiceCaptureContext);
  if (!ctx) {
    return {
      activeForm: null,
      autoListen: false,
      setAutoListen: () => {},
      registerForm: () => () => {},
    };
  }
  return ctx;
}
