import { useState } from "react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setSending(true);
    // Placeholder — will integrate with email service later
    await new Promise((r) => setTimeout(r, 1000));
    toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
    setForm({ name: "", email: "", message: "" });
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h1 className="text-4xl sm:text-5xl font-bold font-display text-foreground">Contact Us</h1>
            <p className="mt-4 text-lg text-muted-foreground">Have a question? We'd love to hear from you.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div {...fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Send a Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="How can we help?" rows={5} />
                    </div>
                    <Button type="submit" disabled={sending} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div className="space-y-6" {...fadeUp} transition={{ delay: 0.2 }}>
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Office Address</h3>
                    <p className="text-sm text-muted-foreground mt-1">Lagos, Nigeria</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email</h3>
                    <p className="text-sm text-muted-foreground mt-1">hello@primebusiness.com</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Phone</h3>
                    <p className="text-sm text-muted-foreground mt-1">+234 800 000 0000</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Prime Business Platform. All rights reserved.
      </footer>
    </div>
  );
}
