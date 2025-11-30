import { redirect } from "next/navigation";

// Redirect old call-logs page to combined calls page
export default function CallLogsPage() {
  redirect("/dashboard/calls");
}
