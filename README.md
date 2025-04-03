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

```jdl
entity Post {
  @Id @customAnnotation("PrimaryKeyType.PARTITIONED") createdDate Long
  @customAnnotation("PrimaryKeyType.CLUSTERED") addedDateTime Long
  @customAnnotation("PrimaryKeyType.CLUSTERED") postId UUID
  title String required
  content String required
}
```

### Entity with `SET` Example

```jdl
entity SaathratriEntity3 {
  @Id @customAnnotation("PrimaryKeyType.PARTITIONED") entityType String
  @customAnnotation("PrimaryKeyType.CLUSTERED") createdTimeId UUID
  tags String @customAnnotation("CassandraType.Name.SET")
}
```

### Entity with `MAP` Examples

```jdl
entity SaathratriEntity5 {
  @Id @customAnnotation("PrimaryKeyType.PARTITIONED") organizationId UUID
  addOnDetailsText String @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.TEXT")
  addOnDetailsBoolean Boolean @customAnnotation("CassandraType.Name.MAP") @customAnnotation("CassandraType.Name.BOOLEAN")
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