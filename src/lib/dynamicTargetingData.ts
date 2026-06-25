/**
 * Dynamic Targeting — mock data + types.
 *
 * Frontend-only mock that simulates the backend org graph used by the
 * "Dynamic Targeting" tab inside the DL drawer. Replace these calls
 * with real fetch() calls when the Spring Boot endpoints are live.
 *
 * Suggested backend endpoints (Spring Boot):
 *   GET  /api/org/lobs
 *   GET  /api/org/apps?lob={lob}
 *   GET  /api/org/cio-directs?lob={lob}
 *   GET  /api/org/dynamic-roster?lob=&apps=&cio=
 *
 * The roster groups people by role buckets:
 *   TECH_MANAGER, ALT_TECH_MANAGER,
 *   BUSINESS_OWNER, ALT_BUSINESS_OWNER,
 *   CIO1, CIO2
 *
 * The JSON produced by DynamicTargetingPanel is shaped as:
 * {
 *   "lob": "<lobCode>",
 *   "apps": ["<appCode>", ...],
 *   "cioDirect": "<cioCode>",
 *   "sections": {
 *     "TECH_MANAGER": {
 *        "mode": "ALL" | "FILTERED",
 *        "bucket": "TO" | "CC" | "BCC",      // present when mode === ALL
 *        "users": [                           // present when mode === FILTERED
 *           { "email": "...", "bucket": "TO" | "CC" | "BCC" }
 *        ]
 *     },
 *     ...
 *   }
 * }
 */

export type DTBucket = "TO" | "CC" | "BCC";

export interface OrgLOB   { code: string; label: string; }
export interface OrgApp   { code: string; label: string; lob: string; }
export interface OrgCIO   { code: string; label: string; lob: string; }

export interface OrgUser {
  lanid: string;
  name: string;
  email: string;
}

export type DTRoleCode =
  | "TECH_MANAGER"
  | "ALT_TECH_MANAGER"
  | "BUSINESS_OWNER"
  | "ALT_BUSINESS_OWNER"
  | "CIO1"
  | "CIO2";

export interface DTRoleDef {
  code: DTRoleCode;
  label: string;
}

export const DT_ROLES: DTRoleDef[] = [
  { code: "TECH_MANAGER",        label: "Tech Manager"        },
  { code: "ALT_TECH_MANAGER",    label: "Alt Tech Manager"    },
  { code: "BUSINESS_OWNER",      label: "Business Owner"      },
  { code: "ALT_BUSINESS_OWNER",  label: "Alt Business Owner"  },
  { code: "CIO1",                label: "CIO-1"               },
  { code: "CIO2",                label: "CIO-2"               },
];

export type DTRoster = Record<DTRoleCode, OrgUser[]>;

/* -------- mock org data -------- */

const LOBS: OrgLOB[] = [
  { code: "CCB",  label: "Consumer & Community Banking" },
  { code: "CIB",  label: "Corporate & Investment Bank"  },
  { code: "AWM",  label: "Asset & Wealth Management"    },
  { code: "CB",   label: "Commercial Banking"           },
];

const APPS: OrgApp[] = [
  // CCB
  { code: "CCB-CARD-AUTH",    label: "Card Authorization",  lob: "CCB" },
  { code: "CCB-MOBILE",       label: "Mobile Banking",       lob: "CCB" },
  { code: "CCB-LENDING",      label: "Consumer Lending",     lob: "CCB" },
  { code: "CCB-FRAUD",        label: "Fraud Detection",      lob: "CCB" },
  // CIB
  { code: "CIB-TRADING",      label: "Equity Trading",       lob: "CIB" },
  { code: "CIB-RISK",         label: "Risk Analytics",       lob: "CIB" },
  { code: "CIB-SETTLE",       label: "Settlements",          lob: "CIB" },
  // AWM
  { code: "AWM-PORTAL",       label: "Advisor Portal",       lob: "AWM" },
  { code: "AWM-PORTFOLIO",    label: "Portfolio Engine",     lob: "AWM" },
  // CB
  { code: "CB-CREDIT",        label: "Credit Workflow",      lob: "CB"  },
  { code: "CB-TREASURY",      label: "Treasury Services",    lob: "CB"  },
];

const CIO_DIRECTS: OrgCIO[] = [
  { code: "CCB-CIO-D1", label: "Priya Raman",   lob: "CCB" },
  { code: "CCB-CIO-D2", label: "Marcus Lee",    lob: "CCB" },
  { code: "CIB-CIO-D1", label: "Sarah Connor",  lob: "CIB" },
  { code: "CIB-CIO-D2", label: "Diego Alvarez", lob: "CIB" },
  { code: "AWM-CIO-D1", label: "Linh Tran",     lob: "AWM" },
  { code: "CB-CIO-D1",  label: "Hannah Kim",    lob: "CB"  },
];

