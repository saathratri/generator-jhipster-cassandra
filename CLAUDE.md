# JHipster Cassandra Blueprint

## Overview

This is a **JHipster Side-by-Side (SBS) blueprint** that extends JHipster to provide comprehensive **Apache Cassandra** database support with advanced features including:

- **Composite primary keys** (partition + clustering keys)
- **SET** data type support
- **MAP** data type support with multiple value types (TEXT, BOOLEAN, DECIMAL, BIGINT)
- **TimeUUID** support for time-based ordering
- **Custom Angular UI components** for Cassandra-specific data types

**Version:** 1.0.13
**Author:** Amar Premsaran Patel
**License:** MIT
**JHipster Base Version:** 8.10.0

## What Problem Does This Solve?

Standard JHipster supports Cassandra as a database option, but with limited capabilities. This blueprint extends Cassandra support to include:

1. **Composite Primary Keys**: Support for partition and clustering keys essential for Cassandra data modeling
2. **Advanced Data Types**: Native support for SET and MAP collections
3. **Temporal Data**: Proper handling of UTC dates/times and TimeUUID
4. **Query Generation**: Automatic creation of finder methods for various key combinations
5. **Rich UI**: Custom Angular components for editing complex data types

## Installation

```bash
npm install -g generator-jhipster-cassandra
```

## Usage

### Basic Usage

```bash
jhipster --blueprints cassandra
```

### Prerequisites

- **Java:** 21+
- **Node.js:** 20+
- **Docker Desktop:** For running Cassandra instances
- **JHipster:** 8.6.0+

## Cassandra Composite Key Concepts

### Primary Key Components

Cassandra primary keys consist of:

1. **Partition Key**: Determines data distribution across cluster nodes
   - Can be single or composite (multiple fields)
   - Marked with `@customAnnotation("PrimaryKeyType.PARTITIONED")`

2. **Clustering Key**: Determines sort order within a partition
   - Optional but powerful for queries
   - Marked with `@customAnnotation("PrimaryKeyType.CLUSTERED")`
   - Supports multiple clustering keys with ordinal ordering

**Syntax:**
```
PRIMARY KEY ((partition_key1, partition_key2), clustering_key1, clustering_key2)
```

## JDL Entity Definition

### Custom Annotation Format

Each field with Cassandra-specific behavior uses four custom annotations:

```jdl
@customAnnotation("annotation0")  // Primary key type or collection type
@customAnnotation("annotation1")  // Cassandra data type
@customAnnotation("annotation2")  // Date/time format or content type
@customAnnotation("annotation3")  // Ordinal position (for composite keys)
```

### Example: Blog Post Entity

```jdl
entity Post {
  @Id
  @customAnnotation("PrimaryKeyType.PARTITIONED")
  @customAnnotation("CassandraType.Name.BIGINT")
  @customAnnotation("UTC_DATE")
  @customAnnotation("0")
  createdDate Long required

  @customAnnotation("PrimaryKeyType.CLUSTERED")
  @customAnnotation("CassandraType.Name.BIGINT")
  @customAnnotation("UTC_DATETIME")
  @customAnnotation("1")
  addedDateTime Long required

  @customAnnotation("PrimaryKeyType.CLUSTERED")
  @customAnnotation("CassandraType.Name.UUID")
  @customAnnotation("")
  @customAnnotation("2")
  postId UUID required

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  @customAnnotation("")
  title String required

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  @customAnnotation("")
  content TextBlob required

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.SET")
  @customAnnotation("")
  @customAnnotation("")
  tags String

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.MAP")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  metadata String
}
```

**This creates:**
```cql
PRIMARY KEY ((createdDate), addedDateTime, postId)
```

## Supported Data Types

### Partition and Clustering Keys

| Annotation Value | Cassandra Type | Java Type | Description |
|-----------------|----------------|-----------|-------------|
| `CassandraType.Name.UUID` | UUID | UUID | Unique identifier |
| `CassandraType.Name.TIMEUUID` | TIMEUUID | UUID | Time-based UUID |
| `CassandraType.Name.BIGINT` | BIGINT | Long | 64-bit integer |
| `CassandraType.Name.TEXT` | TEXT | String | Text string |

