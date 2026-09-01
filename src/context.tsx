import { createContext, useContext } from "react";
import type { UseFormReturn } from "./useForm";

export const FormContext = createContext<UseFormReturn<Record<string, unknown>> | null>(null);

export function FormProvider<T extends Record<string, unknown>>({ children, ...form }: UseFormReturn<T> & { children: React.ReactNode }) {
  return <FormContext.Provider value={form as UseFormReturn<Record<string, unknown>>}>{children}</FormContext.Provider>;
}

export function useFormContext<T extends Record<string, unknown> = Record<string, unknown>>(): UseFormReturn<T> {
  const ctx = useContext(FormContext) as UseFormReturn<T> | null;
  if (!ctx) throw new Error("useFormContext must be used within a <FormProvider>");
  return ctx;
}
