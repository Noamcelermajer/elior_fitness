# Codebase Restructuring Plan
## Separating Agent Logic from Handlers Using OOP Principles

**Date:** 2025-01-11  
**Purpose:** Prepare codebase for multi-platform integration (WhatsApp Bot, Web, future platforms)  
**Principle:** Clean separation of concerns with Object-Oriented Programming

---

## Executive Summary

This restructuring plan separates **agent logic** (conversation handling, intent recognition, message processing) from **handlers** (HTTP endpoints, WebSocket handlers, platform-specific adapters). The goal is to create a modular, extensible architecture that can support multiple platforms (Web, WhatsApp, Telegram, etc.) without duplicating business logic.

---

## Current Architecture Analysis

### Current Structure
```
app/
├── routers/          # HTTP/WebSocket handlers (mixed with business logic)
├── services/         # Business logic (mixed with agent logic)
├── models/           # Database models
├── schemas/          # Pydantic schemas
└── auth/             # Authentication utilities
```

### Current Issues Identified

1. **Tight Coupling**: Routers directly call services, making platform-specific changes difficult
2. **Mixed Responsibilities**: Services contain both business logic and agent/conversation logic
3. **No Abstraction Layer**: No clear separation between platform adapters and core logic
4. **Hard to Extend**: Adding WhatsApp requires modifying existing routers/services
5. **Notification Logic Scattered**: Notification triggers, websocket service, and notification service are separate but related

---

## Proposed Architecture

### New Structure Overview
```
app/
├── core/                    # Core business logic (platform-agnostic)
│   ├── domain/              # Domain models and entities
│   ├── services/            # Business logic services
│   └── repositories/       # Data access layer
│
├── agents/                  # Agent/Conversation logic
│   ├── base/               # Base agent classes
│   ├── handlers/           # Intent handlers
│   ├── processors/         # Message processors
│   └── orchestrators/      # Conversation orchestrators
│
├── adapters/                # Platform adapters (OOP interfaces)
│   ├── base/               # Base adapter interfaces
│   ├── web/                # Web/HTTP adapter
│   ├── websocket/          # WebSocket adapter
│   └── whatsapp/           # WhatsApp adapter (future)
│
├── handlers/                # Request handlers (thin layer)
│   ├── http/               # HTTP route handlers
│   ├── websocket/          # WebSocket handlers
│   └── webhook/            # Webhook handlers (WhatsApp, etc.)
│
├── models/                  # Database models (unchanged)
├── schemas/                 # Pydantic schemas (unchanged)
└── auth/                    # Authentication (unchanged)
```

---

## Core Components Design

### 1. Core Layer (`app/core/`)

**Purpose:** Platform-agnostic business logic

#### 1.1 Domain (`app/core/domain/`)
- **Entities**: Pure business objects (User, Workout, Meal, Notification)
- **Value Objects**: Immutable objects (Email, PhoneNumber, WorkoutPlanId)
- **Domain Events**: Events that occur in the domain (WorkoutCompleted, MealLogged)

#### 1.2 Services (`app/core/services/`)
- **UserService**: User management logic
- **WorkoutService**: Workout business logic
- **NutritionService**: Nutrition business logic
- **NotificationService**: Notification business logic
- **FileService**: File management logic

**Key Principle:** These services contain NO platform-specific code (no HTTP, WebSocket, WhatsApp)

#### 1.3 Repositories (`app/core/repositories/`)
- **UserRepository**: Data access for users
- **WorkoutRepository**: Data access for workouts
- **NutritionRepository**: Data access for nutrition
- **NotificationRepository**: Data access for notifications

**Key Principle:** Abstract data access, making it easy to swap databases or add caching

---

### 2. Agents Layer (`app/agents/`)

**Purpose:** Conversation handling, intent recognition, message processing

#### 2.1 Base Agent (`app/agents/base/`)
- **BaseAgent**: Abstract base class for all agents
  - Methods: `process_message()`, `handle_intent()`, `generate_response()`
- **AgentContext**: Context object passed through agent pipeline
  - Contains: user_id, session_id, message, platform, metadata

