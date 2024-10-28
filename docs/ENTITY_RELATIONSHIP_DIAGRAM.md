# PDC Schema

## Entity Relationship Diagram

```mermaid
erDiagram
  BaseField {
    int id
    string label
    string shortCode
    string dataType
    datetime createdAt
  }
  Changemaker {
    int id
    string taxId
    string name
    datetime createdAt
  }
  Proposal {
    int id
    int opportunityId
    string externalId
		string createdBy
    datetime createdAt
  }
  Outcome {
    int id
    int applicationId
    string outcome
    datetime createdAt
  }
  Opportunity {
    int id
    string title
    datetime createdAt
  }
  ApplicationForm {
    int id
    int opportunityId
    int version
    datetime createdAt
  }
  ApplicationFormField {
    int id
    int applicationFormId
    int baseFieldId
    int position
    string label
    datetime createdAt
  }
  ExternalFieldValue {
    int id
    int baseFieldId
    int sourceId
    string name
    string value
    int position
    datetime createdAt
  }
  ProposalVersion {
    int id
    int proposalId
    int sourceId
    int version
		string createdBy
    datetime createdAt
  }
  ProposalFieldValue {
    int id
    int proposalVersionId
    int applicationFormFieldId
    int position
    string value
    datetime createdAt
  }
  ActivityLog {
    int id
    string actionType
    string log
    datetime createdAt
  }
  DataProvider {
    string shortCode
    string name
    datetime createdAt
  }
  Funder {
    string shortCode
    string name
    datetime createdAt
  }
  Source {
    int id
    string name
    string funder_short_code
    int changemaker_id
    string data_provider_short_code
    datetime created_at
  }
	BulkUpload {
		integer id
		string file_name
		string source_key
		bulk_upload_status status
		integer file_size
		integer source_id
		string created_by
		timestamp created_at
	}
	User {
		string keycloak_user_id
    datetime created_at
	}

  Changemaker ||--o{ Proposal : submits
  Proposal }|--|| Opportunity : "responds to"
  Opportunity ||--|{ ApplicationForm : establishes
  Proposal ||--o{ Outcome : "has"
  ApplicationForm ||--|{ ApplicationFormField : has
  ApplicationFormField }o--|| BaseField : represents
  Proposal ||--|{ ProposalVersion : has
  ProposalVersion ||--|{ ProposalFieldValue : contains
  ProposalFieldValue }o--|| ApplicationFormField : populates
  Changemaker ||--o{ ExternalFieldValue : "is described by"
  ExternalFieldValue }o--|| BaseField : "contains potential defaults for"
  Source }|--o| Funder : "represents"
  Source }|--o| Changemaker : "represents"
  Source }|--o| DataProvider : "represents"
  ProposalVersion }o--|| Source : "comes from"
  ExternalFieldValue }o--|| Source : "comes from"
	Proposal }o--|| User : "is created by"
	ProposalVersion }o--|| User : "is created by"
	BulkUpload }o--|| User : "is created by"
	User }o--o{ Changemaker : "is granted access within"
	User }o--o{ Funder : "is granted access within"
	User }o--o{ DataProvider : "is granted access within"
```

## Narrative

1. An `Applicant` submits a `Proposal`
2. A `Proposal` is a response to an `Opportunity`. An `Opportunity` represents a given challenge, RFP, etc.
3. An `Opportunity` establishes an `Application Form`. An application form is the set of fields that make up an application. An `Opportunity` might update its `Application Form` over time, which is why an `Opportunity` can have many `Application Forms`.
4. An `Application Form` will define many `Application Form Fields`.
5. An `Application Form Field` represents a `Base Field`.

Meanwhile...

6. A `Proposal` can have more than one `Proposal Version`. This occurs as a proposal is updated or revised.
7. A `Proposal Version` contains a set of `Proposal Field Values`. These are the responses that were provided by the `Applicant`.
8. A `Proposal Field Value` contains a response to a given `Application Form Field`. Some fields might allow multiple responses, which is why we provide a `position`.

