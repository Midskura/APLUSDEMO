import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";
import { supabase } from "../../utils/supabase/client";
import { toast } from "../ui/toast-utils";

type ServiceType = "Brokerage" | "Trucking" | "Forwarding" | "Marine Insurance" | "Others";

interface CatalogItemRow {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  service_types: string[];
  default_price: number;
  currency: string;
  unit_type: string | null;
  tax_code: string | null;
  is_active: boolean;
  sort_order: number;
}

interface CatalogCategory {
  id: string;
  name: string;
}

interface CatalogFormState {
  name: string;
  description: string;
  category_id: string;
  service_types: string[];
  default_price: string;
  currency: string;
  unit_type: string;
  tax_code: string;
}

const SERVICE_TYPES: ServiceType[] = ["Brokerage", "Trucking", "Forwarding", "Marine Insurance", "Others"];
const UNIT_OPTIONS = [
  { value: "flat_fee", label: "Flat Fee" },
  { value: "per_shipment", label: "Per Shipment" },
  { value: "per_container", label: "Per Container" },
  { value: "per_cbm", label: "Per CBM" },
  { value: "per_kg", label: "Per KG" },
  { value: "per_bl", label: "Per B/L" },
  { value: "per_set", label: "Per Set" },
];
const TAX_OPTIONS = [
  { value: "", label: "None" },
  { value: "VAT", label: "VAT" },
  { value: "NVAT", label: "NVAT" },
  { value: "ZR", label: "ZR" },
];

const panelStyle = {
  backgroundColor: "white",
  border: "1px solid #E0E6E4",
  borderRadius: "8px",
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: "13px",
  border: "1px solid #D0D5DD",
  borderRadius: "6px",
  color: "#2C3E38",
  outline: "none",
  backgroundColor: "white",
};

const labelStyle = {
  display: "block",
  marginBottom: "4px",
  fontSize: "11px",
  color: "#667085",
};

function createEmptyForm(): CatalogFormState {
  return {
    name: "",
    description: "",
    category_id: "",
    service_types: [],
    default_price: "0",
    currency: "PHP",
    unit_type: "flat_fee",
    tax_code: "VAT",
  };
}

function normalizeItem(row: any): CatalogItemRow {
  return {
    id: String(row.id),
    name: row.name ?? "",
    description: row.description ?? null,
    category_id: row.category_id ?? null,
    service_types: Array.isArray(row.service_types) ? row.service_types.filter(Boolean) : [],
    default_price: Number(row.default_price ?? 0),
    currency: row.currency ?? "PHP",
    unit_type: row.unit_type ?? null,
    tax_code: row.tax_code ?? null,
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
  };
}

function toForm(item: CatalogItemRow): CatalogFormState {
  return {
    name: item.name,
    description: item.description ?? "",
    category_id: item.category_id ?? "",
    service_types: [...item.service_types],
    default_price: String(item.default_price),
    currency: item.currency || "PHP",
    unit_type: item.unit_type || "flat_fee",
    tax_code: item.tax_code || "",
  };
}

function buildPayload(form: CatalogFormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    category_id: form.category_id || null,
    service_types: form.service_types,
    default_price: Number(form.default_price || 0),
    currency: form.currency || "PHP",
    unit_type: form.unit_type || null,
    tax_code: form.tax_code || null,
  };
}

function toggleServiceType(current: string[], serviceType: string) {
  return current.includes(serviceType)
    ? current.filter((value) => value !== serviceType)
    : [...current, serviceType];
}

function formatUnitType(unitType: string | null) {
  return UNIT_OPTIONS.find((option) => option.value === unitType)?.label || "Custom";
}

