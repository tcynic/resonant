/**
 * AI Cost Tracking and Budget Management
 * Comprehensive cost tracking with budget alerts and usage analytics
 */

import { AnalysisType } from '../types'
import { aiMonitoring } from './monitoring'
import { AIResourceLimitError } from './errors'

// Cost tracking configuration
interface CostTrackingConfig {
  // Budget limits (in USD cents)
  dailyBudget: number
  weeklyBudget: number
  monthlyBudget: number
  
  // Alert thresholds (percentages)
  warningThreshold: number    // 70%
  criticalThreshold: number   // 90%
  
  // Cost allocation per analysis type
  analysisTypeLimits: Record<AnalysisType, number>
  
  // User/organization limits
  userDailyLimit: number
  organizationDailyLimit: number
}

// Cost record for tracking
interface CostRecord {
  id: string
  timestamp: number
  analysisType: AnalysisType
  operation: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  actualCost?: number
  userId?: string
  organizationId?: string
  requestId?: string
  metadata?: Record<string, unknown>
}

// Budget alert
interface BudgetAlert {
  id: string
  timestamp: number
  type: 'warning' | 'critical' | 'exceeded'
  period: 'daily' | 'weekly' | 'monthly' | 'user' | 'organization'
  currentCost: number
  budgetLimit: number
  percentageUsed: number
  affectedServices: string[]
  recommendedActions: string[]
}

// Cost summary for reporting
interface CostSummary {
  period: 'day' | 'week' | 'month'
  startDate: Date
  endDate: Date
  totalCost: number
  totalRequests: number
  totalTokens: number
  averageCostPerRequest: number
  averageCostPerToken: number
  byAnalysisType: Record<AnalysisType, {
    cost: number
    requests: number
    tokens: number
    percentage: number
  }>
  topUsers?: Array<{
    userId: string
    cost: number
    requests: number
    percentage: number
  }>
  budgetUtilization: {
    daily: number
    weekly: number
    monthly: number
  }
}

// Default configuration
const DEFAULT_CONFIG: CostTrackingConfig = {
  dailyBudget: 1000,      // $10.00
  weeklyBudget: 5000,     // $50.00
  monthlyBudget: 15000,   // $150.00
  
  warningThreshold: 70,
  criticalThreshold: 90,
  
  analysisTypeLimits: {
    sentiment: 400,         // $4.00 daily
    emotional_stability: 300, // $3.00 daily
    energy_impact: 200,     // $2.00 daily
    conflict_resolution: 100, // $1.00 daily
    gratitude: 150          // $1.50 daily
  },
  
  userDailyLimit: 50,     // $0.50 per user daily
  organizationDailyLimit: 800 // $8.00 per org daily
}

export class AICostTracker {
  private config: CostTrackingConfig
  private costRecords: CostRecord[] = []
  private alerts: BudgetAlert[] = []
  private budgetState = {
    dailySpent: 0,
    weeklySpent: 0,
    monthlySpent: 0,
    lastResetDay: new Date().getDate(),
    lastResetWeek: this.getWeekNumber(new Date()),
    lastResetMonth: new Date().getMonth()
  }

  constructor(config?: Partial<CostTrackingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loadBudgetState()
    this.startBudgetResetTimer()
    
    console.info('💰 AI Cost Tracker initialized', {
      dailyBudget: `$${(this.config.dailyBudget / 100).toFixed(2)}`,
      weeklyBudget: `$${(this.config.weeklyBudget / 100).toFixed(2)}`,
      monthlyBudget: `$${(this.config.monthlyBudget / 100).toFixed(2)}`
    })
  }

