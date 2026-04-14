"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles } from "lucide-react";

const MOOD_OPTIONS = [
  { emoji: "😊", label: "Great" },
  { emoji: "🤔", label: "Reflective" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "🎉", label: "Excited" },
  { emoji: "😴", label: "Tired" },
  { emoji: "💪", label: "Motivated" },
];

const WRITING_PROMPTS = [
  "What new English word or phrase did you learn today?",
  "Describe a conversation you had (or wanted to have) in English.",
  "Write about a mistake you made and what you learned from it.",
  "Explain a concept from your work/studies using English.",
  "What English content did you consume today (podcast, article, video)?",
  "Write about your goals for learning English this week.",
];

export function EntryEditor() {
  const createEntry = useMutation(api.entries.create);
  const router = useRouter();
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await createEntry({ content: content.trim(), mood });
      router.push("/journal");
    } catch (error) {
      console.error("Error creating entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Writing prompts */}
      {showPrompts && content.length === 0 && (
        <Card className="border-dashed border-terracotta/30 bg-terracotta/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-terracotta" />
              <span className="text-sm font-medium text-terracotta">
                Writing Prompts
              </span>
              <button
                onClick={() => setShowPrompts(false)}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Hide
              </button>
            </div>
            <div className="space-y-2">
              {WRITING_PROMPTS.slice(0, 3).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setContent(prompt + "\n\n")}
                  className="block text-left text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  • {prompt}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      <Card>
        <CardContent className="pt-6">
          <Textarea
            placeholder="Write about what you learned today in English..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px] resize-none border-0 p-0 focus-visible:ring-0 text-base leading-relaxed"
          />
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-4">
            {/* Mood selector */}
            <div className="flex items-center gap-1">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.label}
                  onClick={() =>
                    setMood(mood === m.emoji ? undefined : m.emoji)
                  }
                  className={`text-lg p-1 rounded transition-all ${
                    mood === m.emoji
                      ? "bg-terracotta/10 scale-110"
                      : "opacity-50 hover:opacity-100"
                  }`}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>

            {/* Word count */}
            <span className="text-xs text-muted-foreground">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            className="bg-terracotta hover:bg-terracotta-dark"
          >
            {loading ? (
              "Saving..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Save Entry
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center">
        After saving, AI will analyze your entry, extract concepts, and check
        your writing. This usually takes a few seconds.
      </p>
    </div>
  );
}