### Temporal Fields

| Annotation | Format | Java Type | Description |
|-----------|--------|-----------|-------------|
| `UTC_DATE` | Date only | Long | Stored as epoch millis, day precision |
| `UTC_DATETIME` | Date and time | Long | Stored as epoch millis, millisecond precision |
| `TIMEUUID` | Time-based UUID | UUID | Version 1 UUID with timestamp |

### Collection Types

**SET (String values):**
```jdl
@customAnnotation("")
@customAnnotation("CassandraType.Name.SET")
@customAnnotation("")
@customAnnotation("")
tags String
```

Generated as: `Set<String>` in Java

**MAP Types:**

| Value Type | Annotation | Java Type |
|-----------|-----------|-----------|
| TEXT | `CassandraType.Name.MAP` + `CassandraType.Name.TEXT` | `Map<String, String>` |
| BOOLEAN | `CassandraType.Name.MAP` + `CassandraType.Name.BOOLEAN` | `Map<String, Boolean>` |
| DECIMAL | `CassandraType.Name.MAP` + `CassandraType.Name.DECIMAL` | `Map<String, BigDecimal>` |
| BIGINT | `CassandraType.Name.MAP` + `CassandraType.Name.BIGINT` | `Map<String, Long>` |

Example:
```jdl
@customAnnotation("")
@customAnnotation("CassandraType.Name.MAP")
@customAnnotation("CassandraType.Name.BOOLEAN")
@customAnnotation("")
features String
```

### Binary Data (BLOB)

```jdl
@customAnnotation("")
@customAnnotation("CassandraType.Name.BLOB")
@customAnnotation("image")
@customAnnotation("")
photo ImageBlob

@customAnnotation("")
@customAnnotation("CassandraType.Name.BLOB")
@customAnnotation("text")
@customAnnotation("")
document TextBlob
```

## Project Structure

```
generator-jhipster-cassandra/
├── cli/
│   └── cli.cjs                                      # CLI entry point
├── generators/
│   ├── app/                                         # Main application generator
│   │   └── generator.js
│   ├── cassandra-angular/                           # Angular frontend for Cassandra
│   │   ├── generator.js
│   │   ├── cassandra-angular-utils.js               # Angular utilities
│   │   └── templates/
│   │       ├── _entityFolder_/                      # Entity components
│   │       │   ├── _entityFile_.model.ts.ejs
│   │       │   ├── list/_entityFile_.component.html.ejs
│   │       │   ├── detail/_entityFile_-detail.component.html.ejs
│   │       │   └── update/_entityFile_-update.component.html.ejs
│   │       └── saathratri/                          # Custom Cassandra UI components
│   │           ├── date-time/
│   │           ├── map-boolean/
│   │           ├── map-dayjs/
│   │           ├── map-number/
│   │           ├── map-string/
│   │           └── set-string/
│   ├── cassandra-docker/                            # Docker configuration
│   │   ├── generator.js
│   │   └── templates/
│   │       └── docker/
│   │           └── cassandra.yml.ejs
│   ├── cassandra-java-domain/                       # Java domain entities
│   │   ├── generator.js
│   │   ├── cassandra-java-domain-utils.js
│   │   └── templates/
│   │       └── _entityPackage_/
│   │           ├── domain/_persistClass_.java.jhi.ejs
│   │           └── domain/_persistClass_Id.java.ejs
│   ├── cassandra-spring-boot/                       # Spring Boot backend
│   │   ├── generator.js
│   │   ├── cassandra-spring-boot-utils.js           # Composite key utilities
│   │   └── templates/
│   │       └── _entityPackage_/
│   │           ├── repository/_entityClass_Repository.java.ejs
│   │           ├── service/_entityClass_Service.java.ejs
│   │           ├── service/impl/_entityClass_ServiceImpl.java.ejs
│   │           ├── service/dto/_dtoClass_.java.ejs
│   │           ├── service/dto/_dtoClass_Id.java.ejs
│   │           ├── service/mapper/_entityClass_Mapper.java.ejs
│   │           ├── web/rest/_entityClass_Resource.java.ejs
│   │           └── domain/_persistClass_Test.java.ejs
│   └── cassandra-spring-data-cassandra/              # Spring Data Cassandra
│       ├── generator.js
│       ├── cassandra-spring-data-cassandra-utils.js  # Query method generation
│       └── templates/
│           └── _entityPackage_/
│               ├── domain/_persistClass_TestSamples.java.ejs
│               ├── domain/_persistClass_Asserts.java.ejs
│               ├── service/dto/_dtoClass_Test.java.ejs
│               └── web/rest/_entityClass_ResourceIT.java.ejs
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Key Features

### 1. Automatic Query Method Generation

The blueprint automatically generates finder methods based on composite key structure:

**For Post entity with PRIMARY KEY ((createdDate), addedDateTime, postId):**

Generated repository methods:
```java
// Find by partition key only
List<Post> findAllByCompositeIdCreatedDate(Long createdDate);

