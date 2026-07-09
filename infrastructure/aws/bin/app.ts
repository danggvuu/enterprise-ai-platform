#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EnterpriseVpcStack } from '../lib/EnterpriseVpcStack';
import { EksClusterStack } from '../lib/EksClusterStack';
import { GlobalStateStack } from '../lib/GlobalStateStack';

/**
 * Enterprise Environment Configuration
 */
const ENVIRONMENTS = {
  SHARED_SERVICES: { account: '111111111111', region: 'us-east-1' }, // ECR, Route53, ArgoCD
  NON_PROD: { account: '222222222222', region: 'us-east-1' }, // Dev, Staging
  PROD_PRIMARY: { account: '333333333333', region: 'us-east-1' }, // Active-Active East
  PROD_SECONDARY: { account: '333333333333', region: 'us-west-2' }, // Active-Active West
};

const app = new cdk.App();

// ============================================================================
// 1. NON-PROD ENVIRONMENT (Single Region)
// ============================================================================

const nonProdVpc = new EnterpriseVpcStack(app, 'AiGateway-NonProd-VPC', {
  env: ENVIRONMENTS.NON_PROD,
  vpcCidr: '10.1.0.0/16',
  isProduction: false,
});

const nonProdEks = new EksClusterStack(app, 'AiGateway-NonProd-EKS', {
  env: ENVIRONMENTS.NON_PROD,
  vpc: nonProdVpc.vpc,
  clusterName: 'ai-gateway-nonprod',
  isProduction: false,
});
nonProdEks.addDependency(nonProdVpc);

// ============================================================================
// 2. PRODUCTION ENVIRONMENT (Multi-Region Active-Active)
// ============================================================================

/**
 * Global Stateful Resources (DynamoDB Global Tables for Cache and Ledger)
 * These span across the Primary and Secondary regions automatically.
 */
const prodGlobalState = new GlobalStateStack(app, 'AiGateway-Prod-State', {
  env: ENVIRONMENTS.PROD_PRIMARY, // Deployed via primary, replicates to secondary
  replicationRegions: [ENVIRONMENTS.PROD_SECONDARY.region],
  isProduction: true,
});

/**
 * PROD: PRIMARY REGION (US-EAST-1)
 */
const prodEastVpc = new EnterpriseVpcStack(app, 'AiGateway-ProdEast-VPC', {
  env: ENVIRONMENTS.PROD_PRIMARY,
  vpcCidr: '10.10.0.0/16',
  isProduction: true,
});

const prodEastEks = new EksClusterStack(app, 'AiGateway-ProdEast-EKS', {
  env: ENVIRONMENTS.PROD_PRIMARY,
  vpc: prodEastVpc.vpc,
  clusterName: 'ai-gateway-prod-east',
  isProduction: true,
  // Stricter limits for production
  minCapacity: 3,
  maxCapacity: 100,
});
prodEastEks.addDependency(prodEastVpc);
prodEastEks.addDependency(prodGlobalState);

/**
 * PROD: SECONDARY REGION (US-WEST-2)
 */
const prodWestVpc = new EnterpriseVpcStack(app, 'AiGateway-ProdWest-VPC', {
  env: ENVIRONMENTS.PROD_SECONDARY,
  vpcCidr: '10.20.0.0/16',
  isProduction: true,
});

const prodWestEks = new EksClusterStack(app, 'AiGateway-ProdWest-EKS', {
  env: ENVIRONMENTS.PROD_SECONDARY,
  vpc: prodWestVpc.vpc,
  clusterName: 'ai-gateway-prod-west',
  isProduction: true,
  minCapacity: 3,
  maxCapacity: 100,
});
prodWestEks.addDependency(prodWestVpc);
prodWestEks.addDependency(prodGlobalState);

// Security Best Practice: Tag all resources for FinOps Billing
cdk.Tags.of(app).add('Project', 'EnterpriseAIGateway');
cdk.Tags.of(app).add('CostCenter', 'AI_PLATFORM');
