import React, { useEffect, useState } from "react";
import { getBillingDetailsApi, updateBillingDetailsApi } from "../../services/billingService";
import { toast, toastError } from "../../utils/toast";
import { Button, Field, Input, Section } from "../kc";

const EMPTY = { legalName: "", address: "", country: "", state: "", taxId: "" };
const FIELDS = [
  ["legalName", "Legal or company name", "Acme Pvt Ltd"],
  ["address", "Billing address", "Street, city, postal code"],
  ["country", "Country", "India"],
  ["state", "State or region", "Maharashtra"],
  ["taxId", "GSTIN or VAT number (optional)", "27AAPFU0939F1ZV"],
];

// Buyer details printed on tax invoices. Editable by the owner and admins.
export default function BillingDetailsForm({ canEdit }) {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBillingDetailsApi()
      .then((res) => ({ ...EMPTY, ...res.data.billingDetails }))
      .catch(() => ({ ...EMPTY }))
      .then((data) => { setSaved(data); setForm(data); });
  }, []);

  const dirty = form && saved && FIELDS.some(([key]) => (form[key] || "") !== (saved[key] || ""));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateBillingDetailsApi(form);
      const next = { ...form, ...res.data.billingDetails };
      setSaved(next);
      setForm(next);
      toast.success("Billing details saved. New invoices use them.");
    } catch (err) {
      toastError(err, "Could not save the billing details.");
    }
    setSaving(false);
  };

  if (!form) return null;

  return (
    <form onSubmit={handleSave}>
      <Section
        title="Billing details"
        description={canEdit ? "Printed on your invoices. Add your GSTIN or VAT number to claim input tax credit." : "Printed on your invoices. Owners and admins can change them."}
        footer={canEdit ? (
          <>
            <Button disabled={!dirty || saving} onClick={() => setForm(saved)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>Save changes</Button>
          </>
        ) : null}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map(([key, label, placeholder]) => (
            <div key={key} className={key === "address" ? "md:col-span-2" : ""}>
              <Field id={`billing-${key}`} label={label}>
                <Input
                  id={`billing-${key}`}
                  value={form[key] || ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  disabled={!canEdit}
                />
              </Field>
            </div>
          ))}
        </div>
      </Section>
    </form>
  );
}