#### 2.2 Intent Handlers (`app/agents/handlers/`)
- **WorkoutIntentHandler**: Handles workout-related intents
- **NutritionIntentHandler**: Handles nutrition-related intents
- **ProgressIntentHandler**: Handles progress-related intents
- **GeneralIntentHandler**: Handles general queries

**Key Principle:** Each handler is responsible for one domain area

#### 2.3 Message Processors (`app/agents/processors/`)
- **MessageParser**: Parses incoming messages (text, images, voice)
- **IntentRecognizer**: Recognizes user intent from message
- **ContextManager**: Manages conversation context
- **ResponseFormatter**: Formats responses for different platforms

#### 2.4 Orchestrators (`app/agents/orchestrators/`)
- **ConversationOrchestrator**: Coordinates conversation flow
- **MultiStepOrchestrator**: Handles multi-step conversations
- **WorkflowOrchestrator**: Manages complex workflows

---

### 3. Adapters Layer (`app/adapters/`)

**Purpose:** Platform-specific implementations (OOP interfaces)

#### 3.1 Base Adapter (`app/adapters/base/`)
- **MessageAdapter** (Interface):
  - Methods: `receive_message()`, `send_message()`, `send_notification()`
- **PlatformAdapter** (Interface):
  - Methods: `authenticate()`, `get_user_context()`, `format_response()`

#### 3.2 Web Adapter (`app/adapters/web/`)
- **HTTPAdapter**: Implements MessageAdapter for HTTP/REST
- **WebSocketAdapter**: Implements MessageAdapter for WebSocket
- **WebResponseFormatter**: Formats responses for web frontend

#### 3.3 WhatsApp Adapter (`app/adapters/whatsapp/`) - Future
- **WhatsAppAdapter**: Implements MessageAdapter for WhatsApp
- **WhatsAppResponseFormatter**: Formats responses for WhatsApp
- **WhatsAppWebhookHandler**: Handles WhatsApp webhooks

**Key Principle:** Each adapter implements the same interface, making platforms interchangeable

---

### 4. Handlers Layer (`app/handlers/`)

**Purpose:** Thin request handling layer (delegates to adapters and agents)

#### 4.1 HTTP Handlers (`app/handlers/http/`)
- **AuthHandler**: Authentication endpoints
- **UserHandler**: User management endpoints
- **WorkoutHandler**: Workout endpoints
- **NutritionHandler**: Nutrition endpoints

**Key Principle:** Handlers are thin - they validate input, call adapters/agents, return responses

#### 4.2 WebSocket Handlers (`app/handlers/websocket/`)
- **WebSocketHandler**: WebSocket connection management
- **RealtimeHandler**: Real-time message handling

#### 4.3 Webhook Handlers (`app/handlers/webhook/`)
- **WhatsAppWebhookHandler**: WhatsApp webhook processing
- **GenericWebhookHandler**: Generic webhook processing

---

## Data Flow Architecture

### Request Flow (Web)
```
HTTP Request → HTTP Handler → Web Adapter → Agent → Core Service → Repository → Database
                                                      ↓
HTTP Response ← HTTP Handler ← Web Adapter ← Agent ← Core Service
```

### Request Flow (WhatsApp - Future)
```
WhatsApp Webhook → Webhook Handler → WhatsApp Adapter → Agent → Core Service → Repository → Database
                                                              ↓
WhatsApp Message ← Webhook Handler ← WhatsApp Adapter ← Agent ← Core Service
```

### Notification Flow
```
Core Service → Notification Service → Notification Adapter → Platform Adapter → User
```

---

## Key Design Patterns

### 1. Strategy Pattern
- **Use Case**: Different message processing strategies per platform
- **Implementation**: BaseAgent with platform-specific implementations

### 2. Adapter Pattern
- **Use Case**: Convert platform-specific messages to common format
- **Implementation**: PlatformAdapter interface with Web/WhatsApp implementations

### 3. Factory Pattern
- **Use Case**: Create appropriate adapter based on platform
- **Implementation**: AdapterFactory creates Web/WhatsApp adapters

