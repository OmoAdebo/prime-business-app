import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const FREE_DAILY_LIMIT = 10;

export default function VoiceCommand() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const recognitionRef = useRef<any>(null);

  // Today's usage count
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

  // Recent commands
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
    const lower = text.toLowerCase();
    let actionType = "unknown";
    let responseText = "";

    if (lower.includes("today's sales") || lower.includes("today sales") || lower.includes("show sales")) {
      actionType = "query_sales";
      responseText = "I'll navigate you to the Reports page where you can see today's sales data.";
    } else if (lower.includes("add expense") || lower.includes("record expense")) {
      actionType = "add_expense";
      const amountMatch = lower.match(/(\d[\d,]*)/);
      responseText = amountMatch
        ? `I'll help you record an expense of ₦${amountMatch[1]}. Please go to Bookkeeping to complete the entry.`
        : "Please specify the amount. For example: 'Add expense of 5000 naira'";
    } else if (lower.includes("balance") || lower.includes("account balance")) {
      actionType = "query_balance";
      responseText = "Check your Banking page for current account balances.";
    } else if (lower.includes("invoice") || lower.includes("create invoice")) {
      actionType = "create_invoice";
      responseText = "Navigate to Invoicing to create a new invoice.";
    } else if (lower.includes("inventory") || lower.includes("stock")) {
      actionType = "query_inventory";
      responseText = "Head to the Inventory page to view stock levels.";
    } else {
      actionType = "general";
      responseText = `I heard: "${text}". Try commands like "Show today's sales", "Add expense of 5000 naira", or "What's my balance?"`;
    }

    setResponse(responseText);
    logUsage.mutate({ command: text, actionType, success: true });
  }, [logUsage]);

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
  }, [usageCount, processCommand]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const remaining = Math.max(0, FREE_DAILY_LIMIT - usageCount);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voice Commands</h1>
        <p className="text-muted-foreground">Control your business with your voice</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Voice Input */}
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
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Try saying:</p>
              <div className="flex flex-wrap gap-2">
                {["Show today's sales", "Add expense of 5000 naira", "What's my balance?", "Create invoice"].map((cmd) => (
                  <Badge key={cmd} variant="outline" className="text-xs">{cmd}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Commands */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Commands</CardTitle>
            <CardDescription>Your voice command history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(recentCommands as any[])?.map((cmd: any) => (
                <div key={cmd.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">"{cmd.command_text}"</p>
                    <p className="text-xs text-muted-foreground capitalize">{cmd.action_type?.replace("_", " ")}</p>
                  </div>
                  <div className="text-right">
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
