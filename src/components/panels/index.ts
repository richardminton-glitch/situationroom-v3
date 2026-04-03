/**
 * Panel component registry — maps panel IDs to their React components.
 */
import type { ComponentType } from 'react';

import { BtcHeroPanel } from './BtcHeroPanel';
import { BtcMarketPanel } from './BtcMarketPanel';
import { BtcNetworkPanel } from './BtcNetworkPanel';
import { BtcMiningPanel } from './BtcMiningPanel';
import { LightningPanel } from './LightningPanel';
import { ConvictionPanel } from './ConvictionPanel';
import { FearGreedPanel } from './FearGreedPanel';
import { GlobePanel } from './GlobePanel';
import { IntelFeedPanel } from './IntelFeedPanel';
import { AIBriefingPanel } from './AIBriefingPanel';
import { IndicesPanel } from './IndicesPanel';
import { CommoditiesPanel } from './CommoditiesPanel';
import { FXPanel } from './FXPanel';
import { CentralBankPanel } from './CentralBankPanel';
import { OnChainPanel } from './OnChainPanel';
import { WhalePanel } from './WhalePanel';
import { BtcChartsPanel } from './BtcChartsPanel';
import { WirePanel } from './WirePanel';
import { TikrPanel } from './TikrPanel';
import { EconomicEventsPanel } from './EconomicEventsPanel';
import { InflationChartPanel } from './InflationChartPanel';
import { CentralBankRatesPanel } from './CentralBankRatesPanel';
import { CentralBankAssetPanel } from './CentralBankAssetPanel';
import { UTXOAgeDistributionPanel } from './UTXOAgeDistributionPanel';
import { LTHSTHSupplyPanel } from './LTHSTHSupplyPanel';
import { CoinDaysDestroyedPanel } from './CoinDaysDestroyedPanel';
import { URPDPanel } from './URPDPanel';
import { HSeparatorPanel } from './HSeparatorPanel';
import { VSeparatorPanel } from './VSeparatorPanel';
import { AccountSettingsPanel } from './AccountSettingsPanel';
import { M2ChartPanel } from './M2ChartPanel';

export const PANEL_COMPONENTS: Record<string, ComponentType> = {
  'btc-hero': BtcHeroPanel,
  'btc-market': BtcMarketPanel,
  'btc-network': BtcNetworkPanel,
  'btc-mining': BtcMiningPanel,
  'lightning': LightningPanel,
  'conviction': ConvictionPanel,
  'fear-greed': FearGreedPanel,
  'globe': GlobePanel,
  'intel-feed': IntelFeedPanel,
  'ai-briefing': AIBriefingPanel,
  'market-indices': IndicesPanel,
  'commodities': CommoditiesPanel,
  'fx-macro': FXPanel,
  'central-bank': CentralBankPanel,
  'onchain-sentiment': OnChainPanel,
  'whale-txs': WhalePanel,
  'btc-charts': BtcChartsPanel,
  'wire': WirePanel,
  'tikr': TikrPanel,
  'economic-events': EconomicEventsPanel,
  'inflation-chart': InflationChartPanel,
  'cb-rates-chart': CentralBankRatesPanel,
  'cb-asset-chart': CentralBankAssetPanel,
  'utxo-age-dist':  UTXOAgeDistributionPanel,
  'lth-sth-supply':  LTHSTHSupplyPanel,
  'cdd':             CoinDaysDestroyedPanel,
  'urpd':            URPDPanel,
  'h-separator':     HSeparatorPanel,
  'v-separator':     VSeparatorPanel,
  'account-settings': AccountSettingsPanel,
  'm2-chart':         M2ChartPanel,
};
