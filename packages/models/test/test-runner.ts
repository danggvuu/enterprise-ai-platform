import { DynamicRouter } from '../src/routing/DynamicRouter';
import { RouteRequest } from '../src/routing/types';
import { ProviderError } from '@enterprise/errors';

async function runTests() {
  console.log('Running DynamicRouter tests...');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    const router = new DynamicRouter();
    
    // Test 1
    let decision = router.route({ strategy: 'cost-optimized' });
    assert(decision.providerId === 'ollama', 'Should route to lowest cost provider (ollama)');

    // Test 2
    router.getHealthMonitor().recordSuccess('openai', 100);
    router.getHealthMonitor().recordSuccess('bedrock', 3000);
    router.getHealthMonitor().recordSuccess('ollama', 5000);
    decision = router.route({ strategy: 'latency-optimized' });
    assert(decision.providerId === 'openai', 'Should route to fastest provider (openai)');

    // Test 3
    const breakers = router.getCircuitBreakers();
    for(let i=0; i<5; i++) breakers.getBreaker('bedrock').recordFailure();
    try {
      router.route({ strategy: 'balanced', model: 'anthropic.claude-3-sonnet-20240229-v1:0' });
      assert(false, 'Should have thrown error because bedrock circuit is OPEN');
    } catch (err: any) {
      assert(err instanceof ProviderError, 'Should throw ProviderError for broken circuit');
    }

    // Test 4
    decision = router.route({}, { budgetExceeded: true });
    assert(decision.providerId === 'ollama', 'Should fallback to cost-optimized (ollama) when budget exceeded');

  } catch (err) {
    console.error('Test suite crashed!', err);
    failed++;
  }

  console.log(`\nTests completed. Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