// Find by partition key + first clustering key
List<Post> findAllByCompositeIdCreatedDateAndCompositeIdAddedDateTime(
    Long createdDate, Long addedDateTime);

// Find by full composite key
Optional<Post> findByCompositeIdCreatedDateAndCompositeIdAddedDateTimeAndCompositeIdPostId(
    Long createdDate, Long addedDateTime, UUID postId);

// Comparison queries for clustering keys
List<Post> findAllByCompositeIdCreatedDateAndCompositeIdAddedDateTimeLessThan(
    Long createdDate, Long addedDateTime);

List<Post> findAllByCompositeIdCreatedDateAndCompositeIdAddedDateTimeGreaterThan(
    Long createdDate, Long addedDateTime);

// TimeUUID support - find latest
Optional<Post> findLatestByCompositeIdCreatedDateAndCompositeIdAddedDateTime(
    Long createdDate, Long addedDateTime);
```

Generated REST endpoints:
```
GET /api/posts/find-all-by-created-date/:createdDate
GET /api/posts/find-all-by-created-date/:createdDate/and-added-date-time/:addedDateTime
GET /api/posts/find-by-created-date/:createdDate/and-added-date-time/:addedDateTime/and-post-id/:postId
GET /api/posts/find-all-by-created-date/:createdDate/and-added-date-time-less-than/:addedDateTime
GET /api/posts/find-latest-by-created-date/:createdDate/and-added-date-time/:addedDateTime
```

### 2. Composite Primary Key Class Generation

For entities with composite keys, generates a separate ID class:

```java
@PrimaryKeyClass
public class PostId implements Serializable {

    @PrimaryKeyColumn(name = "created_date", ordinal = 0, type = PrimaryKeyType.PARTITIONED)
    private Long createdDate;

    @PrimaryKeyColumn(name = "added_date_time", ordinal = 1, type = PrimaryKeyType.CLUSTERED)
    private Long addedDateTime;

    @PrimaryKeyColumn(name = "post_id", ordinal = 2, type = PrimaryKeyType.CLUSTERED)
    private UUID postId;

    // Constructors, getters, setters, equals, hashCode
}

@Table("post")
public class Post implements Serializable {

    @PrimaryKey
    private PostId compositeId;

    @Column("title")
    private String title;

    @Column("tags")
    private Set<String> tags;

