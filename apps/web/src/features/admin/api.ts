import type {
  AdminAuditLogQuery,
  UpdateAdminUserRequest,
} from "@private-polis/contracts";
import { api, toApiError } from "../../lib/api";

export async function listAdminUsers() {
  const response = await api.api.v1.admin.users.$get();
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function updateAdminUser(userId: string, input: UpdateAdminUserRequest) {
  const response = await api.api.v1.admin.users[":userId"].$patch({
    param: { userId },
    json: input,
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function listAuditLogs(query: AdminAuditLogQuery) {
  const response = await api.api.v1.admin["audit-logs"].$get({
    query: {
      action: query.action,
      page: String(query.page),
      pageSize: String(query.pageSize),
    },
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}
