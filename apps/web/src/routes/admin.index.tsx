import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderTree, Settings, Users } from "lucide-react";
import { AuthGate } from "../features/auth/auth-gate";

const destinations = [
  { to: "/admin/users" as const, title: "Users", description: "Manage global roles and account suspension.", icon: Users },
  { to: "/admin/categories" as const, title: "Categories and tags", description: "Maintain the shared topic taxonomy.", icon: FolderTree },
  { to: "/admin/settings" as const, title: "Settings", description: "Review identity and deployment configuration.", icon: Settings },
];

function AdminIndexPage() {
  return (
    <AuthGate>
      <main className="shell">
        <header><p className="eyebrow">Administration</p><h1>Community settings</h1><p>Administrative APIs verify your role before returning or changing data.</p></header>
        <div className="admin-destinations">
          {destinations.map(({ to, title, description, icon: Icon }) => (
            <Link className="panel admin-destination" key={to} to={to}>
              <Icon aria-hidden="true" /><div><h2>{title}</h2><p>{description}</p></div>
            </Link>
          ))}
        </div>
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/admin/")({ component: AdminIndexPage });