    // Other fields, getters, setters
}
```

### 3. Custom Angular UI Components

The blueprint generates sophisticated UI components for Cassandra-specific types:

**Date/Time Component:**
- Custom date/time picker integrated with Dayjs
- Converts between Long (epoch millis) and user-friendly dates
- Located in: `src/main/webapp/app/saathratri/date-time/`

**SET Editor:**
- Add/remove string values
- Displays as chips/tags
- Edit dialog for managing set contents
- Located in: `src/main/webapp/app/saathratri/set-string/`

**MAP Editors (4 types):**
- **map-string**: String key-value pairs
- **map-boolean**: String keys, boolean values
- **map-number**: String keys, numeric values (BigDecimal/Long)
- **map-dayjs**: String keys, date-time values

Each MAP editor includes:
- List view showing all entries
- Add/Edit/Delete functionality
- Dialog-based editing with Angular Material
- Located in: `src/main/webapp/app/saathratri/map-*/`

### 4. TimeUUID Support

Special handling for TimeUUID clustering keys:

```jdl
@customAnnotation("PrimaryKeyType.CLUSTERED")
@customAnnotation("CassandraType.Name.TIMEUUID")
@customAnnotation("TIMEUUID")
@customAnnotation("1")
eventId UUID
```

Generates additional "findLatest" method with `LIMIT 1` for time-series queries:

```java
@Query("SELECT * FROM event WHERE partition_key = :partitionKey LIMIT 1")
Optional<Event> findLatestByCompositeIdPartitionKey(@Param("partitionKey") String partitionKey);
```

### 5. Cassandra Docker Configuration

Automatic Docker configuration with port management:

**5 Ports per Cassandra Instance:**
- **7000**: Inter-node communication (non-SSL)
- **7001**: Inter-node communication (SSL)
- **7199**: JMX monitoring
- **9042**: Native transport (CQL)
- **9160**: Thrift transport (legacy)

**Port Allocation:**
- Gateway: Starts at 7000, 7001, 7199, 9042, 9160
- Each microservice: Increments by 100 (7100, 7101, 7299, 9142, 9260, etc.)

**Tracking File:** `../last-used-ports.json`

```json
{
  "lastUsedInterNodeCommunicationNonSslPort": 7100,
  "lastUsedInterNodeCommunicationSslPort": 7101,
  "lastUsedJmxMonitoringPort": 7299,
  "lastUsedNativeTransportCqlPort": 9142,
  "lastUsedThriftTransportPort": 9260,
  "gateway": {
    "interNodeCommunicationNonSslPort": 7000,
    "interNodeCommunicationSslPort": 7001,
    "jmxMonitoringPort": 7199,
    "nativeTransportCqlPort": 9042,
    "thriftTransportPort": 9160
  },
  "microservice-blog": {
    "interNodeCommunicationNonSslPort": 7100,
    "interNodeCommunicationSslPort": 7101,
    "jmxMonitoringPort": 7299,
    "nativeTransportCqlPort": 9142,
    "thriftTransportPort": 9260
  }
}
```

## Key Utility Functions

### cassandra-spring-boot-utils.js (647 lines)

**`setSaathratriPrimaryKeyAttributesOnEntityAndFields(entity, fields)`**
- Main processing function for composite keys
- Parses custom annotations
- Determines partition vs clustering keys
- Sorts clustering keys by ordinal
- Sets up entity metadata for template generation

**`initializeSaathratriPrimaryKeyAttributes(field)`**
- Parses the four custom annotations
- Extracts: primary key type, Cassandra type, date format, ordinal
- Initializes field metadata structure

**`getCompositePrimaryKeyValue(field, indentation)`**
- Generates Java code for test sample values
- Handles all data types: UUID, TIMEUUID, BIGINT, TEXT
- Returns properly formatted value based on type

**`getCompositePrimaryKeyComparisonsForIntegrationTest(entity)`**
- Generates comparison methods for clustering keys
- Creates LessThan/GreaterThan test methods
- Used in integration test generation

**Port Management Functions:**
- `getApplicationCassandraPortsData()`: Reads port configuration
- `incrementAndSetLastUsedCassandraPorts(applicationName)`: Allocates ports
- `initializePortsFileIfNeeded()`: Creates tracking file if missing

### cassandra-spring-data-cassandra-utils.js (187 lines)

**`generatePrimaryKeyMethods(entity, partitionKeyFields, clusteringKeyFields)`**
- Main query generation orchestrator
- Creates all finder methods based on key combinations
- Adds comparison methods for applicable clustering keys
- Generates "findLatest" for TimeUUID clustering keys

**`addMethodDeclarations(methods, fields, prefix, suffix, entityName, methodType)`**
- Recursive function building method signatures
- Creates permutations of partition + clustering key combinations
- Generates Service, Repository, and Resource method declarations

**`addComparisonMethods(methods, fields, prefix, entityName)`**
- Adds LessThan/GreaterThan methods for Long and TimeUUID clustering keys
- Essential for range queries in Cassandra

**`getPrimaryKeyRepositoryMethodSignature(fields, methodType, entityName, suffix)`**
- Formats Spring Data method signatures
- Handles different method types: findBy, findAllBy, findLatestBy
- Returns properly formatted Java method signature

### cassandra-java-domain-utils.js (41 lines)

**`getCompositePrimaryKeyComputeValue(field, indentation, entity)`**
- Generates code to create composite key instances
- Used in test data generation
- Handles both simple and composite primary keys

**`getCompositePrimaryKeyValue(field, entity)`**
- Returns sample values for testing
- Type-specific value generation
- Example: UUID → `UUID.fromString("...")`, Long → `1L`

### cassandra-angular-utils.js

**`generateEntityClientFieldsSaathratri(primaryKey, fields, relationships, entity)`**
- Generates TypeScript field definitions for Angular models
- Maps Java types to TypeScript types
- Handles composite keys, collections, and temporal fields

**`getTypescriptType(field)`**
- Type mapping function
- Converts Cassandra/Java types to TypeScript equivalents
- Example: `Map<String, BigDecimal>` → `{ [key: string]: number }`

## Generated Code Examples

### Entity with Simple Primary Key

**JDL:**
```jdl
entity Tag {
  @Id
  @customAnnotation("")
  @customAnnotation("CassandraType.Name.UUID")
  @customAnnotation("")
  @customAnnotation("")
  id UUID required

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  @customAnnotation("")
  name String required
}
```

**Generated Java:**
```java
@Table("tag")
public class Tag implements Serializable {

