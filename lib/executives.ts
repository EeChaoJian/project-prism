// Executive identities for the boardroom. Display-only metadata keyed off the
// agent role so the two board members feel like people, not text blocks.

import type { AgentResponse } from "./agents";

export interface Executive {
  name: string;
  initials: string;
  title: string;
  focus: string;
  style: string;
  stance: string;
}

export const EXECUTIVES: Record<AgentResponse["agent"], Executive> = {
  CFO: {
    name: "Maya Chen",
    initials: "MC",
    title: "Chief Financial Officer",
    focus: "Runway, cash control, payroll safety",
    style: "Conservative",
    stance: "Low risk tolerance",
  },
  "Collections Manager": {
    name: "Daniel Reyes",
    initials: "DR",
    title: "Collections Manager",
    focus: "Invoice recovery, customer relationships",
    style: "Assertive, relationship-aware",
    stance: "Moderate risk tolerance",
  },
};
