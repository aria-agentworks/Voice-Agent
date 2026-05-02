import { useState } from "react";
import { Layout } from "@/components/layout";
import { LeadCard } from "@/components/lead-card";
import { useGetLeads, useGetSources } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LeadsExplorer() {
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [source, setSource] = useState<string | undefined>(undefined);

  const { data: leadsData, isLoading } = useGetLeads({ 
    min_score: minScore, 
    source: source === "all" ? undefined : source 
  });
  
  const { data: sourcesData } = useGetSources();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LEAD_EXPLORER</h1>
          <p className="text-muted-foreground mt-1 text-sm">Filter and analyze captured intent signals.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 border border-border bg-card p-4 rounded-md">
          <div className="flex items-center gap-2 border-r border-border pr-4 mr-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">FILTERS</span>
          </div>

          <div className="flex flex-1 flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select value={minScore?.toString() || "0"} onValueChange={(v) => setMinScore(Number(v))}>
                <SelectTrigger className="font-mono text-xs h-9">
                  <SelectValue placeholder="INTENT_SCORE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">ALL_SCORES (0+)</SelectItem>
                  <SelectItem value="5">MEDIUM+ (5+)</SelectItem>
                  <SelectItem value="8">HIGH_ONLY (8+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={source || "all"} onValueChange={(v) => setSource(v)}>
                <SelectTrigger className="font-mono text-xs h-9">
                  <SelectValue placeholder="SOURCE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ALL_SOURCES</SelectItem>
                  {sourcesData?.sources.map((s) => (
                    <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center ml-auto font-mono text-xs text-muted-foreground bg-muted px-3 py-1 rounded">
            <SlidersHorizontal className="h-3 w-3 mr-2" />
            {leadsData?.total || 0} MATCHES
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full bg-muted/50 rounded-md border border-border" />
            ))
          ) : leadsData?.leads && leadsData.leads.length > 0 ? (
            leadsData.leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))
          ) : (
            <div className="p-12 border border-dashed border-border rounded-md flex flex-col items-center justify-center text-center">
              <Search className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-foreground font-medium text-lg">NO_RESULTS_FOUND</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                No signals match your current filter parameters. Try lowering the intent score threshold or broadening your source selection.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