    @PrimaryKey
    private UUID id;

    @Column("name")
    private String name;

    // Standard getters, setters, equals, hashCode
}
```

### Entity with Composite Key and Collections

**JDL:**
```jdl
entity UserProfile {
  @Id
  @customAnnotation("PrimaryKeyType.PARTITIONED")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  @customAnnotation("0")
  username String required

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.SET")
  @customAnnotation("")
  @customAnnotation("")
  interests String

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.MAP")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  @customAnnotation("")
  preferences String

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.MAP")
  @customAnnotation("CassandraType.Name.BOOLEAN")
  @customAnnotation("")
  @customAnnotation("")
  settings String
}
```

**Generated Java Domain:**
```java
@Table("user_profile")
public class UserProfile implements Serializable {

    @PrimaryKey
    private String username;

    @Column("interests")
    private Set<String> interests;

    @Column("preferences")
    private Map<String, String> preferences;

    @Column("settings")
    private Map<String, Boolean> settings;

    // Getters, setters, etc.
}
```

**Generated Angular Model:**
```typescript
export interface IUserProfile {
  username: string;
  interests?: string[] | null;
  preferences?: { [key: string]: string } | null;
  settings?: { [key: string]: boolean } | null;
}
```

**Generated Angular Component (for SET field):**
```html
<app-set-string-component
  [data]="userProfile.interests || []"
  (dataChange)="userProfile.interests = $event"
  [label]="'Interests'">
</app-set-string-component>
```

**Generated Angular Component (for MAP fields):**
```html
<app-map-string-component
  [data]="userProfile.preferences || {}"
  (dataChange)="userProfile.preferences = $event"
  [label]="'Preferences'">
</app-map-string-component>

<app-map-boolean-component
  [data]="userProfile.settings || {}"
  (dataChange)="userProfile.settings = $event"
  [label]="'Settings'">
</app-map-boolean-component>
```

## Testing

### Test Structure

The blueprint generates comprehensive tests:

**Domain Tests:**
- `EntityTest.java` - Entity field tests
- `EntityTestSamples.java` - Sample data generators
- `EntityAsserts.java` - Custom assertions for entities

**Service Tests:**
- Service layer test coverage (if applicable)

**Integration Tests:**
- `EntityResourceIT.java` - Full REST API integration tests
- Tests all generated endpoints
- Validates composite key queries
- Tests comparison methods (LessThan/GreaterThan)

**DTO Tests:**
- `EntityDTOTest.java` - DTO serialization/deserialization

### Running Tests

```bash
# Backend tests
./mvnw test

