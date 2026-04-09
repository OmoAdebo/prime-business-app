import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const FREE_DAILY_LIMIT = 10;

const COMMAND_MAP: { keywords: string[]; path: string; label: string; actionType: string; response: string }[] = [
  { keywords: ["go to dashboard", "open dashboard", "home", "go home"], path: "/dashboard", label: "Dashboard", actionType: "navigate_dashboard", response: "Opening your Dashboard..." },
  { keywords: ["show sales", "today's sales", "today sales", "sales report"], path: "/reports", label: "Reports", actionType: "query_sales", response: "Opening Reports to view sales data..." },
  { keywords: ["create invoice", "new invoice", "make invoice"], path: "/invoicing", label: "Invoicing", actionType: "create_invoice", response: "Opening Invoicing — you can create a new invoice there." },
  { keywords: ["add expense", "record expense"], path: "/bookkeeping/journal-entries", label: "Journal Entries", actionType: "add_expense", response: "Opening Journal Entries to record your expense." },
  { keywords: ["check balance", "my balance", "account balance"], path: "/banking", label: "Banking", actionType: "query_balance", response: "Opening Banking to check your balances..." },
  { keywords: ["banking transfer", "send money", "transfer money"], path: "/banking/transfers", label: "Banking Transfers", actionType: "navigate_transfers", response: "Opening Banking Transfers..." },
  { keywords: ["open inventory", "check stock", "stock level"], path: "/inventory/stock", label: "Inventory Stock", actionType: "query_inventory", response: "Opening Inventory Stock levels..." },
  { keywords: ["add product", "new product", "create product"], path: "/inventory/products", label: "Products", actionType: "add_product", response: "Opening Products — you can add a new product there." },
  { keywords: ["purchase order"], path: "/inventory/purchase-orders", label: "Purchase Orders", actionType: "navigate_po", response: "Opening Purchase Orders..." },
  { keywords: ["supplier"], path: "/inventory/suppliers", label: "Suppliers", actionType: "navigate_suppliers", response: "Opening Suppliers..." },
  { keywords: ["open pos", "point of sale", "sell something", "start selling"], path: "/pos", label: "POS", actionType: "navigate_pos", response: "Opening Point of Sale..." },
  { keywords: ["payroll", "pay staff", "salaries", "salary"], path: "/payroll", label: "Payroll", actionType: "navigate_payroll", response: "Opening Payroll..." },
  { keywords: ["customer", "client list", "manage customer"], path: "/customers", label: "Customers", actionType: "navigate_customers", response: "Opening Customers..." },
  { keywords: ["online store", "open store", "my store"], path: "/store", label: "Online Store", actionType: "navigate_store", response: "Opening your Online Store..." },
  { keywords: ["setting", "open setting"], path: "/settings", label: "Settings", actionType: "navigate_settings", response: "Opening Settings..." },
  { keywords: ["budget", "budgeting"], path: "/budgeting", label: "Budgeting", actionType: "navigate_budgeting", response: "Opening Budgeting..." },
  { keywords: ["report", "view report"], path: "/reports", label: "Reports", actionType: "navigate_reports", response: "Opening Reports..." },
  { keywords: ["help", "support"], path: "/help", label: "Help & Support", actionType: "navigate_help", response: "Opening Help & Support..." },
  { keywords: ["bookkeeping", "ledger", "general ledger"], path: "/bookkeeping", label: "Bookkeeping", actionType: "navigate_bookkeeping", response: "Opening Bookkeeping..." },
  { keywords: ["banking admin", "admin banking"], path: "/banking/admin", label: "Banking Admin", actionType: "navigate_banking_admin", response: "Opening Banking Admin..." },
  { keywords: ["employee"], path: "/employees", label: "Employees", actionType: "navigate_employees", response: "Opening Employees..." },
];

const FILLER_WORDS = ["please", "can you", "could you", "i want to", "i'd like to", "show me", "take me to", "let me see", "open up", "go to the", "navigate to"];

function normalizeText(text: string): string {
  let lower = text.toLowerCase().trim();
  for (const filler of FILLER_WORDS) {
    lower = lower.replace(new RegExp(`\\b${filler}\\b`, "g"), "");
  }
  return lower.replace(/\s+/g, " ").trim();
}

export default function VoiceCommand() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const { data: usageCount = 0 } = useQuery({
    queryKey: ["voice-usage-today", user?.id],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("voice_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("created_at", todayStart.toISOString());
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: recentCommands } = useQuery({
    queryKey: ["voice-recent", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("voice_usage")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const logUsage = useMutation({
    mutationFn: async ({ command, actionType, success }: { command: string; actionType: string; success: boolean }) => {
      await supabase.from("voice_usage").insert({
        user_id: user!.id,
        command_text: command,
        action_type: actionType,
        success,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["voice-usage-today"] }),
  });

  const processCommand = useCallback((text: string) => {
    const normalized = normalizeText(text);

    // Find first matching command
    const match = COMMAND_MAP.find((cmd) =>
      cmd.keywords.some((kw) => normalized.includes(kw))
    );

    if (match) {
      setResponse(match.response);
      setNavigatingTo(match.label);
      logUsage.mutate({ command: text, actionType: match.actionType, success: true });
      toast.success(`Navigating to ${match.label}...`);
      setTimeout(() => {
        navigate(match.path);
        setNavigatingTo(null);
      }, 1500);
    } else {
      const fallback = `I heard: "${text}". Try commands like "Open POS", "Create invoice", or "Check my balance".`;
      setResponse(fallback);
      logUsage.mutate({ command: text, actionType: "unrecognized", success: false });
    }
  }, [logUsage, navigate]);

  const startListening = useCallback(() => {
    if (usageCount >= FREE_DAILY_LIMIT) {
      toast.error(`Daily limit reached (${FREE_DAILY_LIMIT} commands). Upgrade for unlimited access.`);
      return;
    }
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
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please enable it in your browser settings.");
      }
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
    setResponse("");
    setNavigatingTo(null);
  }, [usageCount, processCommand]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const remaining = Math.max(0, FREE_DAILY_LIMIT - usageCount);

  const suggestedCommands = [
    "Open POS", "Create invoice", "Check my balance",
    "Show today's sales", "Add product", "Open inventory",
    "Go to payroll", "Open settings",
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Voice Commands</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Control your business with your voice</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" /> Voice Input
            </CardTitle>
            <CardDescription>
              {remaining} commands remaining today (Free tier: {FREE_DAILY_LIMIT}/day)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                variant={isListening ? "destructive" : "default"}
                className="h-24 w-24 rounded-full"
                onClick={isListening ? stopListening : startListening}
                disabled={remaining === 0 && !isListening}
              >
                {isListening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isListening ? "Listening... Speak now" : "Tap to start speaking"}
              </p>
            </div>

            {transcript && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">You said:</p>
                <p className="text-sm text-muted-foreground">{transcript}</p>
              </div>
            )}

            {response && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <p className="text-sm font-medium text-primary">Response:</p>
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

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Try saying:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedCommands.map((cmd) => (
                  <Badge key={cmd} variant="outline" className="text-xs">{cmd}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Commands</CardTitle>
            <CardDescription>Your voice command history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(recentCommands as any[])?.map((cmd: any) => (
                <div key={cmd.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">"{cmd.command_text}"</p>
                    <p className="text-xs text-muted-foreground capitalize">{cmd.action_type?.replace(/_/g, " ")}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <Badge variant={cmd.success ? "default" : "destructive"} className="text-xs">
                      {cmd.success ? "Success" : "Failed"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(cmd.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
              {(!recentCommands || recentCommands.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No voice commands yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