### 4. Repository Pattern
- **Use Case**: Abstract data access
- **Implementation**: Repository interfaces with SQLAlchemy implementations

### 5. Service Layer Pattern
- **Use Case**: Encapsulate business logic
- **Implementation**: Core services contain all business rules

### 6. Command Pattern
- **Use Case**: Handle user intents as commands
- **Implementation**: Intent handlers as command objects

---

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Create `app/core/` structure
2. Move business logic from `app/services/` to `app/core/services/`
3. Create repository interfaces
4. Extract domain models

### Phase 2: Agent Layer (Week 3-4)
1. Create `app/agents/` structure
2. Implement BaseAgent and AgentContext
3. Create intent handlers for existing functionality
4. Implement message processors

### Phase 3: Adapter Layer (Week 5-6)
1. Create `app/adapters/` structure
2. Implement base adapter interfaces
3. Create Web adapter (refactor existing HTTP/WebSocket code)
4. Test adapter with existing web frontend

### Phase 4: Handler Refactoring (Week 7-8)
1. Create `app/handlers/` structure
2. Refactor existing routers to use new handlers
3. Update handlers to use adapters and agents
4. Maintain backward compatibility

### Phase 5: WhatsApp Integration (Week 9-10)
1. Implement WhatsApp adapter
2. Create WhatsApp webhook handlers
3. Test WhatsApp integration
4. Document WhatsApp API

### Phase 6: Cleanup (Week 11-12)
1. Remove old code
2. Update tests
3. Update documentation
4. Performance optimization

---

## Benefits of This Architecture

### 1. Modularity
- Each layer has a single responsibility
- Easy to understand and maintain
- Changes in one layer don't affect others

### 2. Extensibility
- Adding new platforms requires only implementing adapter interface
- New intents can be added without modifying existing code
- Business logic changes don't affect platform code

### 3. Testability
- Each layer can be tested independently
- Mock adapters for testing
- Unit tests for core services

### 4. Scalability
- Can add multiple platforms simultaneously
- Can scale different layers independently
- Easy to add caching, queues, etc.

### 5. Maintainability
- Clear separation of concerns
- Easy to locate and fix bugs
- Consistent code structure

---

## Platform Integration Examples

### WhatsApp Bot Integration
```
WhatsApp Message → WhatsApp Adapter → Agent → Core Service
```

**WhatsApp-specific considerations:**
- Text messages, images, voice notes
- Quick replies, buttons
- Media handling (images, documents)
- Session management per phone number

### Web Integration (Current)
```
HTTP Request → Web Adapter → Agent → Core Service
WebSocket → WebSocket Adapter → Agent → Core Service
```

**Web-specific considerations:**
- REST API endpoints
- WebSocket real-time updates
- File uploads
- Authentication tokens

### Future Platforms
- **Telegram**: Similar to WhatsApp adapter
- **SMS**: Text-only adapter
- **Voice Assistants**: Voice-to-text adapter
- **Mobile App**: REST API adapter

---

## Notification System Restructuring

### Current State
- `NotificationService`: Creates notifications
- `WebSocketService`: Sends real-time notifications
- `NotificationTriggers`: Triggers notifications
- Scattered across codebase

### Proposed State
```
Core Service → NotificationService → NotificationOrchestrator → Platform Adapters
```

**NotificationOrchestrator:**
- Determines which platforms to notify
- Formats messages per platform
- Handles delivery failures
- Manages notification preferences

**Platform Notification Adapters:**
- `WebNotificationAdapter`: WebSocket notifications
- `WhatsAppNotificationAdapter`: WhatsApp messages
- `EmailNotificationAdapter`: Email notifications (future)
- `SMSNotificationAdapter`: SMS notifications (future)

---

## Dependency Injection

### Current State
- Services instantiated directly
- Hard to test
- Hard to swap implementations

### Proposed State
- Use dependency injection container
- Services injected via constructors
- Easy to mock for testing
- Easy to swap implementations

