import React, { useEffect, useState } from "react";
import { getBillingDetailsApi, updateBillingDetailsApi } from "../../services/billingService";

const FIELDS = [
  ["legalName", "Legal / company name", "Acme Pvt Ltd"],
  ["address", "Billing address", "Street, city, postal code"],
  ["country", "Country", "India"],
  ["state", "State / region", "Maharashtra"],
  ["taxId", "GSTIN / VAT number (optional)", "27AAPFU0939F1ZV"],
];

// Buyer details printed on tax invoices. Editable by the owner and admins.
export default function BillingDetailsForm({ canEdit }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getBillingDetailsApi()
      .then((res) => setForm({ legalName: "", address: "", country: "", state: "", taxId: "", ...res.data.billingDetails }))
      .catch(() => setForm({ legalName: "", address: "", country: "", state: "", taxId: "" }));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await updateBillingDetailsApi(form);
      setForm({ ...form, ...res.data.billingDetails });
      setMessage("Saved. New invoices will use these details.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not save billing details.");
    }
    setSaving(false);
  };

  if (!form) return null;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-1">Billing details</h3>
      <p className="text-sm text-gray-500 mb-5">Printed on your invoices. Add your GSTIN to claim input tax credit.</p>
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(([key, label, placeholder]) => (
          <label key={key} className={`block text-xs font-medium text-gray-600 ${key === "address" ? "md:col-span-2" : ""}`}>
            {label}
            <input
              type="text"
              value={form[key] || ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={placeholder}
              disabled={!canEdit}
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </label>
        ))}
        {canEdit && (
          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save billing details"}
            </button>
            {message && <span className="text-sm text-gray-600">{message}</span>}
          </div>
        )}
      </form>
    </section>
  );
}
