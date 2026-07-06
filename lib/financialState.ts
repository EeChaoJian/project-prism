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
