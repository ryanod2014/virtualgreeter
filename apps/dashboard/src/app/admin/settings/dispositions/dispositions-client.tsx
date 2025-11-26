"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Check,
  X,
  Palette,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Disposition {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  dispositions: Disposition[];
  organizationId: string;
}

const PRESET_COLORS = [
  "#22c55e", // green
  "#ef4444", // red
  "#f59e0b", // amber
  "#6b7280", // gray
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
];

export function DispositionsClient({
  dispositions: initialDispositions,
  organizationId,
}: Props) {
  const [dispositions, setDispositions] = useState(initialDispositions);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const supabase = createClient();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = dispositions.findIndex((d) => d.id === active.id);
      const newIndex = dispositions.findIndex((d) => d.id === over.id);

      const reorderedDispositions = arrayMove(dispositions, oldIndex, newIndex);
      
      // Update local state immediately for responsive UI
      setDispositions(reorderedDispositions);

      // Update display_order for all affected items in the database
      const updates = reorderedDispositions.map((d, index) => ({
        id: d.id,
        display_order: index,
      }));

      // Update each disposition's display_order
      for (const update of updates) {
        await supabase
          .from("dispositions")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;

    const maxOrder = Math.max(0, ...dispositions.map((d) => d.display_order));

    const { data, error } = await supabase
      .from("dispositions")
      .insert({
        organization_id: organizationId,
        name: newName.trim(),
        color: newColor,
        display_order: maxOrder + 1,
        is_active: true,
      })
      .select()
      .single();

    if (data && !error) {
      setDispositions([...dispositions, data]);
      setNewName("");
      setNewColor(PRESET_COLORS[0]);
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    const { error } = await supabase
      .from("dispositions")
      .update({ name: editName.trim(), color: editColor })
      .eq("id", id);

    if (!error) {
      setDispositions(
        dispositions.map((d) =>
          d.id === id ? { ...d, name: editName.trim(), color: editColor } : d
        )
      );
      setEditingId(null);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("dispositions")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (!error) {
      setDispositions(
        dispositions.map((d) =>
          d.id === id ? { ...d, is_active: !isActive } : d
        )
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this disposition?")) return;

    const { error } = await supabase
      .from("dispositions")
      .delete()
      .eq("id", id);

    if (!error) {
      setDispositions(dispositions.filter((d) => d.id !== id));
    }
  };

  const startEditing = (disposition: Disposition) => {
    setEditingId(disposition.id);
    setEditName(disposition.name);
    setEditColor(disposition.color);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Call Dispositions</h1>
            <p className="text-muted-foreground">
              Define outcomes that agents can assign after each call
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Disposition
          </button>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">New Disposition</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                placeholder="e.g., Interested, Follow Up, etc."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      newColor === color
                        ? "ring-2 ring-offset-2 ring-primary"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Add Disposition
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewName("");
                }}
                className="px-6 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispositions List */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
            <div className="col-span-1"></div>
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Color</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Actions</div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={dispositions.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="divide-y divide-border">
              {dispositions.map((disposition) => (
                <SortableDispositionRow
                  key={disposition.id}
                  disposition={disposition}
                  isEditing={editingId === disposition.id}
                  editName={editName}
                  editColor={editColor}
                  onEditNameChange={setEditName}
                  onEditColorChange={setEditColor}
                  onStartEditing={() => startEditing(disposition)}
                  onUpdate={() => handleUpdate(disposition.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onToggleActive={() => handleToggleActive(disposition.id, disposition.is_active)}
                  onDelete={() => handleDelete(disposition.id)}
                />
              ))}

              {dispositions.length === 0 && (
                <div className="p-12 text-center">
                  <Palette className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No dispositions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create dispositions for agents to categorize call outcomes
                  </p>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Disposition
                  </button>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <h4 className="font-medium mb-2">💡 How Dispositions Work</h4>
        <p className="text-sm text-muted-foreground">
          After each call ends, agents will see a modal to select a disposition.
          This helps you track call outcomes and measure conversion rates across
          your team. Inactive dispositions won&apos;t appear in the selection
          modal but historical data is preserved. Drag and drop to reorder.
        </p>
      </div>
    </div>
  );
}

// Sortable row component
interface SortableDispositionRowProps {
  disposition: Disposition;
  isEditing: boolean;
  editName: string;
  editColor: string;
  onEditNameChange: (name: string) => void;
  onEditColorChange: (color: string) => void;
  onStartEditing: () => void;
  onUpdate: () => void;
  onCancelEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function SortableDispositionRow({
  disposition,
  isEditing,
  editName,
  editColor,
  onEditNameChange,
  onEditColorChange,
  onStartEditing,
  onUpdate,
  onCancelEdit,
  onToggleActive,
  onDelete,
}: SortableDispositionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: disposition.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-12 gap-4 p-4 items-center bg-card ${
        !disposition.is_active ? "opacity-50" : ""
      } ${isDragging ? "opacity-50 shadow-lg z-50" : ""}`}
    >
      {/* Drag Handle */}
      <div className="col-span-1">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Name */}
      <div className="col-span-5">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: disposition.color }}
            />
            <span className="font-medium">{disposition.name}</span>
          </div>
        )}
      </div>

      {/* Color */}
      <div className="col-span-2">
        {isEditing ? (
          <div className="flex gap-1">
            {PRESET_COLORS.slice(0, 5).map((color) => (
              <button
                key={color}
                onClick={() => onEditColorChange(color)}
                className={`w-6 h-6 rounded transition-all ${
                  editColor === color
                    ? "ring-2 ring-offset-1 ring-primary"
                    : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <span
              className="w-6 h-6 rounded"
              style={{ backgroundColor: disposition.color }}
            />
          </div>
        )}
      </div>

      {/* Status */}
      <div className="col-span-2">
        <button
          onClick={onToggleActive}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            disposition.is_active
              ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {disposition.is_active ? "Active" : "Inactive"}
        </button>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center gap-2">
        {isEditing ? (
          <>
            <button
              onClick={onUpdate}
              className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={onCancelEdit}
              className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartEditing}
              className="px-3 py-1.5 rounded-lg text-sm hover:bg-muted transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

