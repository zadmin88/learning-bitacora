"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TopBar } from "@/components/layout/TopBar";
import { SearchBar } from "@/components/explore/SearchBar";
import { SearchResults } from "@/components/explore/SearchResults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, BookOpen } from "lucide-react";

interface SearchResult {
  answer: string;
  entries: Array<{
    _id: string;
    content: string;
    createdAt: number;
    conceptCount: number;
  }>;
}

export default function ExplorePage() {
  const search = useAction(api.search.semanticSearch);
  const concepts = useQuery(api.concepts.listByUser, {});
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const result = await search({ query });
      setSearchResult(result as SearchResult);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Group concepts by type
  const conceptsByType: Record<string, typeof concepts> = {};
  if (concepts) {
    for (const concept of concepts) {
      if (!conceptsByType[concept.type]) conceptsByType[concept.type] = [];
      conceptsByType[concept.type]!.push(concept);
    }
  }

  return (
    <>
      <TopBar title="Explore" />
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="concepts" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Concepts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6 mt-4">
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />

            {searchResult ? (
              <SearchResults result={searchResult} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">
                  Ask questions about your learning history in natural language.
                </p>
                <p className="text-xs mt-1">
                  Try: &quot;What idioms have I learned?&quot; or &quot;Grammar
                  rules about prepositions&quot;
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="concepts" className="space-y-6 mt-4">
            {concepts === undefined ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : concepts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">
                  No concepts yet. Write journal entries to start extracting
                  concepts.
                </p>
              </div>
            ) : (
              Object.entries(conceptsByType).map(([type, typeConcepts]) => (
                <Card key={type}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                      {type}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({typeConcepts!.length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {typeConcepts!.map((concept) => (
                        <div
                          key={concept._id}
                          className="flex items-start justify-between gap-2 py-1.5 border-b border-border last:border-0"
                        >
                          <div>
                            <span className="text-sm font-medium">
                              {concept.term}
                            </span>
                            {concept.definition && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {concept.definition}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {concept.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
