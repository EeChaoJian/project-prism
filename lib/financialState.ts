// Hardcoded sample SME financial state for the Project Prism MVP.
// All amounts are in Malaysian Ringgit (RM).

export interface Invoice {
  client: string;
  amount: number;
  daysOverdue: number;
  collectionProbability: number; // 0..1
  relationshipRisk: "Low" | "Medium" | "High";
}

export interface FinancialState {
  companyName: string;
  cashBalance: number;
  monthlyRevenue: number;
  monthlyOpex: number;
  payrollAmount: number;
  payrollDueInDays: number;
  equipmentPurchase: number;
  invoices: Invoice[];
}

export const initialFinancialState: FinancialState = {
  companyName: "Prism Cafe Supplies",
  cashBalance: 12000,
  monthlyRevenue: 38000,
  monthlyOpex: 26000,
  payrollAmount: 18000,
  payrollDueInDays: 18,
  equipmentPurchase: 7000,
  invoices: [
    {
      client: "Client Alpha",
      amount: 10000,
      daysOverdue: 45,
      collectionProbability: 0.8,
      relationshipRisk: "High",
    },
    {
      client: "Client Beta",
      amount: 6500,
      daysOverdue: 20,
      collectionProbability: 0.55,
      relationshipRisk: "Medium",
    },
    {
      client: "Client Gamma",
      amount: 4200,
      daysOverdue: 10,
      collectionProbability: 0.35,
      relationshipRisk: "Low",
    },
  ],
};

// ---------------------------------------------------------------------------
// Lookalike Cohort — SYNTHETIC DEMO BENCHMARK DATA
//
// This is illustrative, hand-authored benchmark data for the hackathon demo.
// It is NOT sourced from a real registry or a live dataset — the figures below
// are synthetic and exist only to give the boardroom agents a plausible peer
// benchmark to reference. Do not present these numbers as empirical fact.
// ---------------------------------------------------------------------------

export interface LookalikeCohort {
  cohortId: string;
  industry: string;
  sampleSize: number;
  matchingCriteria: string[];
  historicalOutcomes: {
    delayEquipmentSuccessRate: number; // 0..1 — payroll protected by delaying capex
    discountInflowAccelerationDays: number; // avg days invoices realise sooner
    defaultRateIfNoAction: number; // 0..1 — default rate when no action taken
  };
}

// Synthetic demo cohort of 147 retail / F&B suppliers sharing Prism Cafe
// Supplies' risk profile: sub-20-day runway, a payroll gap over RM4,000, and
// highly concentrated overdue receivables. Illustrative only.
export const lookalikeCohortData: LookalikeCohort = {
  cohortId: "CH-RETAIL-SUPPLY-04",
  industry: "Retail & F&B Supply",
  sampleSize: 147,
  matchingCriteria: [
    "Runway < 20 days",
    "Payroll Gap > RM4,000",
    "Highly concentrated overdue accounts receivable",
  ],
  historicalOutcomes: {
    delayEquipmentSuccessRate: 0.91,
    discountInflowAccelerationDays: 11,
    defaultRateIfNoAction: 0.72,
  },
};
