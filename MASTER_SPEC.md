Project Prism — MASTER SPEC

1. Product Summary

Project Prism is an AI-powered financial decision simulator for small and medium-sized businesses.

The MVP demo promise:

A business owner sees a payroll cash crunch → two AI agents debate possible actions → the owner chooses a strategy → the financial dashboard updates immediately.

Project Prism is not a cash-flow prediction tool.
It is a scenario simulation tool.

The product helps SME owners explore:

“What happens if I make this decision?”

instead of simply asking:

“What should I do?”

⸻

2. Hackathon Goal

This project is built for AMD Developer Hackathon ACT II, Track 3 — Unicorn Track.

Judging criteria:

1. Creativity and Originality
2. Product / Market Potential
3. Completeness
4. Use of AMD Platforms

The MVP should optimise for:

* a polished demo
* a clear business problem
* simple but impressive AI behaviour
* explainable financial simulation
* strong storytelling
* no unnecessary complexity

⸻

3. Core Product Principle

AI should explain trade-offs.

The simulation engine should update financial numbers.

The LLM must not invent financial outcomes.

All numerical consequences must come from deterministic logic.

⸻

4. Target User

Primary user:

* SME owner
* founder
* small retail/service business operator
* agency owner
* startup operator

User problem:

SME owners often make financial decisions without understanding downstream consequences on cash flow, payroll, runway, and receivables.

⸻

5. MVP Scope

Build only one complete workflow:

1. Hardcoded sample SME financial state
2. Payroll cash crunch detection
3. Two AI agents:
    * CFO
    * Collections Manager
4. Owner decision buttons
5. Deterministic simulation update
6. Updated dashboard metrics
7. Simple projected cash chart
8. Clean demo-ready UI

⸻

6. Explicitly Out of Scope

Do not build:

* real bank integrations
* real invoice parsing
* real file upload
* authentication
* databases
* multi-company dashboards
* complex forecasting
* more than two agents initially
* general finance chatbot
* user accounts
* payments
* production-level security
* mobile app

This is a hackathon MVP, not a full SaaS product.

⸻

7. Recommended Tech Stack

Use:

* Next.js
* React
* TypeScript
* Tailwind CSS
* Recharts for charts
* Fireworks AI API for agent responses
* Gemma model through Fireworks if available
* Environment variables for API key

Keep the architecture simple.

Do not overengineer.

⸻

8. App Structure

Suggested files:

project-prism/
├── app/
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── MetricCard.tsx
│   ├── AgentCard.tsx
│   ├── DecisionPanel.tsx
│   └── CashFlowChart.tsx
├── lib/
│   ├── financialState.ts
│   ├── simulation.ts
│   ├── healthCheck.ts
│   └── agents.ts
├── README.md
├── MASTER_SPEC.md
├── BUILD_PLAN.md
├── .env.example
└── package.json

If this structure becomes too much, simplify. Completeness matters more than architecture purity.

⸻

9. Sample Financial State

Use a hardcoded company.

Company name:

Prism Cafe Supplies

Business type:

Small B2B supplier serving cafes and restaurants.

Initial state:

export const initialFinancialState = {
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
      relationshipRisk: "High"
    },
    {
      client: "Client Beta",
      amount: 6500,
      daysOverdue: 20,
      collectionProbability: 0.55,
      relationshipRisk: "Medium"
    },
    {
      client: "Client Gamma",
      amount: 4200,
      daysOverdue: 10,
      collectionProbability: 0.35,
      relationshipRisk: "Low"
    }
  ]
};

⸻

10. Financial Health Logic

Create a deterministic function:

checkFinancialHealth(state)

It should calculate:

* expected collections
* projected cash before payroll
* payroll gap
* runway days
* payroll risk boolean
* alert message

Expected collections formula:

sum(invoice.amount * invoice.collectionProbability)

Projected cash before payroll:

cashBalance + expectedCollections

Payroll gap:

payrollAmount - projectedCashBeforePayroll

Payroll risk:

payrollGap > 0

Runway days:

cashBalance / (monthlyOpex / 30)

⸻

11. Decision Simulation Logic

Create deterministic function:

simulateDecision(state, action)

Supported actions:

Action 1: Prioritize Client Alpha

Effect:

* cash balance increases by RM9,000
* accounts receivable decreases accordingly
* explanation: Client Alpha was prioritised and expected to pay earlier

Action 2: Delay Equipment Purchase

Effect:

* cash balance increases or preserves RM7,000
* explanation: equipment purchase delayed to protect liquidity

Action 3: Offer Early Payment Discount

Effect:

* cash balance increases by RM6,200
* explanation: early payment incentive accelerates cash but reduces margin

Action 4: Do Nothing

Effect:

* no financial change
* explanation: no action taken, payroll risk remains

The simulation must return:

* updated state
* decision explanation
* before metrics
* after metrics

⸻

12. AI Agents

Use two agents for MVP.

Agent 1: CFO

Role:

The CFO focuses on liquidity, runway, payroll, and financial stability.

Personality:

* cautious
* direct
* numbers-focused
* prioritises survival over growth

The CFO should recommend actions such as:

* delaying non-essential spending
* protecting cash reserves
* reducing payroll risk
* extending runway

Agent 2: Collections Manager

Role:

The Collections Manager focuses on recovering outstanding invoices and improving cash inflow.

