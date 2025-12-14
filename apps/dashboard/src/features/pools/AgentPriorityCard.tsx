"use client";

import { ChevronDown, X } from "lucide-react";

/**
 * Pool member data with agent profile
 */
export interface PoolMember {
  id: string;
  agent_profile_id: string;
  priority_rank: number; // 1 = Primary (highest priority), 2+ = overflow/backup
  agent_profiles: {
    id: string;
    display_name: string;
  };
}

/**
 * AgentPriorityCard - Tier assignment UI for agents in a pool
 *
 * Displays an agent with their priority tier and allows changing tier level.
 * Priority tiers determine routing order (lower rank = higher priority):
 * - 1: Primary (🥇) - Receives calls first
 * - 2: Standard (🥈) - Overflow when primary is busy
 * - 3: Backup (🥉) - Last resort when others are busy
 *
 * @param member - Pool member data including agent profile and priority
 * @param poolId - Pool ID for updating membership
 * @param onUpdatePriority - Callback when priority tier changes
 * @param onRemove - Callback when removing agent from pool
 */
export function AgentPriorityCard({
  member,
  poolId,
  onUpdatePriority,
  onRemove,
}: {
  member: PoolMember;
  poolId: string;
  onUpdatePriority: (poolId: string, memberId: string, priority: number) => void;
  onRemove: (poolId: string, memberId: string) => void;
}) {
  const currentPriority = member.priority_rank || 1;

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-background border border-border group hover:border-primary/30 transition-colors"
      data-testid="agent-priority-card"
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium"
        data-testid="agent-avatar"
      >
        {member.agent_profiles?.display_name?.charAt(0).toUpperCase() || "?"}
      </div>

      {/* Name */}
      <span className="text-sm font-medium" data-testid="agent-name">
        {member.agent_profiles?.display_name || "Unnamed Agent"}
      </span>

      {/* Priority Selector - Clear dropdown with label */}
      <div className="relative">
        <select
          value={currentPriority}
          onChange={(e) => onUpdatePriority(poolId, member.id, parseInt(e.target.value))}
          className={`text-xs pl-2 pr-6 py-1 rounded-lg font-semibold cursor-pointer border outline-none appearance-none transition-colors ${
            currentPriority === 1
              ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 hover:border-green-500/50"
              : currentPriority === 2
                ? "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:border-blue-500/50"
                : "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30 hover:border-orange-500/50"
          }`}
          title="Change when this agent receives leads"
          data-testid="priority-select"
        >
          <option value={1}>🥇 Primary</option>
          <option value={2}>🥈 Standard</option>
          <option value={3}>🥉 Backup</option>
        </select>
        <ChevronDown
          className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
          data-testid="chevron-icon"
        />
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(poolId, member.id)}
        className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
        title="Remove from pool"
        data-testid="remove-button"
      >
        <X className="w-3.5 h-3.5" data-testid="x-icon" />
      </button>
    </div>
  );
}





