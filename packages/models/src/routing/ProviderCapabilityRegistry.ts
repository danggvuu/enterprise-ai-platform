import { ProviderCapabilities, ProviderMetadata } from './types';

export class ProviderCapabilityRegistry {
  private providers: Map<string, ProviderMetadata> = new Map();

  constructor() {
    // Registry is initially empty, meant to be populated by DB or config
  }

  public registerProvider(metadata: ProviderMetadata): void {
    this.providers.set(metadata.id, metadata);
  }

  public getProvider(id: string): ProviderMetadata | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): ProviderMetadata[] {
    return Array.from(this.providers.values());
  }

  public getProvidersSupportingModel(model: string): ProviderMetadata[] {
    return this.getAllProviders().filter(p => p.supportedModels.includes(model));
  }
}
