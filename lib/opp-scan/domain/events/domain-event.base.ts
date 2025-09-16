/**
 * Domain Event Base Classes
 * Provides the foundation for domain-driven design events
 */

import { DomainEvent as IDomainEvent } from '../../core/interfaces'

export abstract class DomainEvent<TPayload = any> implements IDomainEvent<TPayload> {
  public readonly id: string
  public readonly timestamp: Date
  public readonly correlationId?: string
  public readonly causationId?: string
  public readonly metadata: Record<string, any>

  constructor(
    public readonly type: string,
    public readonly payload: TPayload,
    correlationId?: string,
    causationId?: string,
    metadata: Record<string, any> = {}
  ) {
    this.id = this.generateEventId()
    this.timestamp = new Date()
    this.correlationId = correlationId
    this.causationId = causationId
    this.metadata = {
      ...metadata,
      eventVersion: this.getEventVersion(),
      aggregateType: this.getAggregateType()
    }
  }

  protected abstract getEventVersion(): string
  protected abstract getAggregateType(): string

  private generateEventId(): string {
    // Simple UUID v4 generator - in production would use crypto.randomUUID() or uuid library
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      payload: this.payload,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
      metadata: this.metadata
    }
  }

  static fromJSON<T extends DomainEvent>(
    eventClass: new (...args: unknown[]) => T,
    data: Record<string, any>
  ): T {
    const event = Object.create(eventClass.prototype)
    event.id = data.id
    event.type = data.type
    event.payload = data.payload
    event.timestamp = new Date(data.timestamp)
    event.correlationId = data.correlationId
    event.causationId = data.causationId
    event.metadata = data.metadata || {}
    return event
  }
}

/**
 * Integration Event for cross-service communication
 */
export abstract class IntegrationEvent<TPayload = any> extends DomainEvent<TPayload> {
  constructor(
    type: string,
    payload: TPayload,
    correlationId?: string,
    causationId?: string,
    metadata: Record<string, any> = {}
  ) {
    super(type, payload, correlationId, causationId, {
      ...metadata,
      isIntegrationEvent: true
    })
  }
}

/**
 * Event Bus interface for publishing and subscribing to events
 */
export interface IEventBus {
  publish<T>(event: DomainEvent<T>): Promise<void>
  publishMany<T>(events: DomainEvent<T>[]): Promise<void>
  subscribe<T>(eventType: string, handler: EventHandler<T>): string
  unsubscribe(subscriptionId: string): void
  clear(): void
}

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void

/**
 * In-memory event bus implementation for development/testing
 */
export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Map<string, EventHandler>>()

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const eventHandlers = this.handlers.get(event.type)
    if (!eventHandlers) return

    const promises = Array.from(eventHandlers.values()).map(handler => {
      try {
        const result = handler(event)
        return result instanceof Promise ? result : Promise.resolve()
      } catch (error) {
        console.error(`Error handling event ${event.type}:`, error)
        return Promise.resolve() // Don't let one handler failure stop others
      }
    })

    await Promise.allSettled(promises)
  }

  async publishMany<T>(events: DomainEvent<T>[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)))
  }

  subscribe<T>(eventType: string, handler: EventHandler<T>): string {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map())
    }

    const subscriptionId = this.generateSubscriptionId()
    this.handlers.get(eventType)!.set(subscriptionId, handler as EventHandler)
    
    return subscriptionId
  }

  unsubscribe(subscriptionId: string): void {
    for (const [eventType, handlers] of this.handlers.entries()) {
      if (handlers.delete(subscriptionId)) {
        if (handlers.size === 0) {
          this.handlers.delete(eventType)
        }
        break
      }
    }
  }

  clear(): void {
    this.handlers.clear()
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Event store interface for persisting events
 */
export interface IEventStore {
  append(streamId: string, events: DomainEvent[], expectedVersion?: number): Promise<void>
  getEvents(streamId: string, fromVersion?: number): Promise<DomainEvent[]>
  getAllEvents(eventTypes?: string[]): Promise<DomainEvent[]>
}

/**
 * Simple in-memory event store for development/testing
 */
export class InMemoryEventStore implements IEventStore {
  private streams = new Map<string, DomainEvent[]>()
  private allEvents: DomainEvent[] = []

  async append(streamId: string, events: DomainEvent[], expectedVersion?: number): Promise<void> {
    if (!this.streams.has(streamId)) {
      this.streams.set(streamId, [])
    }

    const stream = this.streams.get(streamId)!
    
    if (expectedVersion !== undefined && stream.length !== expectedVersion) {
      throw new Error(`Expected version ${expectedVersion} but found ${stream.length}`)
    }

    stream.push(...events)
    this.allEvents.push(...events)
  }

  async getEvents(streamId: string, fromVersion: number = 0): Promise<DomainEvent[]> {
    const stream = this.streams.get(streamId) || []
    return stream.slice(fromVersion)
  }

  async getAllEvents(eventTypes?: string[]): Promise<DomainEvent[]> {
    if (!eventTypes) {
      return [...this.allEvents]
    }

    return this.allEvents.filter(event => eventTypes.includes(event.type))
  }
}