/* Pre-baked rosters keyed by LOB for the mock. */
const MOCK_ROSTERS: Record<string, DTRoster> = {
  CCB: {
    TECH_MANAGER: [
      { lanid: "u_tm1", name: "Alex Morgan",   email: "alex.morgan@firm.com"   },
      { lanid: "u_tm2", name: "Jordan Price",  email: "jordan.price@firm.com"  },
      { lanid: "u_tm3", name: "Sam Patel",     email: "sam.patel@firm.com"     },
    ],
    ALT_TECH_MANAGER: [
      { lanid: "u_atm1", name: "Riya Nair",    email: "riya.nair@firm.com"     },
      { lanid: "u_atm2", name: "Kenji Sato",   email: "kenji.sato@firm.com"    },
    ],
    BUSINESS_OWNER: [
      { lanid: "u_bo1", name: "Megan Liu",     email: "megan.liu@firm.com"     },
      { lanid: "u_bo2", name: "Oliver Bryant", email: "oliver.bryant@firm.com" },
    ],
    ALT_BUSINESS_OWNER: [
      { lanid: "u_abo1", name: "Sofia Chen",   email: "sofia.chen@firm.com"    },
    ],
    CIO1: [
      { lanid: "u_c1a",  name: "David Park",   email: "david.park@firm.com"    },
    ],
    CIO2: [
      { lanid: "u_c2a",  name: "Eva Brooks",   email: "eva.brooks@firm.com"    },
    ],
  },
  CIB: {
    TECH_MANAGER: [
      { lanid: "u_tm10", name: "Nina Costa",   email: "nina.costa@firm.com"    },
      { lanid: "u_tm11", name: "Ravi Shankar", email: "ravi.shankar@firm.com"  },
    ],
    ALT_TECH_MANAGER: [
      { lanid: "u_atm10", name: "Tom Becker",  email: "tom.becker@firm.com"    },
    ],
    BUSINESS_OWNER: [
      { lanid: "u_bo10", name: "Aisha Khan",   email: "aisha.khan@firm.com"    },
      { lanid: "u_bo11", name: "Marc Dubois",  email: "marc.dubois@firm.com"   },
    ],
    ALT_BUSINESS_OWNER: [
      { lanid: "u_abo10", name: "Yuki Tanaka", email: "yuki.tanaka@firm.com"   },
    ],
    CIO1: [
      { lanid: "u_c1b",  name: "Henry Cole",   email: "henry.cole@firm.com"    },
    ],
    CIO2: [
      { lanid: "u_c2b",  name: "Grace Wong",   email: "grace.wong@firm.com"    },
    ],
  },
  AWM: {
    TECH_MANAGER: [
      { lanid: "u_tm20", name: "Paul Adams",   email: "paul.adams@firm.com"    },
    ],
    ALT_TECH_MANAGER: [
      { lanid: "u_atm20", name: "Mira Schultz", email: "mira.schultz@firm.com" },
    ],
    BUSINESS_OWNER: [
      { lanid: "u_bo20", name: "Carla Reyes",  email: "carla.reyes@firm.com"   },
    ],
    ALT_BUSINESS_OWNER: [],
    CIO1: [
      { lanid: "u_c1c", name: "Ian Foster",    email: "ian.foster@firm.com"    },
    ],
    CIO2: [],
  },
  CB: {
    TECH_MANAGER: [
      { lanid: "u_tm30", name: "Brian Vega",   email: "brian.vega@firm.com"    },
    ],
    ALT_TECH_MANAGER: [
      { lanid: "u_atm30", name: "Wendy Lin",   email: "wendy.lin@firm.com"     },
    ],
    BUSINESS_OWNER: [
      { lanid: "u_bo30", name: "Tariq Aziz",   email: "tariq.aziz@firm.com"    },
    ],
    ALT_BUSINESS_OWNER: [
      { lanid: "u_abo30", name: "Lucia Romano", email: "lucia.romano@firm.com" },
    ],
    CIO1: [
      { lanid: "u_c1d", name: "Karen Hill",    email: "karen.hill@firm.com"    },
    ],
    CIO2: [
      { lanid: "u_c2d", name: "Quinn Hayes",   email: "quinn.hayes@firm.com"   },
    ],
  },
};

/* -------- accessors (swap with fetch calls) -------- */

export function listLOBs(): OrgLOB[] {
  return LOBS;
}

export function listAppsForLOB(lob: string): OrgApp[] {
  if (!lob) return [];
  return APPS.filter(a => a.lob === lob);
}

export function listCIODirectsForLOB(lob: string): OrgCIO[] {
  if (!lob) return [];
  return CIO_DIRECTS.filter(c => c.lob === lob);
}

export function fetchDynamicRoster(lob: string, _apps: string[], _cio: string): DTRoster {
  // mock — backend would scope by apps + cio direct.
  const base = MOCK_ROSTERS[lob];
  if (!base) {
    return {
      TECH_MANAGER: [], ALT_TECH_MANAGER: [],
      BUSINESS_OWNER: [], ALT_BUSINESS_OWNER: [],
      CIO1: [], CIO2: [],
    };
  }
  return base;
}

/* -------- payload JSON shape (sent to backend) -------- */

export interface DTSectionAll {
  mode: "ALL";
  bucket: DTBucket;
}
export interface DTSectionFiltered {
  mode: "FILTERED";
  users: { email: string; bucket: DTBucket }[];
}
export type DTSectionSelection = DTSectionAll | DTSectionFiltered;

export interface DynamicTargetingPayload {
  lob: string;
  apps: string[];
  cioDirect: string;
  sections: Partial<Record<DTRoleCode, DTSectionSelection>>;
}
