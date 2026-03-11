import { ChevronRight } from 'lucide-react';

interface FlowDiagramProps {
  steps: string[];
}

export function FlowDiagram({ steps }: FlowDiagramProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="w-full bg-background-surface border border-border rounded-xl p-6 flex items-center justify-between overflow-x-auto custom-scrollbar">
      {steps.map((step, index) => {
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;
        
        return (
          <div key={index} className="flex items-center flex-shrink-0">
            <div className="flex items-center gap-3 h-16 px-5 bg-background-surface-raised border border-border-subtle rounded-lg">
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-mono font-medium ${isLast ? 'bg-primary/15 text-primary' : isFirst ? 'bg-foreground/10 text-foreground' : 'bg-foreground/5 text-foreground-secondary'}`}>
                {index + 1}
              </span>
              <span className={`font-sans font-medium text-sm whitespace-nowrap ${isLast ? 'text-primary' : 'text-foreground'}`}>
                {step}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex items-center justify-center w-10 px-1">
                <div className="flex items-center gap-0.5 text-foreground-tertiary">
                  <div className="w-4 border-t border-dashed border-foreground-tertiary" />
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
