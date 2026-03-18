import { useCallback, useEffect, useState } from "react";
import { Download, Filter } from "lucide-react";
import { supabase } from "../../utils/supabase/client";

interface ReportFilters {
  startDate: string;
  endDate: string;
  serviceType: string;
  status: string;
  customer: string;
}

interface ReportSummary {
  totalBookings: number;
  byStatus: Record<string, number>;
  byService: Record<string, number>;
}

interface BookingReportRow {
  bookingId: string;
  serviceType: string;
  customerName: string;
  status: string;
  createdAt: string | null;
}

export function OperationsReports() {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    serviceType: "All",
    status: "All",
    customer: "",
  });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ReportSummary>({ totalBookings: 0, byStatus: {}, byService: {} });
  const [bookings, setBookings] = useState<BookingReportRow[]>([]);

  const serviceTypes = ["All", "Forwarding", "Trucking", "Brokerage", "Marine Insurance", "Others"];
  const statusOptions = ["All", "Draft", "Confirmed", "In Progress", "Pending", "On Hold", "Completed", "Cancelled"];

  const fetchAllBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const normalizedBookings: BookingReportRow[] = (data || []).map((booking: any) => ({
        bookingId: booking.booking_number || booking.id,
        serviceType: booking.service_type || "Unknown",
        customerName: booking.customer_name || "",
        status: booking.status || "Draft",
        createdAt: booking.created_at || booking.updated_at || null,
      }));

      const startDate = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
      const endDate = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`) : null;

      const filtered = normalizedBookings.filter((booking) => {
        const createdDate = booking.createdAt ? new Date(booking.createdAt) : null;
        const matchesDate =
          !createdDate ||
          ((!startDate || createdDate >= startDate) && (!endDate || createdDate <= endDate));
        const matchesService = filters.serviceType === "All" || booking.serviceType === filters.serviceType;
        const matchesStatus = filters.status === "All" || booking.status === filters.status;
        const matchesCustomer =
          !filters.customer ||
          booking.customerName.toLowerCase().includes(filters.customer.toLowerCase());

        return matchesDate && matchesService && matchesStatus && matchesCustomer;
      });

      const byStatus: Record<string, number> = {};
      const byService: Record<string, number> = {};

      filtered.forEach((booking) => {
        byStatus[booking.status] = (byStatus[booking.status] || 0) + 1;
        byService[booking.serviceType] = (byService[booking.serviceType] || 0) + 1;
      });

      setBookings(filtered);
      setSummary({ totalBookings: filtered.length, byStatus, byService });
    } catch (error) {
      console.error("Error fetching bookings for report:", error);
      setBookings([]);
      setSummary({ totalBookings: 0, byStatus: {}, byService: {} });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAllBookings();
  }, [fetchAllBookings]);

  const handleExportCSV = () => {
    const headers = ["Booking ID", "Service Type", "Customer", "Status", "Created Date"];
    const rows = bookings.map((booking) => [
      booking.bookingId,
      booking.serviceType,
      booking.customerName || "",
      booking.status,
      booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `operations-report-${new Date().toISOString().split("T")[0]}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <div style={{ padding: "32px 48px 24px 48px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 600,
              color: "#12332B",
              marginBottom: "4px",
              letterSpacing: "-1.2px",
            }}
          >
            Reports
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#667085",
            }}
          >
            Generate reports and analytics across all operational services
          </p>
        </div>
      </div>

      <div style={{ padding: "0 48px 48px 48px" }}>
        <div
          style={{
            backgroundColor: "var(--neuron-bg-elevated)",
            border: "1px solid var(--neuron-ui-border)",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Filter size={20} style={{ color: "var(--neuron-brand-green)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--neuron-ink-primary)", margin: 0 }}>
              Filters
            </h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
                style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
                style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>
                Service Type
              </label>
              <select
                value={filters.serviceType}
                onChange={(event) => setFilters({ ...filters, serviceType: event.target.value })}
                style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", cursor: "pointer" }}
              >
                {serviceTypes.map((serviceType) => (
                  <option key={serviceType} value={serviceType}>
                    {serviceType}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--neuron-ink-muted)", marginBottom: "6px" }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                style={{ width: "100%", height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none", cursor: "pointer" }}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <input
              type="text"
              placeholder="Filter by customer name..."
              value={filters.customer}
              onChange={(event) => setFilters({ ...filters, customer: event.target.value })}
              style={{ flex: 1, height: "40px", padding: "0 12px", fontSize: "14px", color: "var(--neuron-ink-primary)", backgroundColor: "var(--neuron-bg-page)", border: "1px solid var(--neuron-ui-border)", borderRadius: "8px", outline: "none" }}
            />
            <button
              onClick={fetchAllBookings}
              style={{ height: "40px", paddingLeft: "20px", paddingRight: "20px", fontSize: "14px", fontWeight: 600, color: "white", backgroundColor: "var(--neuron-brand-green)", border: "none", borderRadius: "8px", cursor: "pointer" }}
            >
              Apply Filters
            </button>
            <button
              onClick={handleExportCSV}
              disabled={bookings.length === 0}
              style={{ height: "40px", paddingLeft: "20px", paddingRight: "20px", fontSize: "14px", fontWeight: 600, color: "var(--neuron-brand-green)", backgroundColor: "var(--neuron-state-selected)", border: "1px solid var(--neuron-brand-green)", borderRadius: "8px", cursor: bookings.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", padding: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--neuron-ink-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Bookings
            </div>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--neuron-brand-green)" }}>{summary.totalBookings}</div>
          </div>
          <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", padding: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--neuron-ink-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              By Status
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {Object.entries(summary.byStatus).map(([status, count]) => (
                <div key={status} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--neuron-ink-secondary)" }}>
                  <span>{status}</span>
                  <span style={{ fontWeight: 600, color: "var(--neuron-ink-primary)" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", padding: "24px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--neuron-ink-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              By Service
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {Object.entries(summary.byService).map(([service, count]) => (
                <div key={service} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--neuron-ink-secondary)" }}>
                  <span>{service}</span>
                  <span style={{ fontWeight: 600, color: "var(--neuron-ink-primary)" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "var(--neuron-bg-elevated)", border: "1px solid var(--neuron-ui-border)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--neuron-ui-border)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--neuron-ink-primary)", margin: 0 }}>Bookings Report</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--neuron-bg-page)" }}>
                  {["BOOKING ID", "SERVICE TYPE", "CUSTOMER", "STATUS", "CREATED DATE"].map((header) => (
                    <th key={header} style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "var(--neuron-ink-muted)", borderBottom: "1px solid var(--neuron-ui-border)" }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>
                      Loading report data...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "var(--neuron-ink-muted)" }}>
                      No bookings match your filters
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.bookingId} style={{ transition: "background-color 0.15s" }} onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = "var(--neuron-state-hover)"; }} onMouseLeave={(event) => { event.currentTarget.style.backgroundColor = "transparent"; }}>
                      <td style={{ padding: "16px", fontSize: "14px", fontWeight: 600, color: "var(--neuron-brand-green)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{booking.bookingId}</td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{booking.serviceType}</td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "var(--neuron-ink-primary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{booking.customerName || "-"}</td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "var(--neuron-ink-secondary)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{booking.status}</td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "var(--neuron-ink-muted)", borderBottom: "1px solid var(--neuron-ui-border)" }}>{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
