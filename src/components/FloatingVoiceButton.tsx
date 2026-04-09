import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";

const COMMAND_MAP: { keywords: string[]; path: string; label: string; actionType: string; response: string }[] = [
  { keywords: ["go to dashboard", "open dashboard", "home", "go home", "dashboard"], path: "/dashboard", label: "Dashboard", actionType: "navigate_dashboard", response: "Opening your Dashboard..." },
  { keywords: ["show sales", "today's sales", "today sales", "sales report"], path: "/reports", label: "Reports", actionType: "query_sales", response: "Opening Reports to view sales data..." },
  { keywords: ["create invoice", "new invoice", "make invoice"], path: "/invoicing", label: "Invoicing", actionType: "create_invoice", response: "Opening Invoicing..." },
  { keywords: ["add expense", "record expense"], path: "/bookkeeping/journal-entries", label: "Journal Entries", actionType: "add_expense", response: "Opening Journal Entries..." },
  { keywords: ["check balance", "my balance", "account balance"], path: "/banking", label: "Banking", actionType: "query_balance", response: "Opening Banking..." },
  { keywords: ["banking transfer", "send money", "transfer money"], path: "/banking/transfers", label: "Transfers", actionType: "navigate_transfers", response: "Opening Transfers..." },
  { keywords: ["open inventory", "check stock", "stock level", "inventory"], path: "/inventory/stock", label: "Stock", actionType: "query_inventory", response: "Opening Inventory..." },
  { keywords: ["add product", "new product", "create product"], path: "/inventory/products", label: "Products", actionType: "add_product", response: "Opening Products..." },
  { keywords: ["purchase order"], path: "/inventory/purchase-orders", label: "Purchase Orders", actionType: "navigate_po", response: "Opening Purchase Orders..." },
  { keywords: ["supplier"], path: "/inventory/suppliers", label: "Suppliers", actionType: "navigate_suppliers", response: "Opening Suppliers..." },
  { keywords: ["open pos", "point of sale", "sell something", "start selling", "pos"], path: "/pos", label: "POS", actionType: "navigate_pos", response: "Opening Point of Sale..." },
  { keywords: ["payroll", "pay staff", "salaries", "salary"], path: "/payroll", label: "Payroll", actionType: "navigate_payroll", response: "Opening Payroll..." },
  { keywords: ["customer", "client list", "manage customer"], path: "/customers", label: "Customers", actionType: "navigate_customers", response: "Opening Customers..." },
  { keywords: ["online store", "open store", "my store"], path: "/store", label: "Online Store", actionType: "navigate_store", response: "Opening Store..." },
  { keywords: ["setting", "open setting"], path: "/settings", label: "Settings", actionType: "navigate_settings", response: "Opening Settings..." },
  { keywords: ["budget", "budgeting"], path: "/budgeting", label: "Budgeting", actionType: "navigate_budgeting", response: "Opening Budgeting..." },
  { keywords: ["report", "view report"], path: "/reports", label: "Reports", actionType: "navigate_reports", response: "Opening Reports..." },
  { keywords: ["help", "support"], path: "/help", label: "Help", actionType: "navigate_help", response: "Opening Help..." },
  { keywords: ["bookkeeping", "ledger", "general ledger"], path: "/bookkeeping", label: "Bookkeeping", actionType: "navigate_bookkeeping", response: "Opening Bookkeeping..." },
  { keywords: ["employee"], path: "/employees", label: "Employees", actionType: "navigate_employees", response: "Opening Employees..." },
  { keywords: ["voice command", "voice"], path: "/voice", label: "Voice Commands", actionType: "navigate_voice", response: "Opening Voice Commands..." },
];

const FILLER_WORDS = ["please", "can you", "could you", "i want to", "i'd like to", "show me", "take me to", "let me see", "open up", "go to the", "navigate to"];

function normalizeText(text: string): string {
  let lower = text.toLowerCase().trim();
  for (const filler of FILLER_WORDS) {
    lower = lower.replace(new RegExp(`\\b${filler}\\b`, "g"), "");
  }
  return lower.replace(/\s+/g, " ").trim();
}

export function FloatingVoiceButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const logUsage = useMutation({
    mutationFn: async ({ command, actionType, success }: { command: string; actionType: string; success: boolean }) => {
      if (!user) return;
      await supabase.from("voice_usage").insert({
        user_id: user.id,
        command_text: command,
        action_type: actionType,
        success,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["voice-usage-today"] }),
  });

  const processCommand = useCallback((text: string) => {
    const normalized = normalizeText(text);
    const match = COMMAND_MAP.find((cmd) =>
      cmd.keywords.some((kw) => normalized.includes(kw))
    );

    if (match) {
      setResponse(match.response);
      setNavigatingTo(match.label);
      logUsage.mutate({ command: text, actionType: match.actionType, success: true });
      toast.success(`Navigating to ${match.label}...`);
      setTimeout(() => {
        setOpen(false);
        navigate(match.path);
        setNavigatingTo(null);
        setTranscript("");
        setResponse("");
      }, 1200);
    } else {
      setResponse(`I didn't understand "${text}". Try "Open POS" or "Create invoice".`);
      logUsage.mutate({ command: text, actionType: "unrecognized", success: false });
    }
  }, [logUsage, navigate]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const current = event.results[event.results.length - 1];
      setTranscript(current[0].transcript);
      if (current.isFinal) {
        processCommand(current[0].transcript);
        setIsListening(false);
      }
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied.");
      }
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
    setResponse("");
    setNavigatingTo(null);
  }, [processCommand]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleFabClick = () => {
    setOpen(true);
    // Auto-start listening when opening
    setTimeout(() => startListening(), 300);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleFabClick}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group"
        aria-label="Voice command"
      >
        <Mic className="h-6 w-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
      </button>

      {/* Voice Command Sheet */}
      <Sheet open={open} onOpenChange={(v) => { if (!v) { stopListening(); } setOpen(v); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh] pb-safe">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Voice Command
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {/* Mic Button */}
            <Button
              size="lg"
              variant={isListening ? "destructive" : "default"}
              className="h-20 w-20 rounded-full"
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </Button>
            <p className="text-sm text-muted-foreground">
              {isListening ? "Listening... Speak now" : "Tap to speak"}
            </p>

            {/* Transcript */}
            {transcript && (
              <div className="w-full rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">"{transcript}"</p>
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="w-full rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-sm">{response}</p>
                {navigatingTo && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-primary animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Navigating to {navigatingTo}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            )}

            {/* Quick suggestions */}
            {!transcript && !response && (
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Try saying:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Open POS", "Create invoice", "Check balance", "Go to payroll", "Open inventory"].map((cmd) => (
                    <Badge key={cmd} variant="outline" className="text-xs cursor-default">{cmd}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
