export function useDecision() {
  return {
    decision: { status: "stub", reason: "baseline" },
    generateDecision: () => {},
    reject: () => {}
  };
}
