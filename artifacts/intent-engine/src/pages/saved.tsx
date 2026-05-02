import { Layout } from "@/components/layout";
import { LeadCard } from "@/components/lead-card";
import { useGetSavedLeads } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkX } from "lucide-react";

export default function SavedLeads() {
  const { data: leadsData, isLoading } = useGetSavedLeads();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SAVED_SIGNALS</h1>
          <p className="text-muted-foreground mt-1 text-sm">Bookmarked leads pending outreach or analysis.</p>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full bg-muted/50 rounded-md border border-border" />
            ))
          ) : leadsData?.leads && leadsData.leads.length > 0 ? (
            leadsData.leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))
          ) : (
            <div className="p-12 border border-dashed border-border rounded-md flex flex-col items-center justify-center text-center bg-card/50">
              <BookmarkX className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-foreground font-medium text-lg">NO_SAVED_SIGNALS</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                You haven't bookmarked any leads yet. Explore the signal radar and save leads for later follow-up.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
