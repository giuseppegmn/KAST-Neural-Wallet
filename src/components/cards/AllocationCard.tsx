import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import type { AllocationPlan } from '@/lib/portfolioOptimizer';

interface Props {
  plan: AllocationPlan | null;
}

export function AllocationCard({ plan }: Props) {
  if (!plan) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Allocation Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">No allocation plan generated yet.</p>
        </CardContent>
      </Card>
    );
  }

  const { allocations } = plan;

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Allocation Plan (next {plan.horizonDays}d)</CardTitle>
          <Badge variant={plan.worstCaseLossPct > 0.1 ? 'warning' : 'success'}>
            Worst-case: {(plan.worstCaseLossPct * 100).toFixed(2)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500">CASH</p>
              <p className="text-lg font-semibold">{(allocations.CASH * 100).toFixed(0)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500">STABLE EARN</p>
              <p className="text-lg font-semibold">{(allocations.STABLE_EARN * 100).toFixed(0)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500">SOL STAKING</p>
              <p className="text-lg font-semibold">{(allocations.SOL_STAKING * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Expected return</span>
            <span className="font-semibold">${plan.expectedReturnUSD.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Worst-case loss (CVaR95)</span>
            <span className="font-semibold">-${plan.worstCaseLossUSD.toFixed(2)}</span>
          </div>

          <details className="pt-2 border-t border-white/10">
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-200">Why this allocation?</summary>
            <ul className="mt-2 space-y-1 text-xs text-gray-500 list-disc pl-4">
              {plan.reasoning.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