  // Record a cost transaction
  recordCost(record: Omit<CostRecord, 'id' | 'timestamp'>): string {
    const costRecord: CostRecord = {
      id: `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...record
    }

    this.costRecords.push(costRecord)
    
    // Update budget tracking
    const cost = record.actualCost || record.estimatedCost
    this.budgetState.dailySpent += cost
    this.budgetState.weeklySpent += cost
    this.budgetState.monthlySpent += cost

    // Check budget thresholds
    this.checkBudgetAlerts()

    // Log to monitoring
    aiMonitoring.recordMetric({
      timestamp: costRecord.timestamp,
      analysisType: record.analysisType,
      operation: record.operation,
      duration: 0,
      success: true,
      tokens: record.totalTokens,
      cost: cost / 100, // Convert to dollars
      userId: record.userId
    })

    // Cleanup old records periodically
    this.cleanupOldRecords()

    console.debug(`💸 Recorded cost: $${(cost / 100).toFixed(4)} for ${record.analysisType}`)

    return costRecord.id
  }

  // Check if operation is within budget
  checkBudget(
    analysisType: AnalysisType,
    estimatedCost: number,
    userId?: string,
    organizationId?: string
  ): {
    allowed: boolean
    reason?: string
    currentSpend: number
    budgetLimit: number
    percentageUsed: number
  } {
    // Check daily budget
    if (this.budgetState.dailySpent + estimatedCost > this.config.dailyBudget) {
      return {
        allowed: false,
        reason: 'Daily budget exceeded',
        currentSpend: this.budgetState.dailySpent,
        budgetLimit: this.config.dailyBudget,
        percentageUsed: (this.budgetState.dailySpent / this.config.dailyBudget) * 100
      }
    }

    // Check analysis type limit
    const typeSpend = this.getAnalysisTypeSpend(analysisType, 'day')
    const typeLimit = this.config.analysisTypeLimits[analysisType]
    if (typeSpend + estimatedCost > typeLimit) {
      return {
        allowed: false,
        reason: `Analysis type (${analysisType}) daily budget exceeded`,
        currentSpend: typeSpend,
        budgetLimit: typeLimit,
        percentageUsed: (typeSpend / typeLimit) * 100
      }
    }

    // Check user limit
    if (userId) {
      const userSpend = this.getUserSpend(userId, 'day')
      if (userSpend + estimatedCost > this.config.userDailyLimit) {
        return {
          allowed: false,
          reason: 'User daily budget exceeded',
          currentSpend: userSpend,
          budgetLimit: this.config.userDailyLimit,
          percentageUsed: (userSpend / this.config.userDailyLimit) * 100
        }
      }
    }

    // Check organization limit
    if (organizationId) {
      const orgSpend = this.getOrganizationSpend(organizationId, 'day')
      if (orgSpend + estimatedCost > this.config.organizationDailyLimit) {
        return {
          allowed: false,
          reason: 'Organization daily budget exceeded',
          currentSpend: orgSpend,
          budgetLimit: this.config.organizationDailyLimit,
          percentageUsed: (orgSpend / this.config.organizationDailyLimit) * 100
        }
      }
    }

    return {
      allowed: true,
      currentSpend: this.budgetState.dailySpent,
      budgetLimit: this.config.dailyBudget,
      percentageUsed: (this.budgetState.dailySpent / this.config.dailyBudget) * 100
    }
  }

  private checkBudgetAlerts(): void {
    const now = Date.now()
    
    // Check daily budget
    const dailyUsage = (this.budgetState.dailySpent / this.config.dailyBudget) * 100
    this.checkThresholdAlert('daily', dailyUsage, this.budgetState.dailySpent, this.config.dailyBudget)

    // Check weekly budget
    const weeklyUsage = (this.budgetState.weeklySpent / this.config.weeklyBudget) * 100
    this.checkThresholdAlert('weekly', weeklyUsage, this.budgetState.weeklySpent, this.config.weeklyBudget)

    // Check monthly budget
    const monthlyUsage = (this.budgetState.monthlySpent / this.config.monthlyBudget) * 100
    this.checkThresholdAlert('monthly', monthlyUsage, this.budgetState.monthlySpent, this.config.monthlyBudget)
  }

  private checkThresholdAlert(
    period: 'daily' | 'weekly' | 'monthly',
    usagePercentage: number,
    currentCost: number,
    budgetLimit: number
  ): void {
    let alertType: 'warning' | 'critical' | 'exceeded' | null = null

    if (usagePercentage >= 100) {
      alertType = 'exceeded'
    } else if (usagePercentage >= this.config.criticalThreshold) {
      alertType = 'critical'
    } else if (usagePercentage >= this.config.warningThreshold) {
      alertType = 'warning'
    }

    if (alertType) {
      // Check if we already have a recent alert of this type
      const recentAlert = this.alerts.find(alert => 
        alert.period === period && 
        alert.type === alertType &&
        Date.now() - alert.timestamp < 60 * 60 * 1000 // Within last hour
      )

      if (!recentAlert) {
        this.createBudgetAlert(alertType, period, currentCost, budgetLimit, usagePercentage)
      }
    }
  }

  private createBudgetAlert(
    type: 'warning' | 'critical' | 'exceeded',
    period: 'daily' | 'weekly' | 'monthly',
    currentCost: number,
    budgetLimit: number,
    percentageUsed: number
  ): void {
    const alert: BudgetAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      period,
      currentCost,
      budgetLimit,
      percentageUsed,
      affectedServices: ['AI Analysis'],
      recommendedActions: this.getRecommendedActions(type, period)
    }

    this.alerts.push(alert)

    // Log alert
    const message = `${period.toUpperCase()} budget ${type}: ${percentageUsed.toFixed(1)}% used ($${(currentCost/100).toFixed(2)}/$${(budgetLimit/100).toFixed(2)})`
    
    if (type === 'exceeded') {
      console.error(`🚨 ${message}`)
      
      // Log as error to monitoring
      aiMonitoring.logError(
        new AIResourceLimitError('daily', percentageUsed, 100, {
          alertType: type,
          message: `Budget exceeded: ${message}`,
          period,
          currentCost,
          budgetLimit,
          percentageUsed
        })
      )
    } else {
      console.warn(`⚠️ ${message}`)
    }
  }

  private getRecommendedActions(type: 'warning' | 'critical' | 'exceeded', period: string): string[] {
    const actions = []

    if (type === 'warning') {
      actions.push('Monitor usage closely')
      actions.push('Review analysis frequency')
      actions.push('Consider optimizing prompts to reduce token usage')
    } else if (type === 'critical') {
      actions.push('Reduce non-essential analysis requests')
      actions.push('Implement stricter user quotas')
      actions.push('Consider upgrading budget limits')
    } else if (type === 'exceeded') {
      actions.push('Pause non-critical analysis operations')
      actions.push('Review and increase budget if necessary')
      actions.push('Investigate unexpected usage spikes')
      actions.push('Contact administrator')
    }

    return actions
  }

  // Get spending for specific analysis type
  private getAnalysisTypeSpend(analysisType: AnalysisType, period: 'day' | 'week' | 'month'): number {
    const cutoff = this.getPeriodCutoff(period)
    return this.costRecords
      .filter(record => record.timestamp >= cutoff && record.analysisType === analysisType)
      .reduce((sum, record) => sum + (record.actualCost || record.estimatedCost), 0)
  }

  // Get spending for specific user
  private getUserSpend(userId: string, period: 'day' | 'week' | 'month'): number {
    const cutoff = this.getPeriodCutoff(period)
    return this.costRecords
      .filter(record => record.timestamp >= cutoff && record.userId === userId)
      .reduce((sum, record) => sum + (record.actualCost || record.estimatedCost), 0)
  }

  // Get spending for specific organization
  private getOrganizationSpend(organizationId: string, period: 'day' | 'week' | 'month'): number {
    const cutoff = this.getPeriodCutoff(period)
    return this.costRecords
      .filter(record => record.timestamp >= cutoff && record.organizationId === organizationId)
      .reduce((sum, record) => sum + (record.actualCost || record.estimatedCost), 0)
  }

  private getPeriodCutoff(period: 'day' | 'week' | 'month'): number {
    const now = new Date()
    
    switch (period) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      case 'week':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        return startOfWeek.getTime()
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      default:
        return 0
    }
  }

  // Generate cost summary report
  generateCostSummary(period: 'day' | 'week' | 'month'): CostSummary {
    const cutoff = this.getPeriodCutoff(period)
    const periodRecords = this.costRecords.filter(record => record.timestamp >= cutoff)
    
    const totalCost = periodRecords.reduce((sum, record) => sum + (record.actualCost || record.estimatedCost), 0)
    const totalRequests = periodRecords.length
    const totalTokens = periodRecords.reduce((sum, record) => sum + record.totalTokens, 0)

    // Group by analysis type
    const byAnalysisType: Record<AnalysisType, any> = {} as any
    for (const analysisType of ['sentiment', 'emotional_stability', 'energy_impact', 'conflict_resolution'] as AnalysisType[]) {
      const typeRecords = periodRecords.filter(r => r.analysisType === analysisType)
      const typeCost = typeRecords.reduce((sum, r) => sum + (r.actualCost || r.estimatedCost), 0)
      
      byAnalysisType[analysisType] = {
        cost: typeCost,
        requests: typeRecords.length,
        tokens: typeRecords.reduce((sum, r) => sum + r.totalTokens, 0),
        percentage: totalCost > 0 ? (typeCost / totalCost) * 100 : 0
      }
    }

    // Top users
    const userCosts = new Map<string, { cost: number; requests: number }>()
    periodRecords.forEach(record => {
      if (record.userId) {
        const current = userCosts.get(record.userId) || { cost: 0, requests: 0 }
        current.cost += record.actualCost || record.estimatedCost
        current.requests += 1
        userCosts.set(record.userId, current)
      }
    })

    const topUsers = Array.from(userCosts.entries())
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 10)
      .map(([userId, data]) => ({
        userId,
        cost: data.cost,
        requests: data.requests,
        percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0
      }))

    return {
      period,
      startDate: new Date(cutoff),
      endDate: new Date(),
      totalCost,
      totalRequests,
      totalTokens,
      averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      averageCostPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
      byAnalysisType,
      topUsers,
      budgetUtilization: {
        daily: (this.budgetState.dailySpent / this.config.dailyBudget) * 100,
        weekly: (this.budgetState.weeklySpent / this.config.weeklyBudget) * 100,
        monthly: (this.budgetState.monthlySpent / this.config.monthlyBudget) * 100
      }
    }
  }

  // Get current budget status
  getBudgetStatus(): {
    daily: { spent: number; limit: number; percentage: number; remaining: number }
    weekly: { spent: number; limit: number; percentage: number; remaining: number }
    monthly: { spent: number; limit: number; percentage: number; remaining: number }
    alerts: BudgetAlert[]
    nextReset: {
      daily: Date
      weekly: Date
      monthly: Date
    }
  } {
    const now = new Date()
    
    return {
      daily: {
        spent: this.budgetState.dailySpent,
        limit: this.config.dailyBudget,
        percentage: (this.budgetState.dailySpent / this.config.dailyBudget) * 100,
        remaining: this.config.dailyBudget - this.budgetState.dailySpent
      },
      weekly: {
        spent: this.budgetState.weeklySpent,
        limit: this.config.weeklyBudget,
        percentage: (this.budgetState.weeklySpent / this.config.weeklyBudget) * 100,
        remaining: this.config.weeklyBudget - this.budgetState.weeklySpent
      },
      monthly: {
        spent: this.budgetState.monthlySpent,
        limit: this.config.monthlyBudget,
        percentage: (this.budgetState.monthlySpent / this.config.monthlyBudget) * 100,
        remaining: this.config.monthlyBudget - this.budgetState.monthlySpent
      },
      alerts: this.alerts.slice(-10), // Last 10 alerts
      nextReset: {
        daily: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        weekly: (() => {
          const nextWeek = new Date(now)
          nextWeek.setDate(now.getDate() + (7 - now.getDay()))
          nextWeek.setHours(0, 0, 0, 0)
          return nextWeek
        })(),
        monthly: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      }
    }
  }

  // Reset budget periods
  private startBudgetResetTimer(): void {
    setInterval(() => {
      const now = new Date()
      
      // Reset daily budget
      if (now.getDate() !== this.budgetState.lastResetDay) {
        this.budgetState.dailySpent = 0
        this.budgetState.lastResetDay = now.getDate()
        console.info('📅 Daily budget reset')
      }
      
      // Reset weekly budget
      const currentWeek = this.getWeekNumber(now)
      if (currentWeek !== this.budgetState.lastResetWeek) {
        this.budgetState.weeklySpent = 0
        this.budgetState.lastResetWeek = currentWeek
        console.info('📅 Weekly budget reset')
      }
      
      // Reset monthly budget
      if (now.getMonth() !== this.budgetState.lastResetMonth) {
        this.budgetState.monthlySpent = 0
        this.budgetState.lastResetMonth = now.getMonth()
        console.info('📅 Monthly budget reset')
      }
    }, 60 * 60 * 1000) // Check every hour
  }

  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7)
  }

  private loadBudgetState(): void {
    // In production, this would load from persistent storage
    // For now, we'll keep it in memory
  }

  private cleanupOldRecords(): void {
    // Keep records for 90 days
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000)
    this.costRecords = this.costRecords.filter(record => record.timestamp >= cutoff)
    
    // Keep alerts for 30 days
    const alertCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000)
    this.alerts = this.alerts.filter(alert => alert.timestamp >= alertCutoff)
  }

  // Update configuration
  updateConfig(newConfig: Partial<CostTrackingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.info('💰 Cost tracker configuration updated', newConfig)
  }

  // Export cost data for external analysis
  exportCostData(startDate: Date, endDate: Date): CostRecord[] {
    return this.costRecords.filter(record => 
      record.timestamp >= startDate.getTime() && 
      record.timestamp <= endDate.getTime()
    )
  }
}

// Singleton cost tracker
let defaultCostTracker: AICostTracker | null = null

export function getAICostTracker(config?: Partial<CostTrackingConfig>): AICostTracker {
  // In test environment, always create new instance for test isolation
  if (process.env.NODE_ENV === 'test') {
    return new AICostTracker(config)
  }
  
  if (!defaultCostTracker) {
    defaultCostTracker = new AICostTracker(config)
  }
  return defaultCostTracker
}

// Test helper function to reset singleton
export function resetAICostTracker(): void {
  if (process.env.NODE_ENV === 'test') {
    defaultCostTracker = null
  }
}

// Helper function to check budget before operations
export async function checkBudget(
  analysisType: AnalysisType,
  estimatedCost: number,
  userId?: string,
  organizationId?: string
): Promise<void> {
  // Skip budget checks in test environment
  if (process.env.NODE_ENV === 'test' && process.env.AI_RATE_LIMITING_DISABLED === 'true') {
    return
  }
  
  const costTracker = getAICostTracker()
  const budgetCheck = costTracker.checkBudget(analysisType, estimatedCost, userId, organizationId)
  
  if (!budgetCheck.allowed) {
    throw new AIResourceLimitError('daily', budgetCheck.currentSpend, budgetCheck.budgetLimit, {
      currentSpend: budgetCheck.currentSpend,
      budgetLimit: budgetCheck.budgetLimit,
      percentageUsed: budgetCheck.percentageUsed,
      analysisType,
      estimatedCost,
      reason: `Budget limit exceeded: ${budgetCheck.reason}`
    })
  }
}

export default AICostTracker