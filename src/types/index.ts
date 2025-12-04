export type PlayerState = {
  id: string;
  name: string;
  secret?: string | null; // stored server-side only
  attempts: number;
  solved: boolean;
  finishedAt?: number | null;
  history: {
    guess: string;
    hint: [number, number];
    at: number;
  }[];
};

export type RoomState = {
  id: string;
  players: Record<string, PlayerState>;
  createdAt: number;
  finished?: boolean;
};
