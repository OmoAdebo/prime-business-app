import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mic, MicOff, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { dispatchAction, type AppAction } from "@/lib/action-bus";
import { Input } from "@/components/ui/input";

type ChatMsg = { role: "user" | "assistant"; content: string };

const TOOL_TO_ACTION: Record<string, AppAction["type"]> = {
  open_create_invoice: "open-create-invoice",
  open_add_product: "open-add-product",
  open_record_expense: "open-record-expense",
  open_add_customer: "open-add-customer",
  open_new_transfer: "open-new-transfer",
};

const TOOL_TO_PATH: Record<string, string> = {
  open_create_invoice: "/invoicing",
  open_add_product: "/inventory/products",
  open_record_expense: "/bookkeeping/journal-entries",
  open_add_customer: "/customers",
  open_new_transfer: "/banking/transfers",
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
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const sendToAgent = useCallback(async (text: string) => {
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent", {
        body: { messages: next, page: location.pathname },
      });
      if (error) throw error;
      const reply: string = data?.reply || "";
      const calls: { name: string; args: any }[] = data?.tool_calls || [];

      if (reply) {
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
        speak(reply);
      }

      // Log usage
      if (user) {
        await supabase.from("voice_usage").insert({
          user_id: user.id,
          command_text: text,
          action_type: calls[0]?.name || "chat",
          success: true,
        }).then(() => {}, () => {});
      }

      // Execute tool calls
      for (const c of calls) {
        if (c.name === "navigate" && c.args?.path) {
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
          setTimeout(() => setOpen(false), 600);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Voice agent failed");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I ran into an issue. Please try again." }]);
    } finally {
      setThinking(false);
    }
  }, [messages, navigate, location.pathname, user]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Speech recognition not supported in this browser."); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalText = "";
    rec.onresult = (e: any) => {
      const cur = e.results[e.results.length - 1];
      const t = cur[0].transcript;
      setInput(t);
      if (cur.isFinal) { finalText = t; }
    };
    rec.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === "not-allowed") toast.error("Microphone access denied.");
    };
    rec.onend = () => {
      setIsListening(false);
      const t = finalText.trim();
      if (t) { setInput(""); sendToAgent(t); }
    };
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [sendToAgent]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleSend = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendToAgent(t);
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
        aria-label="Voice command"
      >
        <Sparkles className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary/80 border-2 border-background animate-pulse" />
      </button>

      <Sheet open={open} onOpenChange={(v) => { if (!v) stopListening(); setOpen(v); }}>
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
              onClick={isListening ? stopListening : startListening}
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
