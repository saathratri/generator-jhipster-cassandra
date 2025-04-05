# generator-jhipster-cassandra

> A JHipster blueprint for Cassandra with advanced support for composite primary keys, sets, and maps.

## Introduction

This is a [JHipster](https://www.jhipster.tech/) blueprint designed to extend JHipster’s capabilities to support **Apache Cassandra**, particularly with **composite primary keys**, `SET`, and `MAP` types.

The `generator-jhipster-cassandra` blueprint provides powerful schema modeling tools tailored for Cassandra, including fine-grained control over **partition** and **clustering** keys, along with native support for complex Cassandra collections like **sets** and **maps**.

---

## 🔑 Key Features

- **Composite Primary Key Support**
  - Define entities with multiple primary key fields.
  - Use `@customAnnotation("PrimaryKeyType.PARTITIONED")` and `@customAnnotation("PrimaryKeyType.CLUSTERED")` to clearly specify partition and clustering columns.
  - Auto-generate query methods for equality, range, and filtering on clustering columns.

- **Set & Map Field Support**
  - Native Cassandra collection types are now fully supported:
    - `CassandraType.Name.SET`
	  - Supports `TEXT`
    - `CassandraType.Name.MAP`
      - Supports various key-value types: `TEXT`, `BOOLEAN`, `DECIMAL`, and `BIGINT`.

- **Custom Annotations**
  - Annotations like `@customAnnotation("UTC_DATE")` or `@customAnnotation("TIMEUUID")` support consistent metadata across entity fields.

- **Optimized for Microservices**
  - Seamless integration with the JHipster microservice architecture.
  - Supports JDL files with complex schemas.

---

## 🧑‍💻 Example Use Cases

- Model a `Post` entity using a composite primary key (`createdDate`, `addedDateTime`, `postId`) and additional attributes like `title` and `content`.
- Use `SET` to tag entities with multiple string values.
- Use `MAP` to represent dynamic metadata or key-value configurations (e.g., `addOnDetailsBoolean`, `addOnDetailsDecimal`).

---

## 🧪 JDL Examples

### Composite Key Example

Below are various examples of defining JDL entities using the @customAnnotation methodology to specify the details of the Cassandra composite primary key. Also, below is an example of a single-value primary key entity. Some example entities are of composite primary keys using Map fields and some are using a Set field. There are also examples of single-value primary key entities using Maps and Set data structures.
```
    // Composite Primary Key Example:
    entity Post {
      @Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATE") @customAnnotation("0") createdDate Long 
      // Do not name composite primary key fields as 'id' as it conflicts with the 'id' field in the JHipster entity.
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATETIME") @customAnnotation("1") addedDateTime Long
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") @customAnnotation("2") postId UUID
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") @customAnnotation("") title String required
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") @customAnnotation("") content String required
      @customAnnotation("") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATETIME") @customAnnotation("") publishedDateTime Long
      @customAnnotation("") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATE") @customAnnotation("") sentDate Long
    }

    // Single-value Primary Key Example:
    entity Product {
      // Primary Key field can be named 'id'.  JHipster natively supports single-value primary keys.  This blueprint also supports single-value primary keys.
      @Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") @customAnnotation("") id UUID
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") @customAnnotation("") title String required
      @customAnnotation("") @customAnnotation("CassandraType.Name.DECIMAL") @customAnnotation("") @customAnnotation("") price BigDecimal required min(0)
      @customAnnotation("") @customAnnotation("CassandraType.Name.BLOB") @customAnnotation("image") @customAnnotation("") image ImageBlob
      @customAnnotation("") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATE") @customAnnotation("") addedDate Long required
    }

    // Composite Primary Key Example with TIMEUUID clustered key, multiple partitioned keys, with multiple clustered keys.
    entity SaathratriEntity2 {
      @Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") entityTypeId UUID
      @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("") yearOfDateAdded Long
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATE") arrivalDate Long
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.TIMEUUID") @customAnnotation("TIMEUUID") blogId UUID
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") entityName String
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") entityDescription String
      @customAnnotation("") @customAnnotation("CassandraType.Name.DECIMAL") @customAnnotation("") entityCost BigDecimal
      @customAnnotation("") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATE") departureDate Long
    }

    // Example showing a text/string set.
    entity SaathratriEntity3 {
      @Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") entityType String
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.TIMEUUID") @customAnnotation("") createdTimeId UUID
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") entityName String
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") entityDescription String
      @customAnnotation("") @customAnnotation("CassandraType.Name.DECIMAL") @customAnnotation("") entityCost BigDecimal
      @customAnnotation("") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATE") departureDate Long
      @customAnnotation("CassandraType.Name.SET") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") tags String,
    }

    // Example showing key-value data structure.
    entity SaathratriEntity4 {
      @Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") organizationId UUID
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") attributeKey String
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") attributeValue String
    }

        // Example showing text/string, boolean, numeric and date-time maps.
    entity AddOnsAvailableByOrganization {
      @Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") organizationId UUID
      @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") entityType String
      @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") entityId UUID
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") addOnId UUID
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") addOnType String
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") addOnDetailsText String
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.DECIMAL") @customAnnotation("") addOnDetailsDecimal BigDecimal
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.BOOLEAN") @customAnnotation("") addOnDetailsBoolean Boolean
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATETIME") addOnDetailsBigInt Long
    }

    // Another example showing text/string, boolean, numeric and date-time maps.
    entity AddOnsSelectedByOrganization {
      @Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") organizationId UUID
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATE") arrivalDate Long
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") accountNumber String
      @customAnnotation("PrimaryKeyType.CLUSTERED") @customAnnotation("CassandraType.Name.TIMEUUID") @customAnnotation("") createdTimeId UUID
      @customAnnotation("") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATE") departureDate Long
      @customAnnotation("") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") customerId UUID
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") customerFirstName String
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") customerLastName String
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") customerUpdatedEmail String
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") customerUpdatedPhoneNumber String
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") customerEstimatedArrivalTime String
      @customAnnotation("") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") tinyUrlShortCode String
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") addOnDetailsText String
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.DECIMAL") @customAnnotation("") addOnDetailsDecimal BigDecimal
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.BOOLEAN") @customAnnotation("") addOnDetailsBoolean Boolean
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATETIME") addOnDetailsBigInt Long
    }

    // Single-value Primary Key with Maps
    entity LandingPageByOrganization {
      @Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") organizationId UUID
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") detailsText String
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.DECIMAL") @customAnnotation("") detailsDecimal BigDecimal
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.BOOLEAN") @customAnnotation("") detailsBoolean Boolean
      @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.BIGINT") @customAnnotation("UTC_DATETIME") detailsBigInt Long
    }

    // Single-value Primary Key with Set
    entity SetEntityByOrganization {
      @Id @customAnnotation("PrimaryKeyType.PARTITIONED") @customAnnotation("CassandraType.Name.UUID") @customAnnotation("") organizationId UUID
      @customAnnotation("CassandraType.Name.SET") @customAnnotation("CassandraType.Name.TEXT") @customAnnotation("") tags String
    }
```

---

## 🚀 Quick Start

### Prerequisites

- Java 21+
- Node.js 20+
- Docker Desktop
- JHipster 8.6.0+

### Installation

```bash
npm install -g generator-jhipster-cassandra
```

### Usage

```bash
jhipster --blueprints cassandra
```

---

## 🎡 Example Project

- Full example repo with Cassandra composite key entities and JDL:
  👉 [https://github.com/amarpatel-xx/jhipster-cassandra-example](https://github.com/amarpatel-xx/jhipster-cassandra-example)

### Generate Code

```bash
git clone https://github.com/amarpatel-xx/jhipster-cassandra-example.git
cd jhipster-cassandra-example
sh saathratri-generate-code-dev-cassandra.sh
```

---

## 🔐 Identity Providers

This blueprint supports Keycloak by default. You can switch to Okta using:

```bash
okta apps create jhipster
```

---

## 🧐 Learn More

- 📘 [Cassandra Data Modeling](https://cassandra.apache.org/doc/latest/data-modeling/)
- 📘 [JHipster Blueprints](https://www.jhipster.tech/modules/creating-a-blueprint/)
- 🧓 [Matt Raible on Micro Frontends](https://auth0.com/blog/micro-frontends-for-java-microservices/)

---

## 👏 Acknowledgements

Huge thanks to:
- [yelhouti](https://github.com/yelhouti)
- [Jeremy Artero](https://www.linkedin.com/in/jeremyartero/)
- [Matt Raible](https://github.com/mraible)
- [Gaël Marziou](https://github.com/gmarziou)
- [Cedrick Lunven](https://www.linkedin.com/in/clunven/)
- [Christophe Borne](https://www.linkedin.com/in/christophe-bornet-bab1193/)
- [Disha Patel](https://www.linkedin.com/in/dishapatel860/)
- [Catherine Guevara](https://www.linkedin.com/in/catherine-guevara-1a5375b1/)

---