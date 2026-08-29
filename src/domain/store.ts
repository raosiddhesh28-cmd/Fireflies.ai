import type { Commitment, Meeting, User } from "./types.js";
import { expireProposal } from "./stateMachine.js";
import { seedCommitments, USERS, MEETINGS, demoNow } from "./seed.js";

export class CommitmentStore {
  users: User[] = [...USERS];
  meetings: Meeting[] = [...MEETINGS];
  commitments: Commitment[] = [];
  now: Date;

  constructor(now: Date = demoNow()) {
    this.now = now;
    this.commitments = seedCommitments(now);
    this.applyExpirations();
  }

  reset(now: Date = demoNow()): void {
    this.now = now;
    this.commitments = seedCommitments(now);
    this.applyExpirations();
  }

  applyExpirations(): void {
    this.commitments = this.commitments.map((c) => expireProposal(c, this.now));
  }

  get(id: string): Commitment {
    const found = this.commitments.find((c) => c.id === id);
    if (!found) throw new Error("Commitment not found.");
    return found;
  }

  replace(next: Commitment): Commitment {
    this.commitments = this.commitments.map((c) => (c.id === next.id ? next : c));
    return next;
  }

  user(id: string): User {
    const found = this.users.find((u) => u.id === id);
    if (!found) throw new Error("User not found.");
    return found;
  }

  meeting(id: string): Meeting {
    const found = this.meetings.find((m) => m.id === id);
    if (!found) throw new Error("Meeting not found.");
    return found;
  }
}

export const store = new CommitmentStore();
