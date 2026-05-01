/**
 * Panel component registry — maps panel IDs to their React components.
 */
import type { ComponentType } from 'react';

import { BtcHeroPanel } from './BtcHeroPanel';
import { BtcHeroGbpPanel } from './BtcHeroGbpPanel';
import { BtcMarketGbpPanel } from './BtcMarketGbpPanel';
import { BtcMiningGbpPanel } from './BtcMiningGbpPanel';
import { IndicesUkPanel } from './IndicesUkPanel';
import { CentralBankUkPanel } from './CentralBankUkPanel';
import { BtcSatsHeroPanel } from './BtcSatsHeroPanel';
import { BtcMarketPanel } from './BtcMarketPanel';
import { BtcPricedInPanel } from './BtcPricedInPanel';
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
import { EpochAlmanacPanel } from './EpochAlmanacPanel';
import { UTXOAgeDistributionPanel } from './UTXOAgeDistributionPanel';
import { LTHSTHSupplyPanel } from './LTHSTHSupplyPanel';
import { CoinDaysDestroyedPanel } from './CoinDaysDestroyedPanel';
import { URPDPanel } from './URPDPanel';
import { HSeparatorPanel } from './HSeparatorPanel';
import { VSeparatorPanel } from './VSeparatorPanel';
import { M2ChartPanel } from './M2ChartPanel';
import { GlobalLiquidityPanel } from './GlobalLiquidityPanel';
import { PMIPanel } from './PMIPanel';
import { YieldSpreadPanel } from './YieldSpreadPanel';
import { GiltSpreadPanel } from './GiltSpreadPanel';
import { RealYieldsPanel } from './RealYieldsPanel';
import { PowerLawPanel } from './PowerLawPanel';
import { UkCpiPanel } from './UkCpiPanel';
import { HashRibbonPanel } from './HashRibbonPanel';
import { PuellMultiplePanel } from './PuellMultiplePanel';
import { NetworkSignalsPanel } from './NetworkSignalsPanel';
import { BitcoinArgumentPanel } from './BitcoinArgumentPanel';
import { SignalInterpreterPanel } from './SignalInterpreterPanel';
import { CohortAnalysisPanel } from './CohortAnalysisPanel';
import { OnChainAnalysisPanel } from './OnChainAnalysisPanel';
import { MacroAnalysisPanel } from './MacroAnalysisPanel';
import { SovereignDebtClockPanel } from './SovereignDebtClockPanel';
import { DebtToGDPPanel } from './DebtToGDPPanel';
import { TreasuryHoldersPanel } from './TreasuryHoldersPanel';
import { DebtServicePanel } from './DebtServicePanel';
import {
  MinerProfitPanel,
  HashPricePanel,
  HashRibbonMinerPanel,
  EnergyGravityPanel,
  MiningConfluencePanel,
  HashrateDistributionPanel,
  SecurityOutlookPanel,
  MinerTreasuryPanel,
  HashpriceSpreadPanel,
} from './mining';

export const PANEL_COMPONENTS: Record<string, ComponentType> = {
  'btc-hero': BtcHeroPanel,
  'btc-hero-gbp': BtcHeroGbpPanel,
  'btc-market-gbp': BtcMarketGbpPanel,
  'btc-mining-gbp': BtcMiningGbpPanel,
  'market-indices-uk': IndicesUkPanel,
  'central-bank-uk':   CentralBankUkPanel,
  'btc-sats-hero': BtcSatsHeroPanel,
  'btc-market': BtcMarketPanel,
  'btc-priced-in': BtcPricedInPanel,
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
  'epoch-almanac': EpochAlmanacPanel,
  'utxo-age-dist':  UTXOAgeDistributionPanel,
  'lth-sth-supply':  LTHSTHSupplyPanel,
  'cdd':             CoinDaysDestroyedPanel,
  'urpd':            URPDPanel,
  'h-separator':     HSeparatorPanel,
  'v-separator':     VSeparatorPanel,
  'm2-chart':          M2ChartPanel,
  'global-liquidity':  GlobalLiquidityPanel,
  'pmi-cycle':         PMIPanel,
  'yield-spread':      YieldSpreadPanel,
  'gilt-spread':       GiltSpreadPanel,
  'real-yields':       RealYieldsPanel,
  'power-law':         PowerLawPanel,
  'uk-cpi':            UkCpiPanel,
  'hash-ribbon':       HashRibbonPanel,
  'puell-multiple':    PuellMultiplePanel,
  'network-signals':   NetworkSignalsPanel,
  'bitcoin-argument':  BitcoinArgumentPanel,
  'signal-interpreter': SignalInterpreterPanel,
  'cohort-analysis':    CohortAnalysisPanel,
  'onchain-analysis':   OnChainAnalysisPanel,
  'macro-analysis':     MacroAnalysisPanel,
  'sovereign-debt-clock':  SovereignDebtClockPanel,
  'debt-to-gdp':           DebtToGDPPanel,
  'treasury-holders':      TreasuryHoldersPanel,
  'debt-service':          DebtServicePanel,
  // Mining Intel — sourced from /api/mining-intel via useMiningIntel
  'mining-profit':         MinerProfitPanel,
  'mining-hash-price':     HashPricePanel,
  'mining-hash-ribbon':    HashRibbonMinerPanel,
  'mining-energy-gravity': EnergyGravityPanel,
  'mining-confluence':     MiningConfluencePanel,
  'mining-hashrate-dist':  HashrateDistributionPanel,
  'mining-security':       SecurityOutlookPanel,
  'mining-treasury':       MinerTreasuryPanel,
  'mining-spread':         HashpriceSpreadPanel,
};
