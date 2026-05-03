'use client';

/**
 * InteractiveMount — discriminated dispatcher for the per-module
 * interactive element. Each module's `interactive` field declares
 * its `kind`; this component renders the matching React component.
 *
 * As later sessions add more interactives (glasses, gold-vs-M2,
 * Hayekian triangle, etc.) plug them in here. Unknown kinds render
 * a placeholder so the page still loads while the asset is being
 * built.
 */

import type { InteractiveSpec } from '@/content/vienna-school/types';
import { Timeline }                from './interactives/Timeline';
import { MarginalUtilityGlasses }  from './interactives/MarginalUtilityGlasses';
import { CentralPlannerGame }      from './interactives/CentralPlannerGame';
import { GoldVsM2Chart }           from './interactives/GoldVsM2Chart';
import { HayekianTriangle }        from './interactives/HayekianTriangle';
import { PredictionsAudit }        from './interactives/PredictionsAudit';
import { CurrencyCemetery }        from './interactives/CurrencyCemetery';
import { SpotTheSchool }           from './interactives/SpotTheSchool';

export function InteractiveMount({ spec }: { spec: InteractiveSpec }) {
  switch (spec.kind) {
    case 'spot-the-school':
      return <SpotTheSchool />;
    case 'timeline':
      return <Timeline data={spec.data} />;
    case 'marginal-utility-glasses':
      return <MarginalUtilityGlasses />;
    case 'central-planner-game':
      return <CentralPlannerGame />;
    case 'gold-vs-m2-chart':
      return <GoldVsM2Chart />;
    case 'hayekian-triangle':
      return <HayekianTriangle />;
    case 'predictions-audit':
      return <PredictionsAudit />;
    case 'currency-cemetery':
      return <CurrencyCemetery />;
    default:
      return (
        <div
          style={{
            border:     '1px dashed var(--border-primary)',
            background: 'var(--bg-card)',
            padding:    '32px',
            textAlign:  'center',
            marginTop:  20,
            fontFamily: 'var(--font-mono)',
            fontSize:   11,
            letterSpacing: '0.14em',
            color:      'var(--text-muted)',
          }}
        >
          INTERACTIVE — {spec.kind.toUpperCase()} — COMING SOON
        </div>
      );
  }
}
