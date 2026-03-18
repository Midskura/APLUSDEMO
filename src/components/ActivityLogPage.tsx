import { useEffect, useRef, useState } from "react";
import { Activity, Download, ExternalLink, Filter, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { useUser } from "../hooks/useUser";
import { supabase } from "../utils/supabase/client";
import { CustomDropdown } from "./bd/CustomDropdown";

interface RawActivityRow {
  id: string;
  type: string;
  description: string | null;
  date: string | null;
  contact_id: string | null;
  customer_id: string | null;
  task_id: string | null;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface UserLookup {
  id: string;
  name: string;
  department?: string | null;
}

interface ActivityLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action_type: string;
  user_id: string;
  user_name: string;
  user_department: string;
  old_value: string | null;
  new_value: string | null;
  metadata: {
    description?: string;
  };
  timestamp: string;
}

const ENTITY_FILTER_OPTIONS = [
  { value: "all", label: "All Entity Types" },
  { value: "contact", label: "Contacts" },
  { value: "customer", label: "Customers" },
  { value: "task", label: "Tasks" },
  { value: "activity", label: "General" },
];

const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "call_logged", label: "Call Logged" },
  { value: "email_logged", label: "Email Logged" },
  { value: "meeting_logged", label: "Meeting Logged" },
  { value: "note", label: "Note" },
  { value: "system_update", label: "System Update" },
];

const DEPARTMENT_FILTER_OPTIONS = [
  { value: "all", label: "All Departments" },
  { value: "Executive", label: "Executive" },
  { value: "Business Development", label: "Business Development" },
  { value: "Pricing", label: "Pricing" },
  { value: "Operations", label: "Operations" },
  { value: "Accounting", label: "Accounting" },
  { value: "HR", label: "HR" },
];

