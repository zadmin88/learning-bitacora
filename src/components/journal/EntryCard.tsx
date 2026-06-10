"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConceptBadge } from "./ConceptBadge";
import { CorrectionHighlight } from "./CorrectionHighlight";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  CheckCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Clock,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

const MOOD_OPTIONS = [
  { emoji: "😊", label: "Genial" },
  { emoji: "🤔", label: "Reflexivo" },
  { emoji: "😤", label: "Frustrado" },
  { emoji: "🎉", label: "Emocionado" },
  { emoji: "😴", label: "Cansado" },
  { emoji: "💪", label: "Motivado" },
];

interface Entry {
  _id: Id<"entries">;
  content: string;
  mood?: string;
  praise?: string;
  overallLevel?: string;
  corrections?: any;
  conceptCount: number;
  processingError?: boolean;
  createdAt: number;
}

export function EntryCard({ entry }: { entry: Entry }) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const concepts = useQuery(
    api.concepts.listByEntry,
    expanded ? { entryId: entry._id } : "skip"
  );

  const nextReview = useQuery(
    api.concepts.getNextReviewByEntry,
    entry.conceptCount > 0 ? { entryId: entry._id } : "skip"
  );

  const updateEntry = useMutation(api.entries.update);
  const removeEntry = useMutation(api.entries.remove);
  const reprocessEntry = useMutation(api.entries.reprocess);

  // Detect silently failed processing: entry is old enough (>2 min) but has no AI data
  const TWO_MINUTES = 2 * 60 * 1000;
  const isStale = Date.now() - entry.createdAt > TWO_MINUTES;
  const hasNoAIData = !entry.praise && !entry.overallLevel && entry.conceptCount === 0 && !entry.corrections;
  const showError = entry.processingError || (isStale && hasNoAIData) || (isStale && entry.conceptCount === 0);

  const corrections = entry.corrections as
    | Array<{
        original: string;
        corrected: string;
        explanation: string;
        severity: "minor" | "moderate" | "important";
      }>
    | undefined;

  const handleStartEdit = () => {
    setEditContent(entry.content);
    setEditMood(entry.mood);
    setIsEditing(true);
    setExpanded(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await updateEntry({
        entryId: entry._id,
        content: editContent.trim(),
        mood: editMood,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating entry:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      await reprocessEntry({ entryId: entry._id });
    } catch (error) {
      console.error("Error reprocessing entry:", error);
    } finally {
      setReprocessing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeEntry({ entryId: entry._id });
    } catch (error) {
      console.error("Error deleting entry:", error);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Card className="animate-fade-in transition-all hover:shadow-md">
        <CardContent className="pt-4 pb-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{format(entry.createdAt, "d MMM yyyy", { locale: es })}</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: es })}
              </span>
              {entry.mood && !isEditing && <span>{entry.mood}</span>}
            </div>
            <div className="flex items-center gap-2">
              {entry.overallLevel && (
                <Badge variant="outline" className="text-xs capitalize">
                  {entry.overallLevel}
                </Badge>
              )}
              {entry.conceptCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {entry.conceptCount}
                </Badge>
              )}
              {nextReview !== undefined && nextReview !== null && (
                <Badge
                  variant={nextReview <= Date.now() ? "default" : "outline"}
                  className={`text-xs ${nextReview <= Date.now() ? "bg-primary hover:bg-blue-dark" : ""}`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {nextReview <= Date.now()
                    ? "Repaso pendiente"
                    : formatDistanceToNow(nextReview, { addSuffix: true, locale: es })}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleStartEdit}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReprocess} disabled={reprocessing}>
                    <RefreshCw className={`h-4 w-4 ${reprocessing ? "animate-spin" : ""}`} />
                    Reprocesar conceptos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Content / Edit mode */}
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[150px] resize-none text-sm leading-relaxed"
                autoFocus
              />
              <div className="flex items-center gap-1">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() =>
                      setEditMood(editMood === m.emoji ? undefined : m.emoji)
                    }
                    className={`text-lg p-1 rounded transition-all ${
                      editMood === m.emoji
                        ? "bg-primary/10 scale-110"
                        : "opacity-50 hover:opacity-100"
                    }`}
                    title={m.label}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-blue-dark"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || saving}
                >
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={`text-sm leading-relaxed whitespace-pre-wrap ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {entry.content}
            </p>
          )}

          {/* Processing error */}
          {showError && !isEditing && (
            <div className="mt-3 p-2 bg-destructive/10 rounded-md text-sm text-destructive flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Error al procesar la entrada</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprocess}
                disabled={reprocessing}
                className="shrink-0"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${reprocessing ? "animate-spin" : ""}`} />
                {reprocessing ? "Procesando..." : "Reintentar"}
              </Button>
            </div>
          )}

          {/* Praise */}
          {entry.praise && expanded && !isEditing && (
            <div className="mt-3 p-2 bg-emerald/10 rounded-md text-sm text-emerald-dark flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{entry.praise}</span>
            </div>
          )}

          {/* Corrections */}
          {expanded && corrections && corrections.length > 0 && !isEditing && (
            <div className="mt-3">
              <CorrectionHighlight corrections={corrections} />
            </div>
          )}

          {/* Concepts */}
          {expanded && concepts && concepts.length > 0 && !isEditing && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Conceptos Extraídos
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {concepts.map((concept) => (
                  <ConceptBadge
                    key={concept._id}
                    type={concept.type}
                    term={concept.term}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Expand/collapse */}
          {!isEditing && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
            >
              {expanded ? (
                <>
                  Ver menos <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Ver más <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Entrada</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los conceptos
              asociados a esta entrada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