# Integration tests
./mvnw verify

# Frontend tests
npm test
```

## Blueprint Architecture

### Side-by-Side Pattern

Uses the SBS blueprint pattern:
- `sbsBlueprint: true` in generator constructor
- Extends JHipster without replacing core functionality
- Adds Cassandra-specific customizations

### Generator Priorities

The blueprint configures custom priorities for entity processing:

```javascript
get [BaseApplicationGenerator.PREPARING_EACH_ENTITY]() {
  return this.asPreparingEachEntityTaskGroup({
    async preparingEachEntity({ entity }) {
      setSaathratriPrimaryKeyAttributesOnEntityAndFields(entity, entity.fields);
    },
  });
}
```

### Template System

Uses EJS templating:
- `.ejs` extension for templates
- `<%= variable %>` for output
- `<%- variable %>` for unescaped output
- `<% code %>` for logic

## Development

### Setup for Development

```bash
# Clone repository
git clone <repository-url>
cd generator-jhipster-cassandra

# Install dependencies
npm install

# Link for local testing
npm link

# Use in a test project
cd /path/to/test-project
jhipster --blueprints cassandra
```

### Testing Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run vitest

# Update snapshots
npm run update-snapshot

# Lint code
npm run lint

# Format code
npm run prettier:format
```

### Debugging

Enable debug output:
```bash
DEBUG=* jhipster --blueprints cassandra
```

## Example Project

A complete working example is available:
- **Repository:** https://github.com/amarpatel-xx/jhipster-cassandra-example
- **Includes:** Sample entities with all data types
- **Features:** Composite keys, collections, temporal data
- **Scripts:** Generation and build scripts

## Identity Provider Integration

### Keycloak (Default)

The blueprint uses Keycloak by default:

```bash
# Start Keycloak
docker-compose -f src/main/docker/keycloak.yml up -d

# Application configured automatically
```

### Okta

To use Okta instead:

```bash
# Create Okta JHipster app
okta apps create jhipster

# Follow prompts to configure
```

## Workflow Example

### Step 1: Create JDL

Create `blog.jdl`:

```jdl
entity BlogPost {
  @Id
  @customAnnotation("PrimaryKeyType.PARTITIONED")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  @customAnnotation("0")
  category String required

  @customAnnotation("PrimaryKeyType.CLUSTERED")
  @customAnnotation("CassandraType.Name.BIGINT")
  @customAnnotation("UTC_DATETIME")
  @customAnnotation("1")
  publishedDate Long required

  @customAnnotation("PrimaryKeyType.CLUSTERED")
  @customAnnotation("CassandraType.Name.TIMEUUID")
  @customAnnotation("TIMEUUID")
  @customAnnotation("2")
  postId UUID required

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  @customAnnotation("")
  title String required

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  @customAnnotation("")
  content TextBlob required

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.SET")
  @customAnnotation("")
  @customAnnotation("")
  tags String

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.MAP")
  @customAnnotation("CassandraType.Name.TEXT")
  @customAnnotation("")
  @customAnnotation("")
  metadata String

  @customAnnotation("")
  @customAnnotation("CassandraType.Name.MAP")
  @customAnnotation("CassandraType.Name.BIGINT")
  @customAnnotation("")
  @customAnnotation("")
  stats String
}
```

### Step 2: Generate Application

```bash
# Create new JHipster app with Cassandra blueprint
jhipster --blueprints cassandra

# Import JDL
jhipster jdl blog.jdl
```

### Step 3: Review Generated Files

**Backend:**
- `src/main/java/.../domain/BlogPost.java` - Entity
- `src/main/java/.../domain/BlogPostId.java` - Composite key class
- `src/main/java/.../repository/BlogPostRepository.java` - Repository with query methods
- `src/main/java/.../service/BlogPostService.java` - Service interface
- `src/main/java/.../service/impl/BlogPostServiceImpl.java` - Service implementation
- `src/main/java/.../web/rest/BlogPostResource.java` - REST controller
- `src/main/java/.../service/dto/BlogPostDTO.java` - DTO
- `src/main/java/.../service/dto/BlogPostDTOId.java` - DTO for composite key
- `src/main/java/.../service/mapper/BlogPostMapper.java` - Mapper