function normalizeActivityType(type: string | null | undefined): string {
  if (!type) return "activity";

  return type
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatActionLabel(actionType: string): string {
  switch (actionType) {
    case "call_logged":
      return "Call logged";
    case "email_logged":
      return "Email logged";
    case "meeting_logged":
      return "Meeting logged";
    case "note":
      return "Note added";
    case "system_update":
      return "System update";
    default:
      return actionType.replace(/_/g, " ");
  }
}

function buildActivityEntry(row: RawActivityRow, userMap: Map<string, UserLookup>): ActivityLogEntry {
  let entityType = "activity";
  let entityId = row.id;

  if (row.task_id) {
    entityType = "task";
    entityId = row.task_id;
  } else if (row.customer_id) {
    entityType = "customer";
    entityId = row.customer_id;
  } else if (row.contact_id) {
    entityType = "contact";
    entityId = row.contact_id;
  }

  const userInfo = row.user_id ? userMap.get(row.user_id) : null;
  const timestamp = row.date || row.updated_at || row.created_at || new Date().toISOString();
  const description = row.description?.trim() || "";

  return {
    id: row.id,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: description || entityId,
    action_type: normalizeActivityType(row.type),
    user_id: row.user_id || "",
    user_name: userInfo?.name || "Unknown User",
    user_department: userInfo?.department || "Unknown",
    old_value: null,
    new_value: null,
    metadata: {
      description,
    },
    timestamp,
  };
}

export function ActivityLogPage() {
  const { effectiveDepartment, effectiveRole } = useUser();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewActivities, setHasNewActivities] = useState(false);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState(
    effectiveDepartment === "Executive" ? "all" : effectiveDepartment
  );
  const [userFilter, setUserFilter] = useState("");
  const [usersInDepartment, setUsersInDepartment] = useState<Array<{ id: string; name: string }>>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setHours(date.getHours() - 24);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const intervalRef = useRef<number | null>(null);
  const latestTimestampRef = useRef<string | null>(null);

  const actualRole = effectiveDepartment === "Executive" ? "director" : effectiveRole;
  const hasAccess = actualRole === "director" || actualRole === "manager";

  useEffect(() => {
    if (actualRole === "manager") {
      void fetchUsersInDepartment(effectiveDepartment);
    } else if (departmentFilter !== "all") {
      void fetchUsersInDepartment(departmentFilter);
    } else {
      setUsersInDepartment([]);
      setUserFilter("");
    }
  }, [actualRole, departmentFilter, effectiveDepartment]);

  useEffect(() => {
    if (!hasAccess) return;

    void loadActivities();

    intervalRef.current = window.setInterval(() => {
      void checkForNewActivities();
    }, 45000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [hasAccess, entityTypeFilter, actionTypeFilter, departmentFilter, userFilter, dateFrom, dateTo]);

  const fetchUsersInDepartment = async (department: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name")
        .eq("department", department)
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      setUsersInDepartment(data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsersInDepartment([]);
    }
  };

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("crm_activities")
        .select("*")
        .order("date", { ascending: false })
        .limit(100);

      if (dateFrom) {
        query = query.gte("date", `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte("date", `${dateTo}T23:59:59.999`);
      }
      if (userFilter) {
        query = query.eq("user_id", userFilter);
      }

      const [{ data: activityRows, error: activityError }, { data: users, error: usersError }] =
        await Promise.all([
          query,
          supabase.from("users").select("id, name, department"),
        ]);

      if (activityError) {
        throw activityError;
      }
      if (usersError) {
        throw usersError;
      }

      const userMap = new Map<string, UserLookup>((users || []).map((user: any) => [user.id, user]));
      let normalizedActivities = (activityRows as RawActivityRow[] | null || []).map((row) =>
        buildActivityEntry(row, userMap)
      );

      if (departmentFilter !== "all") {
        normalizedActivities = normalizedActivities.filter(
          (activity) => activity.user_department === departmentFilter
        );
      }
      if (entityTypeFilter !== "all") {
        normalizedActivities = normalizedActivities.filter(
          (activity) => activity.entity_type === entityTypeFilter
        );
      }
      if (actionTypeFilter !== "all") {
        normalizedActivities = normalizedActivities.filter(
          (activity) => activity.action_type === actionTypeFilter
        );
      }

      normalizedActivities.sort(
        (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
      );

      setActivities(normalizedActivities);
      latestTimestampRef.current = normalizedActivities[0]?.timestamp || null;
      setHasNewActivities(false);
      setNewActivityCount(0);
    } catch (error) {
      console.error("Failed to load activities:", error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForNewActivities = async () => {
    if (!latestTimestampRef.current) return;

    try {
      const { data, error } = await supabase
        .from("crm_activities")
        .select("*")
        .gt("date", latestTimestampRef.current)
        .order("date", { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      const rows = (data as RawActivityRow[] | null) || [];
      const filteredRows = rows.filter((row) => {
        const actionType = normalizeActivityType(row.type);
        const entityType = row.task_id ? "task" : row.customer_id ? "customer" : row.contact_id ? "contact" : "activity";

        if (entityTypeFilter !== "all" && entityType !== entityTypeFilter) return false;
        if (actionTypeFilter !== "all" && actionType !== actionTypeFilter) return false;
        if (userFilter && row.user_id !== userFilter) return false;
        return true;
      });

      if (filteredRows.length > 0) {
        setHasNewActivities(true);
        setNewActivityCount(filteredRows.length);
      }
    } catch (error) {
      console.error("Failed to check for new activities:", error);
    }
  };

  const getFilteredActivities = () => {
    if (!searchTerm) return activities;

    const query = searchTerm.toLowerCase();
    return activities.filter((activity) =>
      activity.entity_id.toLowerCase().includes(query) ||
      activity.entity_name.toLowerCase().includes(query) ||
      activity.user_name.toLowerCase().includes(query) ||
      activity.action_type.toLowerCase().includes(query) ||
      (activity.metadata.description || "").toLowerCase().includes(query)
    );
  };

  const handleExportCSV = () => {
    const filteredActivities = getFilteredActivities();
    const headers = ["Timestamp", "User", "Department", "Entity Type", "Entity ID", "Entity Name", "Action"];
    const rows = filteredActivities.map((activity) => [
      new Date(activity.timestamp).toLocaleString(),
      activity.user_name,
      activity.user_department,
      activity.entity_type,
      activity.entity_id,
      activity.entity_name,
      formatActivityAction(activity),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `activity-log-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatActivityAction = (activity: ActivityLogEntry) => {
    return activity.metadata.description || formatActionLabel(activity.action_type);
  };

  const getEntityBadgeColor = (entityType: string) => {
    switch (entityType) {
      case "contact":
        return { bg: "#EEF2FF", color: "#4F46E5", border: "#4F46E5" };
      case "customer":
        return { bg: "#E8F5F0", color: "#0F766E", border: "#0F766E" };
      case "task":
        return { bg: "#FEF0E6", color: "#E87A3D", border: "#E87A3D" };
      default:
        return { bg: "#F3F4F6", color: "#6B7280", border: "#6B7280" };
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  const handleEntityClick = (activity: ActivityLogEntry) => {
    if (activity.entity_type === "contact") {
      navigate(effectiveDepartment === "Pricing" ? "/pricing/contacts" : "/bd/contacts");
      return;
    }

    if (activity.entity_type === "customer") {
      if (effectiveDepartment === "Accounting") {
        navigate("/accounting/customers");
      } else {
        navigate(effectiveDepartment === "Pricing" ? "/pricing/customers" : "/bd/customers");
      }
      return;
    }

    if (activity.entity_type === "task") {
      navigate("/bd/tasks");
    }
  };

  if (!hasAccess) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: "#FEFEFE" }}>
        <div className="text-center" style={{ maxWidth: "400px" }}>
          <Activity size={48} style={{ color: "#E87A3D", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#12332B", marginBottom: "8px" }}>
            Access Denied
          </h2>
          <p style={{ fontSize: "14px", color: "#667085", lineHeight: "1.5" }}>
            The Activity Log is only available for Managers and Executives. This module provides system-wide visibility and audit trails.
          </p>
        </div>
      </div>
    );
  }

  const filteredActivities = getFilteredActivities();

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#FEFEFE" }}>
      <div className="px-12 py-8 border-b" style={{ borderColor: "var(--neuron-ui-border)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Activity size={24} style={{ color: "#0F766E" }} />
            <h1 style={{ fontSize: "28px", fontWeight: 600, color: "#12332B" }}>
              Activity Log
            </h1>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                background: actualRole === "director" ? "#FEEAEA" : "#E8F5F0",
                color: actualRole === "director" ? "#E35858" : "#0F766E",
                border: `1px solid ${actualRole === "director" ? "#E35858" : "#0F766E"}`,
              }}
            >
              {actualRole === "director" ? "EXECUTIVE" : "MANAGER"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasNewActivities && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "#FEF0E6",
                  border: "1px solid #E87A3D",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#E87A3D",
                }}
              >
                <Activity size={14} />
                {newActivityCount} new {newActivityCount === 1 ? "activity" : "activities"}
              </div>
            )}

            <button
              onClick={() => void loadActivities()}
              className="px-4 py-2 rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: "#FFFFFF",
                color: "#0F766E",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid var(--neuron-ui-border)",
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: "#0F766E",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
              }}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
        <p style={{ fontSize: "14px", color: "#667085" }}>
          {actualRole === "director"
            ? "System-wide activity log with full visibility across all departments"
            : `Activity log for ${effectiveDepartment} department`}
        </p>
      </div>

      <div className="px-12 py-6 border-b" style={{ borderColor: "var(--neuron-ui-border)", backgroundColor: "#FFFFFF" }}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter size={16} style={{ color: "#667085" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#12332B" }}>Filters:</span>
            </div>

            <div style={{ minWidth: "160px" }}>
              <CustomDropdown label="" value={entityTypeFilter} onChange={setEntityTypeFilter} options={ENTITY_FILTER_OPTIONS} />
            </div>

            <div style={{ minWidth: "160px" }}>
              <CustomDropdown label="" value={actionTypeFilter} onChange={setActionTypeFilter} options={ACTION_FILTER_OPTIONS} />
            </div>

            {actualRole === "director" && (
              <div style={{ minWidth: "180px" }}>
                <CustomDropdown
                  label=""
                  value={departmentFilter}
                  onChange={(value) => {
                    setDepartmentFilter(value);
                    setUserFilter("");
                  }}
                  options={DEPARTMENT_FILTER_OPTIONS}
                />
              </div>
            )}

            {(departmentFilter !== "all" || actualRole === "manager") && (
              <div style={{ minWidth: "150px" }}>
                <CustomDropdown
                  label=""
                  value={userFilter}
                  onChange={setUserFilter}
                  options={[
                    { value: "", label: "All Users" },
                    ...usersInDepartment.map((user) => ({ value: user.id, label: user.name })),
                  ]}
                  disabled={usersInDepartment.length === 0}
                />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search by entity ID, description, or user..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full px-3.5 py-2 rounded-lg text-sm"
              style={{
                border: "1px solid var(--neuron-ui-border)",
                backgroundColor: "#FFFFFF",
                color: "#12332B",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-12 py-6">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "64px", color: "#667085" }}>Loading activities...</div>
        ) : filteredActivities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px", color: "#667085" }}>
            <Activity size={48} style={{ color: "#D1D5DB", margin: "0 auto 16px" }} />
            <p style={{ fontSize: "16px", fontWeight: 500 }}>No activities found</p>
            <p style={{ fontSize: "14px", marginTop: "8px" }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div
            style={{
              border: "1px solid var(--neuron-ui-border)",
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div
              className="grid grid-cols-12 gap-4 px-6 py-3 border-b"
              style={{
                borderColor: "var(--neuron-ui-border)",
                backgroundColor: "#F9FAFB",
              }}
            >
              <div className="col-span-2" style={{ fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>
                Time
              </div>
              <div className="col-span-2" style={{ fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>
                User
              </div>
              <div className="col-span-1" style={{ fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>
                Type
              </div>
              <div className="col-span-2" style={{ fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>
                Entity
              </div>
              <div className="col-span-4" style={{ fontSize: "12px", fontWeight: 600, color: "#667085", textTransform: "uppercase" }}>
                Action
              </div>
              <div className="col-span-1"></div>
            </div>

            {filteredActivities.map((activity, index) => {
              const badgeColors = getEntityBadgeColor(activity.entity_type);

              return (
                <div
                  key={activity.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 border-b hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{
                    borderColor: index === filteredActivities.length - 1 ? "transparent" : "var(--neuron-ui-border)",
                  }}
                  onClick={() => handleEntityClick(activity)}
                >
                  <div className="col-span-2 flex flex-col">
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#12332B" }}>
                      {getRelativeTime(activity.timestamp)}
                    </span>
                    <span style={{ fontSize: "11px", color: "#9CA3AF" }}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="col-span-2 flex flex-col">
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#12332B" }}>
                      {activity.user_name}
                    </span>
                    <span style={{ fontSize: "11px", color: "#667085" }}>
                      {activity.user_department}
                    </span>
                  </div>

                  <div className="col-span-1 flex items-center">
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: badgeColors.bg,
                        color: badgeColors.color,
                        border: `1px solid ${badgeColors.border}`,
                        textTransform: "uppercase",
                      }}
                    >
                      {activity.entity_type}
                    </span>
                  </div>

                  <div className="col-span-2 flex flex-col">
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F766E", fontFamily: "monospace" }}>
                      {activity.entity_id}
                    </span>
                    <span style={{ fontSize: "12px", color: "#667085", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {activity.entity_name}
                    </span>
                  </div>

                  <div className="col-span-4 flex items-center">
                    <span style={{ fontSize: "13px", color: "#374151" }}>{formatActivityAction(activity)}</span>
                  </div>

                  <div className="col-span-1 flex items-center justify-end">
                    <ExternalLink size={14} style={{ color: "#9CA3AF" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
