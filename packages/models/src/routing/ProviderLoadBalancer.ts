import { RouteDecision } from './types';

export class ProviderLoadBalancer {
  /**
   * Sorts the decisions by score descending.
   * If scores are very close (within 5%), it can perform a weighted random selection.
   * For now, we implement a simple rank-based selection.
   */
  public rankProviders(decisions: RouteDecision[]): RouteDecision[] {
    return decisions.sort((a, b) => b.score - a.score);
  }

  public getTopProvider(decisions: RouteDecision[]): RouteDecision | null {
    if (decisions.length === 0) return null;
    const ranked = this.rankProviders(decisions);
    return ranked[0];
  }
}
