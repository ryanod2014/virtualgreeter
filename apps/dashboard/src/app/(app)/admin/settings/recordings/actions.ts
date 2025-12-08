"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface CountAffectedRecordingsParams {
  organizationId: string;
  newRetentionDays: number;
}

export async function countAffectedRecordings(
  params: CountAffectedRecordingsParams
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient();

  try {
    // Calculate cutoff date based on new retention period
    const cutoffDate = new Date();
    if (params.newRetentionDays !== -1) {
      cutoffDate.setDate(cutoffDate.getDate() - params.newRetentionDays);
    } else {
      // If retention is "forever", no recordings will be deleted
      return { count: 0 };
    }

    // Count recordings older than the new retention period
    const { count, error } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", params.organizationId)
      .not("recording_url", "is", null)
      .lt("created_at", cutoffDate.toISOString());

    if (error) {
      console.error("Failed to count affected recordings:", error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0 };
  } catch (err) {
    console.error("Error counting recordings:", err);
    return { count: 0, error: "Failed to count recordings" };
  }
}

interface TriggerRetentionDeletionParams {
  organizationId: string;
  newRetentionDays: number;
  deletedBy: string;
}

export async function triggerRetentionDeletion(
  params: TriggerRetentionDeletionParams
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const supabase = await createClient();

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    if (params.newRetentionDays !== -1) {
      cutoffDate.setDate(cutoffDate.getDate() - params.newRetentionDays);
    } else {
      // If retention is "forever", don't delete anything
      return { success: true, deletedCount: 0 };
    }

    // Update recordings to clear the recording_url (soft delete)
    // The actual file deletion would be handled by a separate background job
    const { data, error } = await supabase
      .from("call_logs")
      .update({
        recording_url: null,
        // Could add a deleted_at timestamp here for audit trail if column exists
      })
      .eq("organization_id", params.organizationId)
      .not("recording_url", "is", null)
      .lt("created_at", cutoffDate.toISOString())
      .select("id");

    if (error) {
      console.error("Failed to delete old recordings:", error);
      return { success: false, deletedCount: 0, error: error.message };
    }

    const deletedCount = data?.length || 0;

    // Log the deletion for audit purposes
    console.log(
      `[Retention Policy] Deleted ${deletedCount} recordings for org ${params.organizationId}`,
      `New retention: ${params.newRetentionDays} days`,
      `Triggered by: ${params.deletedBy}`
    );

    // TODO: In production, you would also:
    // 1. Create an audit log entry in a dedicated audit_logs table
    // 2. Trigger a background job to delete the actual storage files
    // 3. Send notification to admin about the deletion

    revalidatePath("/admin/calls");

    return { success: true, deletedCount };
  } catch (err) {
    console.error("Error triggering deletion:", err);
    return {
      success: false,
      deletedCount: 0,
      error: err instanceof Error ? err.message : "Failed to trigger deletion"
    };
  }
}