Personality:

* practical
* action-oriented
* client-aware
* focused on receivables

The Collections Manager should recommend actions such as:

* prioritising overdue invoices
* chasing high-value clients
* offering early payment discounts
* balancing recovery with relationship risk

⸻

13. Agent Output Format

Each agent should return structured JSON.

Format:

{
  "headline": "Preserve liquidity before payroll",
  "recommendation": "I recommend delaying the equipment purchase to protect payroll.",
  "reasoning": [
    "Cash balance is currently RM12,000.",
    "Payroll obligation is RM18,000.",
    "Preserving RM7,000 improves short-term liquidity."
  ],
  "risk": "Delaying equipment may slow operational improvements.",
  "scenarioConfidence": 0.82
}

Do not allow agents to invent new financial numbers. They must use numbers from the current financial state.

If the API fails, show fallback hardcoded agent responses so the demo never breaks.

⸻

14. Shared Agent Context

Before calling each agent, pass this context:

Company: Prism Cafe Supplies
Cash balance: RM12,000
Monthly revenue: RM38,000
Monthly operating expenses: RM26,000
Payroll amount: RM18,000
Payroll due in: 18 days
Expected collections: RM...
Projected cash before payroll: RM...
Payroll gap: RM...
Outstanding invoices:
- Client Alpha: RM10,000, 45 days overdue, 80% collection probability, high relationship risk
- Client Beta: RM6,500, 20 days overdue, 55% collection probability, medium relationship risk
- Client Gamma: RM4,200, 10 days overdue, 35% collection probability, low relationship risk

Agents should respond as business stakeholders, not generic chatbots.

⸻

15. UI Requirements

The app should feel like a polished startup demo.

Homepage layout:

Top section

* Product name: Project Prism
* Tagline: “Explore financial decisions before you make them.”
* Short description

Dashboard section

Metric cards:

* Cash Balance
* Runway Days
* Expected Collections
* Payroll Risk

Alert section

If payroll risk is detected, show:

Emergency Board Meeting Required

Example:

“Payroll risk detected. Projected cash may fall short before payroll is due in 18 days.”

Agent section

Two side-by-side cards:

* CFO
* Collections Manager

Each card shows:

* headline
* recommendation
* reasoning bullets
* risk

Decision section

Buttons:

* Prioritize Client Alpha
* Delay Equipment Purchase
* Offer Early Payment Discount
* Do Nothing

Simulation result section

After user selects action, show:

* chosen decision
* explanation
* before vs after cash balance
* before vs after runway
* payroll risk improvement
* updated chart

⸻

16. Visual Style

Design inspiration:

* Linear
* Stripe
* modern fintech dashboard
* clean, minimal, professional

Use:

* dark or light modern background
* cards
* rounded corners
* clear spacing
* subtle gradients if simple
* strong typography
* clean financial charts

Avoid:

* clutter
* long paragraphs
* too many colors
* excessive animations
* confusing dashboards

⸻

17. Demo Script

The demo should follow exactly this story:

1. “This is Prism, an AI financial decision simulator for SMEs.”
2. “Many SMEs do not fail because they lack revenue. They fail because they do not see cash crunches early enough.”
3. “Here, Prism detects that payroll may become risky in 18 days.”
4. “Instead of giving one generic AI answer, Prism convenes a financial boardroom.”
5. “The CFO argues for liquidity preservation.”
6. “The Collections Manager argues for recovering receivables.”
7. “The owner chooses a strategy.”
8. “The simulation engine updates the business state immediately.”
9. “The AI does not invent the outcome. The numbers come from deterministic simulation.”
10. “This turns financial management from passive reporting into interactive decision intelligence.”

⸻

18. AMD Platform Story

The AMD angle:

Project Prism uses AMD-powered AI infrastructure to support multiple specialised financial agents reasoning over the same business state.

Instead of a single prompt-response chatbot, Prism demonstrates:

* agentic AI
* parallel stakeholder reasoning
* structured financial decision support
* scenario generation
* interactive simulation
* stateful AI workflows

Important framing:

AMD infrastructure enables fast multi-agent reasoning and scenario exploration for decision intelligence.

⸻

19. Completeness Standard

The app is complete when:

* it loads without errors
* dashboard metrics show correctly
* payroll risk alert appears
* two agents produce sensible responses
* owner can click decisions
* metrics update immediately
* chart updates
* fallback responses exist if AI fails
* README explains the project clearly
* demo can be completed in under 3 minutes

⸻

20. Build Discipline

Do not add features until the core loop is perfect.

Core loop:

Risk detected → agents respond → owner chooses → simulation updates

If a feature does not strengthen this loop, cut it.

⸻

21. Future Roadmap

After the hackathon, Prism could expand into:

* real bank transaction imports
* accounting software integrations
* invoice parsing
* predictive cash flow modelling
* supplier payment planning
* financing readiness analysis
* SME loan preparation
* customer payment behaviour scoring
* multi-scenario planning
* industry-specific financial twins

But none of this belongs in the MVP.

⸻

22. First Build Task for Claude Code

Build the deterministic frontend first.

Do not implement AI yet.

Create:

* sample financial state
* health check function
* simulation function
* dashboard
* alert
* decision buttons
* updated metrics

Once this works, integrate agents.

The deterministic core is the safety net for the entire demo.
