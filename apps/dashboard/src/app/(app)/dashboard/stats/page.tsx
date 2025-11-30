import { redirect } from "next/navigation";

// Redirect old stats page to combined calls page
export default function StatsPage() {
  redirect("/dashboard/calls");
}
