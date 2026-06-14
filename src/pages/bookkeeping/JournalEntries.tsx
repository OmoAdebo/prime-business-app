import { useIndustry } from "@/contexts/IndustryContext";
import JournalEntriesDefault from "./JournalEntriesDefault";
import JournalEntryGridMSME from "@/components/bookkeeping/JournalEntryGridMSME";

export default function JournalEntries() {
  const { config } = useIndustry();
  if (config.journalEntryVariant === "msme") {
    return <JournalEntryGridMSME />;
  }
  return <JournalEntriesDefault />;
}
