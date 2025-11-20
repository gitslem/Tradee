export interface ExchangeFees {
  maker: number // Maker fee percentage
  taker: number // Taker fee percentage
  funding: number // Typical funding rate (for perpetual futures)
}

export interface LeverageTier {
  maxLeverage: number
  maintenanceMarginRate: number // Percentage
  description: string
}

export interface ExchangeConfig {
  id: string
  name: string
  displayName: string
  icon: string // Emoji for now

  // Account Types Available
  accountTypes: {
    spot: boolean
    futures: boolean
    margin: boolean
  }

  // Fee Structure
  fees: {
    spot: ExchangeFees
    futures: ExchangeFees
    margin: ExchangeFees
  }

  // Leverage Information
  maxLeverage: {
    spot: number
    futures: number
    margin: number
  }

  // Maintenance Margin Tiers (for futures)
  leverageTiers: LeverageTier[]

  // Other Info
  minTradeAmount: number // Minimum trade in USDT
  fundingInterval: number // Hours between funding payments

  // Platform URLs
  website: string
  featuresUrl?: string
}

export const EXCHANGES: Record<string, ExchangeConfig> = {
  binance: {
    id: 'binance',
    name: 'Binance',
    displayName: 'Binance',
    icon: '🟡',

    accountTypes: {
      spot: true,
      futures: true,
      margin: true
    },

    fees: {
      spot: {
        maker: 0.1,
        taker: 0.1,
        funding: 0.01 // 0.01% typical
      },
      futures: {
        maker: 0.02,
        taker: 0.05,
        funding: 0.01
      },
      margin: {
        maker: 0.1,
        taker: 0.1,
        funding: 0.0
      }
    },

    maxLeverage: {
      spot: 3,
      futures: 125,
      margin: 10
    },

    leverageTiers: [
      { maxLeverage: 20, maintenanceMarginRate: 0.5, description: 'Low Risk' },
      { maxLeverage: 50, maintenanceMarginRate: 1.0, description: 'Medium Risk' },
      { maxLeverage: 125, maintenanceMarginRate: 2.5, description: 'High Risk' }
    ],

    minTradeAmount: 10,
    fundingInterval: 8,
    website: 'https://www.binance.com',
    featuresUrl: 'https://www.binance.com/en/fee/schedule'
  },

  bybit: {
    id: 'bybit',
    name: 'Bybit',
    displayName: 'Bybit',
    icon: '🟠',

    accountTypes: {
      spot: true,
      futures: true,
      margin: false
    },

    fees: {
      spot: {
        maker: 0.1,
        taker: 0.1,
        funding: 0.0
      },
      futures: {
        maker: 0.02,
        taker: 0.055,
        funding: 0.01
      },
      margin: {
        maker: 0.1,
        taker: 0.1,
        funding: 0.0
      }
    },

    maxLeverage: {
      spot: 1,
      futures: 100,
      margin: 1
    },

    leverageTiers: [
      { maxLeverage: 25, maintenanceMarginRate: 0.5, description: 'Low Risk' },
      { maxLeverage: 50, maintenanceMarginRate: 1.0, description: 'Medium Risk' },
      { maxLeverage: 100, maintenanceMarginRate: 2.5, description: 'High Risk' }
    ],

    minTradeAmount: 10,
    fundingInterval: 8,
    website: 'https://www.bybit.com',
    featuresUrl: 'https://www.bybit.com/en/help-center/article/Trading-Fee-Structure'
  },

  kucoin: {
    id: 'kucoin',
    name: 'KuCoin',
    displayName: 'KuCoin',
    icon: '🟢',

    accountTypes: {
      spot: true,
      futures: true,
      margin: true
    },

    fees: {
      spot: {
        maker: 0.1,
        taker: 0.1,
        funding: 0.0
      },
      futures: {
        maker: 0.02,
        taker: 0.06,
        funding: 0.01
      },
      margin: {
        maker: 0.1,
        taker: 0.1,
        funding: 0.0
      }
    },

    maxLeverage: {
      spot: 10,
      futures: 100,
      margin: 10
    },

    leverageTiers: [
      { maxLeverage: 20, maintenanceMarginRate: 0.5, description: 'Low Risk' },
      { maxLeverage: 50, maintenanceMarginRate: 1.0, description: 'Medium Risk' },
      { maxLeverage: 100, maintenanceMarginRate: 2.0, description: 'High Risk' }
    ],

    minTradeAmount: 10,
    fundingInterval: 8,
    website: 'https://www.kucoin.com',
    featuresUrl: 'https://www.kucoin.com/vip/level'
  },

  coinbase: {
    id: 'coinbase',
    name: 'Coinbase',
    displayName: 'Coinbase',
    icon: '🔵',

    accountTypes: {
      spot: true,
      futures: false,
      margin: false
    },

    fees: {
      spot: {
        maker: 0.4, // Higher fees for retail
        taker: 0.6,
        funding: 0.0
      },
      futures: {
        maker: 0.0,
        taker: 0.0,
        funding: 0.0
      },
      margin: {
        maker: 0.0,
        taker: 0.0,
        funding: 0.0
      }
    },

    maxLeverage: {
      spot: 1, // No leverage on regular Coinbase
      futures: 1,
      margin: 1
    },

    leverageTiers: [
      { maxLeverage: 1, maintenanceMarginRate: 0.0, description: 'Spot Only' }
    ],

    minTradeAmount: 10,
    fundingInterval: 0,
    website: 'https://www.coinbase.com',
    featuresUrl: 'https://www.coinbase.com/advanced-fees'
  }
}

export type AccountType = 'spot' | 'futures' | 'margin'

export const getExchangeConfig = (exchangeId: string): ExchangeConfig => {
  return EXCHANGES[exchangeId] || EXCHANGES.binance
}

export const getExchangeFees = (exchangeId: string, accountType: AccountType): ExchangeFees => {
  const exchange = getExchangeConfig(exchangeId)
  return exchange.fees[accountType]
}

export const getMaxLeverage = (exchangeId: string, accountType: AccountType): number => {
  const exchange = getExchangeConfig(exchangeId)
  return exchange.maxLeverage[accountType]
}

export const getMaintenanceMargin = (exchangeId: string, leverage: number): number => {
  const exchange = getExchangeConfig(exchangeId)

  // Find the appropriate tier
  for (const tier of exchange.leverageTiers) {
    if (leverage <= tier.maxLeverage) {
      return tier.maintenanceMarginRate
    }
  }

  // Return highest tier if leverage exceeds all
  return exchange.leverageTiers[exchange.leverageTiers.length - 1].maintenanceMarginRate
}

export const calculateFundingCost = (
  exchangeId: string,
  accountType: AccountType,
  positionSize: number,
  hoursHeld: number = 24
): number => {
  const exchange = getExchangeConfig(exchangeId)
  const fees = getExchangeFees(exchangeId, accountType)

  if (accountType !== 'futures' || exchange.fundingInterval === 0) {
    return 0
  }

  const fundingPayments = Math.floor(hoursHeld / exchange.fundingInterval)
  return positionSize * (fees.funding / 100) * fundingPayments
}
