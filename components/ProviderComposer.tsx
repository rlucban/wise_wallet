import { ComponentType, ReactNode } from "react";

interface ProviderComposerProps {
  providers: ComponentType<{ children: ReactNode }>[];
  children: ReactNode;
}

export default function ProviderComposer({ providers, children }: ProviderComposerProps) {
  return providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);
}
