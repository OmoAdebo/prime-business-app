import { useEffect } from "react";
import { useVoiceCapture, type VoiceFieldSchema } from "@/contexts/VoiceCaptureContext";
import { onAction } from "@/lib/action-bus";

/**
 * Register an open form/modal with the global voice capture system so the
 * floating voice assistant auto-activates and dictated values get applied
 * to this form's fields.
 *
 * Call this inside a Dialog/Sheet only when it is OPEN (gate with `open && ...`
 * via the `enabled` flag).
 */
export function useVoiceForm(opts: {
  enabled: boolean;
  formId: string;
  title: string;
  fields: VoiceFieldSchema[];
  apply: (values: Record<string, any>) => void;
}) {
  const { registerForm } = useVoiceCapture();
  const { enabled, formId, title, fields, apply } = opts;

  useEffect(() => {
    if (!enabled) return;
    const dispose = registerForm({ formId, title, fields });
    const off = onAction("voice-fill-fields", (payload) => {
      if (!payload || payload.form_id !== formId) return;
      if (payload.values) apply(payload.values);
    });
    return () => { dispose(); off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, formId]);
}