function formatPrice(amount: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function CatalogManagementPage() {
  const [items, setItems] = useState<CatalogItemRow[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterServiceType, setFilterServiceType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogFormState>(createEmptyForm());

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const fetchData = useCallback(async () => {
    try {
      const [{ data: itemRows, error: itemsError }, { data: categoryRows, error: categoriesError }] = await Promise.all([
        supabase.from("catalog_items").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
        supabase.from("catalog_categories").select("id, name").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      ]);

      if (itemsError) {
        toast.error(itemsError.message || "Error fetching catalog items");
        return;
      }

      if (categoriesError) {
        toast.error(categoriesError.message || "Error fetching categories");
        return;
      }

      setItems((itemRows || []).map(normalizeItem));
      setCategories((categoryRows || []).map((category: any) => ({ id: String(category.id), name: category.name ?? "" })));
    } catch (err) {
      console.error("Error fetching catalog data:", err);
      toast.error("Error fetching catalog data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (filterStatus === "active" && !item.is_active) return false;
        if (filterStatus === "inactive" && item.is_active) return false;
        if (filterCategory !== "all" && item.category_id !== filterCategory) return false;
        if (filterServiceType !== "all" && !item.service_types.includes(filterServiceType)) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const categoryName = categoryById[item.category_id || ""]?.toLowerCase() || "";
          return (
            item.name.toLowerCase().includes(query) ||
            (item.description || "").toLowerCase().includes(query) ||
            categoryName.includes(query)
          );
        }

        return true;
      })
      .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
  }, [items, filterCategory, filterServiceType, filterStatus, searchQuery, categoryById]);

  const openAddForm = () => {
    setFormMode("add");
    setEditingId(null);
    setForm(createEmptyForm());
  };

  const openEditForm = (item: CatalogItemRow) => {
    setFormMode("edit");
    setEditingId(item.id);
    setForm(toForm(item));
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setForm(createEmptyForm());
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      if (formMode === "add") {
        const { error } = await supabase.from("catalog_items").insert({
          id: `ci-${Date.now()}`,
          ...buildPayload(form),
          is_active: true,
          sort_order: items.length + 1,
        });
        if (error) {
          toast.error(error.message || "Error creating item");
          return;
        }
        toast.success(`Created "${form.name.trim()}"`);
      } else if (formMode === "edit" && editingId) {
        const { error } = await supabase.from("catalog_items").update(buildPayload(form)).eq("id", editingId);
        if (error) {
          toast.error(error.message || "Error updating item");
          return;
        }
        toast.success("Item updated");
      }

      closeForm();
      await fetchData();
    } catch (err) {
      console.error("Error saving catalog item:", err);
      toast.error("Error saving catalog item");
    }
  };

  const setItemActiveState = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from("catalog_items").update({ is_active: isActive }).eq("id", id);
    if (error) {
      toast.error(error.message || `Error ${isActive ? "reactivating" : "deactivating"} item`);
      return;
    }
    toast.success(isActive ? "Item reactivated" : "Item deactivated");
    await fetchData();
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      toast.success("Catalog seeding should be done via SQL migrations or Supabase dashboard.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div style={{ padding: "24px 32px", background: "var(--neuron-bg-page, #F8FAF9)", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#12332B", marginBottom: "4px" }}>Expense & Charge Catalog</h1>
          <p style={{ fontSize: "13px", color: "#667085" }}>Manage standard financial line items used across bookings.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleSeed} disabled={isSeeding} style={{ ...inputStyle, width: "auto", cursor: isSeeding ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Database size={14} />
            {isSeeding ? "Seeding..." : "Seed Defaults"}
          </button>
          <button onClick={openAddForm} style={{ ...inputStyle, width: "auto", cursor: "pointer", backgroundColor: "#0F766E", color: "white", borderColor: "#0F766E", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={14} />
            Add Item
          </button>
        </div>
      </div>

      <div style={{ ...panelStyle, padding: "16px", marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "320px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#98A2B3" }} />
          <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search items..." style={{ ...inputStyle, paddingLeft: "30px" }} />
        </div>
        <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} style={{ ...inputStyle, width: "180px" }}>
          <option value="all">All Categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select value={filterServiceType} onChange={(event) => setFilterServiceType(event.target.value)} style={{ ...inputStyle, width: "180px" }}>
          <option value="all">All Services</option>
          {SERVICE_TYPES.map((serviceType) => <option key={serviceType} value={serviceType}>{serviceType}</option>)}
        </select>
        <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} style={{ ...inputStyle, width: "120px" }}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: "#98A2B3" }}>{filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}</span>
      </div>

      {formMode && (
        <div style={{ ...panelStyle, padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#12332B", marginBottom: "12px" }}>{formMode === "add" ? "Add Item" : "Edit Item"}</div>
          <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input type="text" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} style={inputStyle}>
                <option value="">Uncategorized</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Unit</label>
              <select value={form.unit_type} onChange={(event) => setForm({ ...form, unit_type: event.target.value })} style={inputStyle}>
                {UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Default Price</label>
              <input type="number" min="0" step="0.01" value={form.default_price} onChange={(event) => setForm({ ...form, default_price: event.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} style={inputStyle}>
                <option value="PHP">PHP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tax</label>
              <select value={form.tax_code} onChange={(event) => setForm({ ...form, tax_code: event.target.value })} style={inputStyle}>
                {TAX_OPTIONS.map((option) => <option key={option.value || "none"} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Service Types</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {SERVICE_TYPES.map((serviceType) => (
                  <label key={serviceType} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#344054", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.service_types.includes(serviceType)} onChange={() => setForm({ ...form, service_types: toggleServiceType(form.service_types, serviceType) })} style={{ accentColor: "#0F766E" }} />
                    {serviceType}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button onClick={closeForm} style={{ ...inputStyle, width: "auto", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSubmit} style={{ ...inputStyle, width: "auto", cursor: "pointer", backgroundColor: "#0F766E", color: "white", borderColor: "#0F766E" }}>{formMode === "add" ? "Create" : "Save"}</button>
          </div>
        </div>
      )}

      <div style={panelStyle}>
        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#98A2B3" }}>Loading catalog...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#98A2B3" }}>No items match your filters.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E0E6E4" }}>
                {["Name", "Category", "Services", "Unit", "Price", "Tax", "Status", "Actions"].map((label) => (
                  <th key={label} style={{ padding: "10px 12px", fontSize: "11px", fontWeight: 600, color: "#667085", textAlign: label === "Price" ? "right" : "left", textTransform: "uppercase", letterSpacing: "0.3px" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #F2F4F7", opacity: item.is_active ? 1 : 0.6 }}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ fontWeight: 500, color: "#12332B" }}>{item.name}</div>
                    {item.description ? <div style={{ marginTop: "4px", fontSize: "12px", color: "#667085" }}>{item.description}</div> : null}
                  </td>
                  <td style={{ padding: "12px", color: "#667085" }}>{categoryById[item.category_id || ""] || "Uncategorized"}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {item.service_types.length ? item.service_types.map((serviceType) => <span key={serviceType} style={{ padding: "2px 6px", borderRadius: "999px", backgroundColor: "#ECFDF3", color: "#027A48", fontSize: "10px", fontWeight: 600 }}>{serviceType}</span>) : <span style={{ color: "#98A2B3" }}>All</span>}
                    </div>
                  </td>
                  <td style={{ padding: "12px" }}>{formatUnitType(item.unit_type)}</td>
                  <td style={{ padding: "12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.default_price, item.currency)}</td>
                  <td style={{ padding: "12px" }}>{item.tax_code || "-"}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ padding: "2px 6px", borderRadius: "999px", backgroundColor: item.is_active ? "#ECFDF3" : "#FEF3F2", color: item.is_active ? "#027A48" : "#B42318", fontSize: "10px", fontWeight: 600 }}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => openEditForm(item)} title="Edit" style={{ ...inputStyle, width: "auto", padding: "6px 8px", cursor: "pointer" }}>
                        <Pencil size={13} />
                      </button>
                      {item.is_active ? (
                        <button onClick={() => setItemActiveState(item.id, false)} title="Deactivate" style={{ ...inputStyle, width: "auto", padding: "6px 8px", cursor: "pointer", color: "#B42318" }}>
                          <X size={13} />
                        </button>
                      ) : (
                        <button onClick={() => setItemActiveState(item.id, true)} title="Reactivate" style={{ ...inputStyle, width: "auto", padding: "6px 8px", cursor: "pointer", color: "#027A48" }}>
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
