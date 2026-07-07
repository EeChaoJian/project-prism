"use client";

// Onboarding / Company Profile Configuration form.
//
// Captures live business metrics and compiles them into the FinancialState
// consumed by the deterministic engine. Field values are held as strings while
// editing (so inputs can be cleared) and validated into numbers on submit.
// "Use Sample Data" restores the classic Prism Cafe Supplies payroll-crisis
// scenario; "Clear Form" empties everything for a real business profile.

import { useState } from "react";
import {
  initialFinancialState,
  type FinancialState,
  type Invoice,
} from "@/lib/financialState";

interface InvoiceDraft {
  clientName: string;
  amount: string;
  daysOverdue: string;
  collectionProbability: string; // percent, 0–100
  relationshipRisk: Invoice["relationshipRisk"];
}

interface ProfileDraft {
  companyName: string;
  currentCashBalance: string;
  monthlyRevenue: string;
  monthlyPayrollOverhead: string;
  fixedOperatingExpenses: string;
  payrollDueInDays: string;
  scheduledEquipmentSpend: string;
  invoices: InvoiceDraft[];
}

const EMPTY_INVOICE: InvoiceDraft = {
  clientName: "",
  amount: "",
  daysOverdue: "",
  collectionProbability: "50",
  relationshipRisk: "Medium",
};

function draftFromState(state: FinancialState): ProfileDraft {
  return {
    companyName: state.companyName,
    currentCashBalance: String(state.cashBalance),
    monthlyRevenue: String(state.monthlyRevenue),
    monthlyPayrollOverhead: String(state.payrollAmount),
    fixedOperatingExpenses: String(state.monthlyOpex),
    payrollDueInDays: String(state.payrollDueInDays),
    scheduledEquipmentSpend: String(state.equipmentPurchase),
    invoices: state.invoices.map((inv) => ({
      clientName: inv.client,
      amount: String(inv.amount),
      daysOverdue: String(inv.daysOverdue),
      collectionProbability: String(Math.round(inv.collectionProbability * 100)),
      relationshipRisk: inv.relationshipRisk,
    })),
  };
}

const EMPTY_DRAFT: ProfileDraft = {
  companyName: "",
  currentCashBalance: "",
  monthlyRevenue: "",
  monthlyPayrollOverhead: "",
  fixedOperatingExpenses: "",
  payrollDueInDays: "",
  scheduledEquipmentSpend: "",
  invoices: [{ ...EMPTY_INVOICE }],
};

// Parse a required non-negative number, collecting a readable error if invalid.
function parseNumber(
  label: string,
  raw: string,
  errors: string[],
  opts: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = opts;
  const value = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(value)) {
    errors.push(`${label} must be a number.`);
    return 0;
  }
  if (integer && !Number.isInteger(value)) {
    errors.push(`${label} must be a whole number.`);
    return 0;
  }
  if (value < min || value > max) {
    errors.push(`${label} must be between ${min} and ${max}.`);
    return 0;
  }
  return value;
}

const INPUT =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";
const LABEL = "mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500";

interface CompanyOnboardingFormProps {
  initial: FinancialState;
  onSubmit: (state: FinancialState) => void;
}

