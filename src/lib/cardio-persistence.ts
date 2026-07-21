export class CardioSaveBlockedError extends Error {
  constructor() {
    super("The workout is already finishing");
    this.name = "CardioSaveBlockedError";
  }
}

export type CompletionStartResult =
  | "started"
  | "cardio_save_pending"
  | "already_completing";

export function createCardioPersistenceGate(
  onPendingCountChange?: (pendingCount: number) => void
) {
  let pendingCount = 0;
  let completionInProgress = false;

  const publishPendingCount = () => {
    onPendingCountChange?.(pendingCount);
  };

  return {
    async runSave<T>(save: () => Promise<T>): Promise<T> {
      if (completionInProgress) {
        throw new CardioSaveBlockedError();
      }

      pendingCount += 1;
      publishPendingCount();

      try {
        return await save();
      } finally {
        pendingCount -= 1;
        publishPendingCount();
      }
    },

    tryStartCompletion(): CompletionStartResult {
      if (completionInProgress) return "already_completing";
      if (pendingCount > 0) return "cardio_save_pending";

      completionInProgress = true;
      return "started";
    },

    finishCompletion() {
      completionInProgress = false;
    },

    get pendingCount() {
      return pendingCount;
    },

    get completionInProgress() {
      return completionInProgress;
    },
  };
}

export type CardioPersistenceGate = ReturnType<
  typeof createCardioPersistenceGate
>;