**Frontend:**
- `src/main/webapp/app/entities/blog-post/blog-post.model.ts` - TypeScript model
- `src/main/webapp/app/entities/blog-post/list/` - List component
- `src/main/webapp/app/entities/blog-post/detail/` - Detail component
- `src/main/webapp/app/entities/blog-post/update/` - Update form
- `src/main/webapp/app/saathratri/` - Custom UI components

**Tests:**
- `src/test/java/.../domain/BlogPostTest.java`
- `src/test/java/.../domain/BlogPostTestSamples.java`
- `src/test/java/.../domain/BlogPostAsserts.java`
- `src/test/java/.../web/rest/BlogPostResourceIT.java`
- `src/test/java/.../service/dto/BlogPostDTOTest.java`

### Step 4: Start Cassandra

```bash
# Start Cassandra with Docker
docker-compose -f src/main/docker/cassandra.yml up -d

# Verify Cassandra is running
docker ps | grep cassandra
```

### Step 5: Run Application

```bash
# Start backend
./mvnw

# Start frontend (in another terminal)
npm start
```

### Step 6: Test Endpoints

**Find all posts in a category:**
```
GET http://localhost:8080/api/blog-posts/find-all-by-category/Technology
```

**Find posts in category after a date:**
```
GET http://localhost:8080/api/blog-posts/find-all-by-category/Technology/and-published-date-greater-than/1704067200000
```

**Find specific post:**
```
GET http://localhost:8080/api/blog-posts/find-by-category/Technology/and-published-date/1704067200000/and-post-id/550e8400-e29b-41d4-a716-446655440000
```

**Find latest post in category:**
```
GET http://localhost:8080/api/blog-posts/find-latest-by-category/Technology
```

## Troubleshooting

### Issue: Cassandra Connection Refused

**Problem:** Application cannot connect to Cassandra

**Solution:**
```bash
# Check Cassandra is running
docker ps | grep cassandra

# Check logs
docker logs <cassandra-container-id>

# Restart Cassandra
docker-compose -f src/main/docker/cassandra.yml restart

# Verify port in application-dev.yml matches Docker configuration
```

### Issue: Composite Key Not Generated

**Problem:** Entity uses simple ID instead of composite key

**Solution:**
- Verify `@customAnnotation("PrimaryKeyType.PARTITIONED")` or `@customAnnotation("PrimaryKeyType.CLUSTERED")` is present
- Check ordinal annotations (index 3) are sequential: 0, 1, 2...
- Regenerate: `jhipster entity BlogPost --regenerate --force`

### Issue: SET/MAP UI Components Not Working

**Problem:** Collection editors not displaying or saving

**Solution:**
- Verify `@customAnnotation("CassandraType.Name.SET")` or `@customAnnotation("CassandraType.Name.MAP")` is present
- For MAP, ensure value type annotation is set (index 2)
- Check browser console for Angular errors
- Verify Material UI modules are imported in `app.module.ts`

### Issue: TimeUUID Comparison Errors

**Problem:** TimeUUID clustering key comparisons failing

**Solution:**
- Verify `@customAnnotation("TIMEUUID")` is in index 2 (not just CassandraType.Name.TIMEUUID)
- Check that field is marked as clustering key
- Review generated CQL queries in logs

### Issue: Port Conflicts

**Problem:** Cassandra ports already in use

**Solution:**
- Check `last-used-ports.json` in parent directory
- Manually edit `src/main/docker/cassandra.yml` to use different ports
- Update `application-dev.yml` spring.cassandra.port to match
- Kill conflicting processes: `lsof -i :9042` and `kill -9 <PID>`

### Issue: Integration Tests Failing

**Problem:** EntityResourceIT tests fail with 404 or 500 errors

**Solution:**
- Verify test Cassandra instance is running
- Check test data samples have valid composite key values
- Review generated query methods match URL patterns
- Enable debug logging: `logging.level.root=DEBUG` in `application-test.yml`

## Advanced Topics

### Custom Query Methods

Beyond auto-generated methods, you can add custom queries:

