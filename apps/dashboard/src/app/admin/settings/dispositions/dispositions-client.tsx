"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Check,
  X,
  Palette,
  Trophy,
  DollarSign,
  ChevronDown,
  Lock,
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
  value?: number | string | null;
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
  const [newValue, setNewValue] = useState("");
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editValue, setEditValue] = useState("");

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

    const parsedValue = newValue ? parseFloat(newValue) : null;
    
    // If making primary, add at position 0 and shift others
    // Otherwise add at the end
    const newDisplayOrder = newIsPrimary ? 0 : Math.max(0, ...dispositions.map((d) => d.display_order)) + 1;

    // If making primary, shift all existing dispositions first
    if (newIsPrimary && dispositions.length > 0) {
      const updates = dispositions.map((d, index) => ({
        id: d.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("dispositions")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
    }

    const { data, error } = await supabase
      .from("dispositions")
      .insert({
        organization_id: organizationId,
        name: newName.trim(),
        color: newColor,
        value: parsedValue,
        display_order: newDisplayOrder,
        is_active: true,
      })
      .select()
      .single();

    if (data && !error) {
      // Normalize data with proper value field
      const normalizedData = {
        ...data,
        value: parsedValue ?? data.value ?? null,
      };
      
      // If primary, add at start; otherwise add at end
      if (newIsPrimary) {
        // Update existing dispositions' display_order in local state
        const shiftedDispositions = dispositions.map((d, index) => ({
          ...d,
          display_order: index + 1,
        }));
        setDispositions([normalizedData, ...shiftedDispositions]);
      } else {
        setDispositions([...dispositions, normalizedData]);
      }
      
      setNewName("");
      setNewColor(PRESET_COLORS[0]);
      setNewValue("");
      setNewIsPrimary(false);
      setIsAdding(false);
    } else if (error) {
      console.error('Failed to add disposition:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    const parsedValue = editValue ? parseFloat(editValue) : null;

    const { error } = await supabase
      .from("dispositions")
      .update({ 
        name: editName.trim(), 
        color: editColor,
        value: parsedValue,
      })
      .eq("id", id);

    if (!error) {
      setDispositions(
        dispositions.map((d) =>
          d.id === id ? { ...d, name: editName.trim(), color: editColor, value: parsedValue } : d
        )
      );
      setEditingId(null);
    } else {
      console.error('Failed to update disposition:', error);
    }
  };

  const handleMakePrimary = async (id: string) => {
    // Find the disposition and move it to the top
    const dispositionIndex = dispositions.findIndex((d) => d.id === id);
    if (dispositionIndex <= 0) {
      console.log('Already primary or not found:', id, dispositionIndex);
      return;
    }

    const disposition = dispositions[dispositionIndex];
    const newDispositions = [
      disposition,
      ...dispositions.slice(0, dispositionIndex),
      ...dispositions.slice(dispositionIndex + 1),
    ];

    // Update local state immediately
    setDispositions(newDispositions);
    setEditingId(null);

    // Update display_order for all items in the database
    const updates = newDispositions.map((d, index) => ({
      id: d.id,
      display_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from("dispositions")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
      
      if (error) {
        console.error('Failed to update display_order:', error);
      }
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
    setEditValue(disposition.value != null ? String(disposition.value) : "");
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
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
            <div className="grid grid-cols-2 gap-4">
              <div className={newIsPrimary ? "opacity-40 pointer-events-none" : ""}>
                <label className="block text-sm font-medium mb-2">
                  Color
                  {newIsPrimary && (
                    <span className="text-muted-foreground font-normal ml-2 text-xs">
                      (primary uses trophy icon)
                    </span>
                  )}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      disabled={newIsPrimary}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        !newIsPrimary && newColor === color
                          ? "ring-2 ring-offset-2 ring-primary"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Conversion Value
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Track revenue generated per conversion
                </p>
              </div>
            </div>
            
            {/* Make Primary Toggle */}
            <button
              type="button"
              onClick={() => setNewIsPrimary(!newIsPrimary)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all ${
                newIsPrimary 
                  ? "bg-amber-500/10 border-amber-500/50 text-amber-500" 
                  : "bg-muted/30 border-border hover:bg-muted/50"
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                newIsPrimary 
                  ? "bg-amber-500 border-amber-500" 
                  : "border-muted-foreground/30"
              }`}>
                {newIsPrimary && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <Trophy className={`w-4 h-4 ${newIsPrimary ? "text-amber-500" : "text-muted-foreground"}`} />
              <div className="text-left">
                <span className="font-medium">Make this the primary disposition</span>
                <p className={`text-xs ${newIsPrimary ? "text-amber-500/70" : "text-muted-foreground"}`}>
                  Primary disposition is your main conversion goal
                </p>
              </div>
            </button>

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
                  setNewValue("");
                  setNewIsPrimary(false);
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
            <div className="col-span-7">Name</div>
            <div className="col-span-2">Value</div>
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
              {dispositions.map((disposition, index) => (
                <SortableDispositionRow
                  key={disposition.id}
                  disposition={disposition}
                  isPrimary={index === 0}
                  isEditing={editingId === disposition.id}
                  editName={editName}
                  editColor={editColor}
                  editValue={editValue}
                  onEditNameChange={setEditName}
                  onEditColorChange={setEditColor}
                  onEditValueChange={setEditValue}
                  onStartEditing={() => startEditing(disposition)}
                  onUpdate={() => handleUpdate(disposition.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onMakePrimary={() => handleMakePrimary(disposition.id)}
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
        <p className="text-sm text-muted-foreground mb-3">
          After each call ends, agents will see a modal to select a disposition.
          This helps you track call outcomes and measure conversion rates across your team.
        </p>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">Primary</strong> — First disposition is your main objective
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">Value</strong> — Track revenue per conversion
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sortable row component
interface SortableDispositionRowProps {
  disposition: Disposition;
  isPrimary: boolean;
  isEditing: boolean;
  editName: string;
  editColor: string;
  editValue: string;
  onEditNameChange: (name: string) => void;
  onEditColorChange: (color: string) => void;
  onEditValueChange: (value: string) => void;
  onStartEditing: () => void;
  onUpdate: () => void;
  onCancelEdit: () => void;
  onMakePrimary: () => void;
  onDelete: () => void;
}

function SortableDispositionRow({
  disposition,
  isPrimary,
  isEditing,
  editName,
  editColor,
  editValue,
  onEditNameChange,
  onEditColorChange,
  onEditValueChange,
  onStartEditing,
  onUpdate,
  onCancelEdit,
  onMakePrimary,
  onDelete,
}: SortableDispositionRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
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
      className={`grid grid-cols-12 gap-4 p-4 items-center ${
        isPrimary ? "bg-amber-500/5 border-l-4 border-l-amber-500" : "bg-card"
      } ${!disposition.is_active ? "opacity-50" : ""} ${
        isDragging ? "opacity-50 shadow-lg z-50" : ""
      }`}
    >
      {/* Drag Handle - lock icon for primary, dots for others */}
      <div className="col-span-1">
        {isPrimary ? (
          <div className="p-1 flex items-center justify-center">
            <Lock className="w-4 h-4 text-muted-foreground/40" />
          </div>
        ) : (
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Name with Color */}
      <div className="col-span-7">
        {isEditing ? (
          <div className="flex items-center gap-2">
            {/* Color Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
              >
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: editColor }}
                />
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
              
              {dropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 z-50 bg-[#1a1a2e] border border-border rounded-lg shadow-xl py-1 min-w-[200px] max-h-[280px] overflow-y-auto">
                    {/* Make Primary Option - only show for non-primary */}
                    {!isPrimary && (
                      <button
                        onClick={() => {
                          onMakePrimary();
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted text-left transition-colors"
                      >
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>Make primary</span>
                      </button>
                    )}
                    
                    {/* Color Options - one per line */}
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          onEditColorChange(color);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted text-left transition-colors ${
                          editColor === color ? "bg-primary/10 text-primary" : ""
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span>
                          {color === "#22c55e" ? "Green" :
                           color === "#ef4444" ? "Red" :
                           color === "#f59e0b" ? "Amber" :
                           color === "#6b7280" ? "Gray" :
                           color === "#8b5cf6" ? "Purple" :
                           color === "#3b82f6" ? "Blue" :
                           color === "#ec4899" ? "Pink" :
                           color === "#14b8a6" ? "Teal" :
                           color === "#f97316" ? "Orange" :
                           color === "#06b6d4" ? "Cyan" : "Color"}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {isPrimary ? (
              <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
            ) : (
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: disposition.color }}
              />
            )}
            <span className="font-medium">{disposition.name}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="col-span-2">
        {isEditing ? (
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1 text-sm">
            {disposition.value !== null && disposition.value !== undefined ? (
              <>
                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-500 font-medium">
                  {Number(disposition.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/50">—</span>
            )}
          </div>
        )}
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

