import { redirect } from "next/navigation";

// Redirect-only entry; allow request-time navigation under Cache Components.
export const instant = false;

export default function Home() {
  redirect("/dashboard");
}