**Example Structure:**
```
Container:
  - Core Services (UserService, WorkoutService, etc.)
  - Repositories (UserRepository, etc.)
  - Adapters (WebAdapter, WhatsAppAdapter)
  - Agents (ConversationOrchestrator, IntentHandlers)
```

---

## Error Handling Strategy

### Current State
- Errors handled inconsistently
- Platform-specific error handling

### Proposed State
- **Domain Exceptions**: Business logic errors (UserNotFound, InvalidWorkout)
- **Adapter Exceptions**: Platform-specific errors (WhatsAppAPIError, WebSocketError)
- **Agent Exceptions**: Conversation errors (IntentNotRecognized, InvalidContext)

**Error Flow:**
```
Domain Exception → Agent → Adapter → Platform-specific error response
```

---

## Testing Strategy

### Unit Tests
- **Core Services**: Test business logic in isolation
- **Agents**: Test intent recognition and message processing
- **Adapters**: Test platform-specific formatting

### Integration Tests
- **Adapter + Agent**: Test message flow
- **Service + Repository**: Test data operations
- **Handler + Adapter**: Test request handling

### End-to-End Tests
- **Web Flow**: HTTP → Adapter → Agent → Service → Database
- **WhatsApp Flow**: Webhook → Adapter → Agent → Service → Database

---

## Configuration Management

### Platform Configuration
- Each adapter has its own configuration
- Centralized configuration file
- Environment-specific settings

**Example Structure:**
```
config/
├── base.py          # Base configuration
├── web.py           # Web adapter config
├── whatsapp.py      # WhatsApp adapter config
└── agents.py        # Agent configuration
```

---

## Documentation Requirements

### Code Documentation
- Docstrings for all classes and methods
- Type hints throughout
- Architecture decision records (ADRs)

### API Documentation
- Platform-specific API docs
- Agent intent documentation
- Integration guides

### Developer Guides
- How to add new platforms
- How to add new intents
- How to add new services

---

## Performance Considerations

### Caching Strategy
- Cache frequently accessed data (user info, workout plans)
- Cache intent recognition results
- Cache platform-specific responses

### Async Operations
- All adapters should be async
- Agents process messages asynchronously
- Services use async database operations

### Scalability
- Stateless agents (can scale horizontally)
- Adapter instances can be pooled
- Services can be distributed

---

## Security Considerations

### Authentication
- Platform-specific authentication
- Unified user identity across platforms
- Token management per platform

### Authorization
- Role-based access control in core services
- Platform-specific permission checks
- Audit logging

### Data Privacy
- Platform-specific data handling
- GDPR compliance
- Data encryption

---

## Monitoring and Logging

### Logging Strategy
- Structured logging per layer
- Platform-specific log formats
- Request tracing across layers

### Metrics
- Request counts per platform
- Agent processing times
- Service performance metrics
- Error rates per platform

---

## Rollback Plan

### If Issues Arise
1. Keep old code structure alongside new structure
2. Feature flags to switch between old/new
3. Gradual migration per feature
4. Ability to rollback individual components

---

## Success Criteria

### Technical Metrics
- Code coverage > 80%
- All tests passing
- No performance degradation
- Clean architecture principles followed

### Business Metrics
- WhatsApp integration working
- Web functionality unchanged
- New platform integration time < 1 week
- Developer onboarding time reduced

---

## Next Steps

1. **Review and Approve**: Review this plan with team
2. **Create Detailed Specs**: Create detailed specs for each component
3. **Set Up Project Structure**: Create new directory structure
4. **Begin Phase 1**: Start with foundation layer
5. **Iterate**: Regular reviews and adjustments

---

## Questions to Consider

1. Should we use a dependency injection framework (e.g., dependency-injector)?
2. Should we use an event bus for domain events?
3. Should we implement CQRS pattern for read/write separation?
4. Should we use a message queue for async processing?
5. What's the priority: WhatsApp integration or architecture perfection?

---

## Conclusion

This restructuring plan provides a clear path to separate agent logic from handlers while maintaining clean OOP principles. The modular architecture will make it easy to add WhatsApp and other platforms without duplicating business logic. The phased approach ensures we can migrate gradually while maintaining system stability.



