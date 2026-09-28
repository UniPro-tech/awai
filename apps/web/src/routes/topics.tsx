import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/topics")({ component: Outlet });
