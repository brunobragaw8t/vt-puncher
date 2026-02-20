// API Response Types

export interface LoginResponse {
  d: {
    Token: string;
    EmployeeId: number;
    UserId: number;
    Status: number;
    EmployeeStatus: {
      EmployeeName: string;
      LastPunchDate: string;
      LastPunchDirection: "In" | "Out";
      PresenceStatus: string;
      ServerDate: string;
    };
    ServerTimezone: string;
  };
}

export interface SetStatusResponse {
  d: {
    Status: number;
    CustomErrorText: string;
    Result: boolean;
    PresenceStatus?: string;
    LastPunchDirection?: string;
    EmployeeName?: string;
  };
}

// Config Types

export interface ScheduledPunch {
  time: string; // "07:00"
  type: "in" | "out";
}

export interface Config {
  timezone: string;
  jitter?: number; // max jitter in minutes (default: 5)
  punches: ScheduledPunch[];
}

// State Types

export interface State {
  lastPunch?: {
    type: "in" | "out";
    timestamp: string;
  };
}

// Auth credentials from env

export interface Credentials {
  user: string;
  password: string;
  companyId: string;
}
