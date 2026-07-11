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

// Calibrated so the scenario has both a real crisis and a clear rescue:
//   • Do nothing        → payroll short by RM7,000 (the RM8,000 equipment spend
//                          leaves before payday).
//   • Delay equipment    → payroll covered with ~RM1,000 to spare — the one move
//                          that closes the gap, matching the CFO's stance.
//   • Chase receivables  → helps but falls short, so the board disagreement is real.
export const initialFinancialState: FinancialState = {
  companyName: "Harbour Coffee Roasters",
  cashBalance: 16000,
  monthlyRevenue: 38000,
  monthlyOpex: 21000,
  payrollAmount: 18000,
  payrollDueInDays: 18,
  equipmentPurchase: 8000,
  invoices: [
    {
      client: "Client Alpha",
      amount: 12000,
      daysOverdue: 45,
      collectionProbability: 0.85,
      relationshipRisk: "High",
    },
    {
      client: "Client Beta",
      amount: 7000,
      daysOverdue: 20,
      collectionProbability: 0.6,
      relationshipRisk: "Medium",
    },
    {
      client: "Client Gamma",
      amount: 3000,
      daysOverdue: 10,
      collectionProbability: 0.4,
      relationshipRisk: "Low",
    },
  ],
};
