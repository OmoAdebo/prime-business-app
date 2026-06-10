import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mic, MicOff, Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { dispatchAction, type AppAction } from "@/lib/action-bus";
import { Input } from "@/components/ui/input";
import { useIndustry } from "@/contexts/IndustryContext";
import { useVoiceCapture } from "@/contexts/VoiceCaptureContext";
import { Switch } from "@/components/ui/switch";

type ChatMsg = { role: "user" | "assistant"; content: string };

const TOOL_TO_ACTION: Record<string, AppAction["type"]> = {
  open_create_invoice: "open-create-invoice",
  open_add_product: "open-add-product",
  open_record_expense: "open-record-expense",
  open_add_customer: "open-add-customer",
  open_new_transfer: "open-new-transfer",
  open_add_supplier: "open-add-supplier",
  open_stock_movement: "open-stock-movement",
  open_journal_entry: "open-journal-entry",
  open_payroll_run: "open-payroll-run",
  open_create_order: "open-create-order",
};

const TOOL_TO_PATH: Record<string, string> = {
  open_create_invoice: "/invoicing",
  open_add_product: "/inventory/products",
  open_record_expense: "/bookkeeping/journal-entries",
  open_add_customer: "/customers",
  open_new_transfer: "/banking/transfers",
  open_add_supplier: "/inventory/suppliers",
  open_stock_movement: "/inventory/stock",
  open_journal_entry: "/bookkeeping/journal-entries",
  open_payroll_run: "/payroll",
  open_create_order: "/store",
};

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

export function FloatingVoiceButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { category, subcategory } = useIndustry();
  const { activeForm, autoListen, setAutoListen } = useVoiceCapture();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const sendToAgent = useCallback(async (text: string, form?: typeof activeForm) => {
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent", {
        body: {
          messages: next,
          page: location.pathname,
          industry: { category, subcategory },
          active_form: form ? { form_id: form.formId, title: form.title, fields: form.fields } : null,
        },
      });
      if (error) throw error;
      const reply: string = data?.reply || "";
      const calls: { name: string; args: any }[] = data?.tool_calls || [];

      if (reply && !form) {
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
        speak(reply);
      }

      if (user) {
        await supabase.from("voice_usage").insert({
          user_id: user.id,
          command_text: text,
          action_type: calls[0]?.name || "chat",
          success: true,
        }).then(() => {}, () => {});
      }

      for (const c of calls) {
        if (c.name === "fill_form_fields" && c.args?.form_id && c.args?.values) {
          dispatchAction({ type: "voice-fill-fields", payload: { form_id: c.args.form_id, values: c.args.values } });
          const keys = Object.keys(c.args.values).join(", ");
          if (keys) toast.success(`Filled: ${keys}`);
        } else if (c.name === "navigate" && c.args?.path) {
          setOpen(false);
          navigate(c.args.path);
        } else if (TOOL_TO_ACTION[c.name]) {
          const path = TOOL_TO_PATH[c.name];
          if (path && location.pathname !== path) {
            navigate(path);
            setTimeout(() => dispatchAction({ type: TOOL_TO_ACTION[c.name], payload: c.args } as AppAction), 250);
          } else {
            dispatchAction({ type: TOOL_TO_ACTION[c.name], payload: c.args } as AppAction);
          }
          if (!form) setTimeout(() => setOpen(false), 600);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Voice agent failed");
      if (!form) setMessages((m) => [...m, { role: "assistant", content: "Sorry, I ran into an issue. Please try again." }]);
    } finally {
      setThinking(false);
    }
  }, [messages, navigate, location.pathname, user, category, subcategory]);

  const startListening = useCallback((form?: typeof activeForm) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Speech recognition not supported in this browser."); return; }
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    const rec = new SR();
    rec.continuous = !!form; // keep listening while a form is open
    rec.interimResults = true;
    rec.lang = "en-US";
    let buffer = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const t = r[0].transcript.trim();
          if (t) {
            buffer = "";
            setLiveTranscript("");
            setInput("");
            sendToAgent(t, form);
          }
        } else {
          interim += r[0].transcript;
        }
      }
      if (interim) { setLiveTranscript(interim); setInput(interim); }
    };
    rec.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === "not-allowed") toast.error("Microphone access denied.");
    };
    rec.onend = () => {
      setIsListening(false);
      setLiveTranscript("");
    };
    recognitionRef.current = rec;
    try { rec.start(); setIsListening(true); } catch {}
  }, [sendToAgent]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsListening(false);
    setLiveTranscript("");
  }, []);

  // Auto-listen when a form/modal opens
  useEffect(() => {
    if (activeForm && autoListen && user) {
      const t = setTimeout(() => startListening(activeForm), 200);
      return () => { clearTimeout(t); stopListening(); };
    }
    if (!activeForm) stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeForm?.formId, autoListen, user]);

  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendToAgent(t, activeForm ?? undefined);
  };

  if (!user) return null;

  const armed = !!activeForm;

  return (
    <>
      {/* Inline voice strip when a form is open */}
      {armed && (
        <div className="fixed bottom-24 right-6 z-[60] max-w-md w-[min(92vw,28rem)] rounded-2xl border bg-card/95 backdrop-blur shadow-2xl p-3 flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <div className={`relative h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isListening ? "bg-destructive text-destructive-foreground" : "bg-primary/10 text-primary"}`}>
            {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {isListening && <span className="absolute inset-0 rounded-full ring-2 ring-destructive/40 animate-ping" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {isListening ? "Listening" : "Paused"} · {activeForm!.title}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {liveTranscript || (thinking ? "Filling fields…" : "Speak field values, e.g. \"due date June 15, amount fifty thousand\"")}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 mr-1">
              <Switch checked={autoListen} onCheckedChange={setAutoListen} aria-label="Auto-listen" />
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={isListening ? stopListening : () => startListening(activeForm)}>
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={stopListening}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center ${armed ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
        aria-label="Voice command"
      >
        {armed ? <Mic className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        <span className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background animate-pulse ${armed ? "bg-destructive/80" : "bg-primary/80"}`} />
      </button>

      <Sheet open={open} onOpenChange={(v) => { if (!v && !armed) stopListening(); setOpen(v); }}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[75vh] flex flex-col p-0">
          <SheetHeader className="text-left px-4 pt-4 pb-2 border-b">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Prime AI Assistant
            </SheetTitle>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground space-y-3 pt-4">
                <p>Hi! I can help you run your business. Try:</p>
                <div className="space-y-1.5">
                  {[
                    'Create an invoice for John Doe for ₦50,000',
                    'Add a new product called Headphones at ₦15,000',
                    'Open the reports page',
                    'Record an expense of ₦8,000 for fuel',
                  ].map((s) => (
                    <button key={s} onClick={() => sendToAgent(s)} className="block w-full text-left text-xs rounded-lg border border-border bg-card px-3 py-2 hover:border-primary/50 transition-colors">
                      "{s}"
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3 flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              className="h-10 w-10 rounded-full shrink-0"
              onClick={isListening ? stopListening : () => startListening()}
              aria-label={isListening ? "Stop" : "Speak"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening…" : "Ask or command…"}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              disabled={thinking}
            />
            <Button type="button" size="icon" className="h-10 w-10 rounded-full shrink-0" onClick={handleSend} disabled={thinking || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