export default function CompanyOnboardingForm({
  initial,
  onSubmit,
}: CompanyOnboardingFormProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromState(initial));
  const [errors, setErrors] = useState<string[]>([]);

  const setField = (patch: Partial<ProfileDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const setInvoice = (index: number, patch: Partial<InvoiceDraft>) =>
    setDraft((d) => ({
      ...d,
      invoices: d.invoices.map((inv, i) =>
        i === index ? { ...inv, ...patch } : inv
      ),
    }));

  const addInvoice = () =>
    setDraft((d) => ({ ...d, invoices: [...d.invoices, { ...EMPTY_INVOICE }] }));

  const removeInvoice = (index: number) =>
    setDraft((d) => ({
      ...d,
      invoices: d.invoices.filter((_, i) => i !== index),
    }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: string[] = [];

    if (draft.companyName.trim() === "") {
      nextErrors.push("Company name is required.");
    }

    const state: FinancialState = {
      companyName: draft.companyName.trim(),
      cashBalance: parseNumber("Current cash balance", draft.currentCashBalance, nextErrors),
      monthlyRevenue: parseNumber("Monthly revenue", draft.monthlyRevenue, nextErrors),
      payrollAmount: parseNumber("Monthly payroll overhead", draft.monthlyPayrollOverhead, nextErrors),
      monthlyOpex: parseNumber("Fixed operating expenses", draft.fixedOperatingExpenses, nextErrors),
      payrollDueInDays: parseNumber("Payroll due in (days)", draft.payrollDueInDays, nextErrors, { min: 1, max: 365, integer: true }),
      equipmentPurchase: parseNumber("Scheduled equipment spend", draft.scheduledEquipmentSpend, nextErrors),
      invoices: draft.invoices
        .filter((inv) => inv.clientName.trim() !== "" || inv.amount.trim() !== "")
        .map((inv, i): Invoice => ({
          client: inv.clientName.trim() || `Client ${i + 1}`,
          amount: parseNumber(`Invoice ${i + 1} amount`, inv.amount, nextErrors),
          daysOverdue: parseNumber(`Invoice ${i + 1} days overdue`, inv.daysOverdue, nextErrors, { integer: true }),
          collectionProbability:
            parseNumber(`Invoice ${i + 1} collection probability`, inv.collectionProbability, nextErrors, { max: 100 }) / 100,
          relationshipRisk: inv.relationshipRisk,
        })),
    };

    setErrors(nextErrors);
    if (nextErrors.length === 0) onSubmit(state);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all duration-200 sm:p-8"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            Company Profile Configuration
          </h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">
            Enter your live business metrics, or load the sample payroll-crisis
            scenario. Every dashboard figure is computed from these inputs.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(draftFromState(initialFinancialState));
              setErrors([]);
            }}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300"
          >
            Use Sample Data
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft({ ...EMPTY_DRAFT, invoices: [{ ...EMPTY_INVOICE }] });
              setErrors([]);
            }}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300"
          >
            Clear Form
          </button>
        </div>
      </div>

      {/* Company metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="companyName" className={LABEL}>
            Company Name
          </label>
          <input
            id="companyName"
            type="text"
            className={INPUT}
            placeholder="Prism Cafe Supplies"
            value={draft.companyName}
            onChange={(e) => setField({ companyName: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="cash" className={LABEL}>
            Current Cash Balance (RM)
          </label>
          <input
            id="cash"
            type="number"
            min={0}
            className={INPUT}
            placeholder="45000"
            value={draft.currentCashBalance}
            onChange={(e) => setField({ currentCashBalance: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="revenue" className={LABEL}>
            Monthly Revenue (RM)
          </label>
          <input
            id="revenue"
            type="number"
            min={0}
            className={INPUT}
            placeholder="38000"
            value={draft.monthlyRevenue}
            onChange={(e) => setField({ monthlyRevenue: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="payroll" className={LABEL}>
            Monthly Payroll Overhead (RM)
          </label>
          <input
            id="payroll"
            type="number"
            min={0}
            className={INPUT}
            placeholder="15000"
            value={draft.monthlyPayrollOverhead}
            onChange={(e) => setField({ monthlyPayrollOverhead: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="opex" className={LABEL}>
            Fixed Operating Expenses (RM / month)
          </label>
          <input
            id="opex"
            type="number"
            min={0}
            className={INPUT}
            placeholder="5000"
            value={draft.fixedOperatingExpenses}
            onChange={(e) => setField({ fixedOperatingExpenses: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="dueDays" className={LABEL}>
            Payroll Due In (days)
          </label>
          <input
            id="dueDays"
            type="number"
            min={1}
            max={365}
            className={INPUT}
            placeholder="18"
            value={draft.payrollDueInDays}
            onChange={(e) => setField({ payrollDueInDays: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="capex" className={LABEL}>
            Scheduled Equipment Spend (RM)
          </label>
          <input
            id="capex"
            type="number"
            min={0}
            className={INPUT}
            placeholder="7000"
            value={draft.scheduledEquipmentSpend}
            onChange={(e) => setField({ scheduledEquipmentSpend: e.target.value })}
          />
        </div>
      </div>

      {/* Outstanding invoices */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
            Outstanding Invoices
          </h3>
          <button
            type="button"
            onClick={addInvoice}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300"
          >
            + Add Invoice
          </button>
        </div>

        {draft.invoices.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-400">
            No outstanding invoices. Add one, or continue without receivables.
          </p>
        ) : (
          <div className="space-y-3">
            {draft.invoices.map((inv, i) => (
              <div
                key={i}
                className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-2 lg:grid-cols-5"
              >
                <div>
                  <label htmlFor={`inv-name-${i}`} className={LABEL}>
                    Client Name
                  </label>
                  <input
                    id={`inv-name-${i}`}
                    type="text"
                    className={INPUT}
                    placeholder={`Client ${i + 1}`}
                    value={inv.clientName}
                    onChange={(e) => setInvoice(i, { clientName: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={`inv-amount-${i}`} className={LABEL}>
                    Amount (RM)
                  </label>
                  <input
                    id={`inv-amount-${i}`}
                    type="number"
                    min={0}
                    className={INPUT}
                    placeholder="10000"
                    value={inv.amount}
                    onChange={(e) => setInvoice(i, { amount: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={`inv-days-${i}`} className={LABEL}>
                    Days Overdue
                  </label>
                  <input
                    id={`inv-days-${i}`}
                    type="number"
                    min={0}
                    className={INPUT}
                    placeholder="45"
                    value={inv.daysOverdue}
                    onChange={(e) => setInvoice(i, { daysOverdue: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={`inv-prob-${i}`} className={LABEL}>
                    Collection Probability (%)
                  </label>
                  <input
                    id={`inv-prob-${i}`}
                    type="number"
                    min={0}
                    max={100}
                    className={INPUT}
                    placeholder="80"
                    value={inv.collectionProbability}
                    onChange={(e) =>
                      setInvoice(i, { collectionProbability: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label htmlFor={`inv-risk-${i}`} className={LABEL}>
                      Relationship Risk
                    </label>
                    <select
                      id={`inv-risk-${i}`}
                      className={INPUT}
                      value={inv.relationshipRisk}
                      onChange={(e) =>
                        setInvoice(i, {
                          relationshipRisk: e.target
                            .value as Invoice["relationshipRisk"],
                        })
                      }
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInvoice(i)}
                    aria-label={`Remove invoice ${i + 1}`}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-neutral-300 bg-neutral-50 p-4"
        >
          <p className="text-sm font-semibold text-neutral-900">
            Please fix the following before continuing:
          </p>
          <ul className="mt-2 space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-sm text-neutral-600">
                • {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-neutral-900 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-neutral-800"
        >
          Launch Treasury Console →
        </button>
      </div>
    </form>
  );
}