The thinking is that when a new proposal is being written, a Grant Management System could ask the PDC "is there any pre-populated data we should use for this changemaker?"

PDC would then:

- Collect the most recent ProposalFieldValues for each BaseField for that Applicant.
- Collect the most recent ExternalFieldValues for each BaseField for that Applicant.

It would use the ProposalFieldValue set as the primary source, and the ExternalFieldValue set as a secondary source.

## Examples

### Registering an Application Form

```mermaid
sequenceDiagram
  actor Admin
  participant API
  participant Database
  Admin ->>+ API : Here is a new application form
  API ->>+ Database : Register any new base fields
  Database ->>- API : OK!
  API ->>+ Database : Register the new application form
  Database ->>- API : OK!
  API ->>- Admin :  OK!
```

New `Application Forms` will have to be externally defined; some day maybe we will make a user interface that generates an `Application Form` definition, but for the short term this will be manually written JSON (or YAML, or something else highly structured). The form will define the full set of `Application Form Fields` along with the id of the `Base Field` to which the `Application Form Fields` map.

This might look something like this:

```
{
  "fields": [
    {
      "name": "Applicant Name",
      "type": "string",
      "baseFieldId": 42,
    },
    {
      "name": "Have you ever seen the Mona Lisa?",
      "type": "boolean",
      "baseFieldId": 43,
    }
  ]
}
```

The PDC API would then ingest that new form document. It would first register any `Base Fields` that did not already exist. It would then register the `Application Form` and `Application Form Fields`, with field-level associations to the `Base Fields`.

The database does not differentiate between "core" and "custom" fields. Rather, there will be a set of `Base Fields` that are used by varying numbers of `Application Forms`. We will likely see that some `Base Fields` are used more often than others, and some are only used by a single `Application Form`. We might choose a subset of the `Base Fields` to highlight in our documentation and might call those "core" fields; that decision is not directly relevant to the form.

### Pre-filling an Application

```mermaid
sequenceDiagram
  participant GMS
  participant API
  participant Database
  GMS ->>+ API : Get field values
  API ->>+ Database : Get Applicant Field Values
  Database ->>- API : Here they are
  API ->>+ Database : Get External Field Values
  Database ->>- API : Here they are
  API ->>- GMS :  Here they are
```

When an applicant begins to fills out a proposal, the Grant Management System would request all field values known for that `Applicant`. Which values are returned could be based on business logic; it could be the complete set; it could be restricted to just the fields associated with a given application form -- these would be implementation details but the form would support any of them.

The API would use the Database to collect values associated with past applications (`Application Field Values`); these have been directly entered by an applicant representative.
The API would use the Database to also collect values associated with external / independent sources (`External Field Values`).

Which values are ultimately selected for prepopulation is an implementation detail. It could be that we decide that ALL distinct values should be returned, and the GMS should determine whether to render a "dropdown" the user could select from. It could be we decide that only the most recently updated values should be returned. It could be we decide that values associated with past proposals should override externally sourced values. Again, these would be implementation decisions but the form would support any of them.

### Submitting a Proposal

```mermaid
sequenceDiagram
  participant GMS
  participant API
  participant Database
  GMS ->>+ API : Save this completed Proposal
  API ->>+ Database : Create a new Proposal
  Database ->>- API : OK
  API ->>+ Database : Save the Proposal Field Values
  Database ->>- API : OK
  API ->>- GMS : OK
```

The above flow is based on an assumption that we know this is the first time the applicant had submitted a proposal / it is not an update to an existing proposal.

The API would create a new Proposal, a new Proposal Version, and then it would store one `Proposal Field Value` per `Base Field`. Those field values would then be incorporated in future lookups according to the "Pre-filling an Proposal" logic.

The API might then send alerts to other GMSs depending on business logic, but that is an implementation detail and outside of the scope of this particular example.