```java
@Repository
public interface BlogPostRepository extends CassandraRepository<BlogPost, BlogPostId> {

    // Auto-generated by blueprint
    List<BlogPost> findAllByCompositeIdCategory(String category);

    // Custom query
    @Query("SELECT * FROM blog_post WHERE category = :category AND published_date >= :date ALLOW FILTERING")
    List<BlogPost> findRecentPostsInCategory(
        @Param("category") String category,
        @Param("date") Long publishedDate
    );
}
```

**Note:** Use `ALLOW FILTERING` cautiously in production as it can impact performance.

### Materialized Views

Cassandra materialized views are not auto-generated but can be added manually:

```cql
CREATE MATERIALIZED VIEW blog_post_by_title AS
  SELECT *
  FROM blog_post
  WHERE title IS NOT NULL AND category IS NOT NULL AND published_date IS NOT NULL AND post_id IS NOT NULL
  PRIMARY KEY (title, category, published_date, post_id);
```

Then create a corresponding repository:

```java
public interface BlogPostByTitleRepository extends CassandraRepository<BlogPost, String> {
    List<BlogPost> findByTitle(String title);
}
```

### Secondary Indexes

For fields not in primary key, you can add secondary indexes:

```cql
CREATE INDEX ON blog_post (author);
```

Then add repository method:

```java
List<BlogPost> findByAuthor(String author);
```

**Warning:** Secondary indexes in Cassandra have performance implications. Prefer materialized views for complex queries.

## Performance Considerations

### Partition Key Design

- Choose partition keys that distribute data evenly
- Avoid hot partitions (one partition with significantly more data)
- Consider data access patterns when designing keys

### Clustering Key Order

- Order clustering keys by query frequency
- Most frequently queried fields should come first
- Enables efficient range queries

### Collection Size

- Keep SET and MAP collections reasonably sized (< 10,000 items)
- Cassandra stores collections in a single cell
- Very large collections impact read/write performance

### Query Patterns

- Avoid `ALLOW FILTERING` in production queries
- Design tables to match query patterns (denormalization)
- Use batch operations for bulk writes (but not for reads)

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Lint code: `npm run lint`
6. Commit: `git commit -m "Add my feature"`
7. Push: `git push origin feature/my-feature`
8. Create a Pull Request

### Contribution Guidelines

- Follow existing code style (enforced by ESLint and Prettier)
- Add tests for new features
- Update documentation (README, CLAUDE.md)
- Ensure all tests pass before submitting PR

## Support and Resources

### Support Channels

- **GitHub Issues:** [Repository Issues Page]
- **JHipster Community:** https://www.jhipster.tech/help/
- **Stack Overflow:** Tag with `jhipster` and `cassandra`

### Learning Resources

- **JHipster Documentation:** https://www.jhipster.tech/
- **JHipster Blueprint Guide:** https://www.jhipster.tech/modules/creating-a-blueprint/
- **Cassandra Documentation:** https://cassandra.apache.org/doc/latest/
- **Spring Data Cassandra:** https://spring.io/projects/spring-data-cassandra
- **DataStax Academy:** https://academy.datastax.com/ (Free Cassandra courses)

### Example Projects

- **Full Example:** https://github.com/amarpatel-xx/jhipster-cassandra-example
- **Author's Projects:** Check repository for additional examples

## License

MIT License - See LICENSE file for details

## Version History

**1.0.13** (Current)
- Support for JHipster 8.10.0
- Composite primary key support
- SET and MAP data types
- TimeUUID support
- Custom Angular UI components
- Automatic query method generation
- Docker port management for microservices
- Comprehensive test generation

## Acknowledgments

- **JHipster Team:** For the excellent generator framework
- **Apache Cassandra:** For the powerful distributed database
- **Spring Data Cassandra:** For seamless Java integration
- **Angular Material:** For UI components

## Author

**Amar Premsaran Patel**

This blueprint represents advanced knowledge of:
- JHipster generator architecture
- Yeoman generator ecosystem
- Apache Cassandra data modeling
- Spring Data Cassandra
- Angular and TypeScript
- Docker containerization
