# Modern Awards Pay Database

# API Integration

# Best Practices Guide

## Contents

## Contents

- Contents
  - About the Modern Awards Pay Database API
    - What is the Modern Awards Pay Database API
    - What technology standards does the Modern Awards Pay Database API use...............................................
  - Preparing for Implementation
    - Developer Portal registration for large teams
    - Inactive accounts...........................................................................................................................................
    - Terms of Use
  - Design, development, and pre-production readiness
    - Design Considerations
    - Using the Modern Awards Pay Database API
    - Implementing the Modern Awards Pay Database Webhooks
    - Pre-production testing
  - API Support & Governance
    - API support arrangements
    - API usage reporting
    - API governance and prior version support

### About the Modern Awards Pay Database API

#### What is the Modern Awards Pay Database API

The Modern Award Pay Database (MAPD) API provides users (such as software developers who register with
our API) with the ability to call on and retrieve the latest updates to modern award rates within the Modern
Awards Pay Database in a structured digital format. The Modern Awards Pay Database API includes access to
the following information from the Modern Awards Pay Database:

- Minimum rates of pay for each classification,
- Most penalty rates, overtime, and casual rates,
- Some junior and apprentice rates, and
- Some wage-related and expense-related allowances.

#### What technology standards does the Modern Awards Pay Database API use

The Modern Awards Pay Database API has been developed in accordance with the Australian Government’s
API Standard, which leverages modern web API technologies, including:

- HTTP using REST / ReSTful patterns,
- Support for JSON and XML data payloads,
- Transport Layer Security (TLS) version 2 or higher,
- Open API Specification Version 3 (OAS2 and WADL also supported), and
- Webhooks.

As the APIs only provide read-only, publicly available data, we (the Fair Work Commission) have decided to
limit authentication and authorisation requirements to API keys. No support is required for OAuth2 or OICD.

### Preparing for Implementation

#### Developer Portal registration for large teams

The steps to register on the developer portal are:

```
Step 1. In your web browser, navigate to:
```

- <https://developer.fwc.gov.au>
**Step 2.** Click the “Log in /register” button on the home page.

```
Step 3. This will trigger a pop-up window containing the FWC’s Sign-in Window:
```

```
Step 4. Click the “Sign up now” link, located underneath the blue “Sign in” button:
```

**Step 5.** Enter your email address and click the blue “Send verification code” button. This will trigger a
verification email containing a unique one-time code to be sent to the nominated email
address. Ensure to review the Privacy Notice available on this page.

**Step 6.** Locate the email that will be sent from the <msonlineservicesteam@microsoftonline.com> email
address. Copy the unique code:

**Step 7.** Return to the Sign-Up pop-up window and enter the verification code in the text field provided
and click the “Verify code” button:

**Step 8.** Complete the basic user information:

```
Password Guidance:
The password you select must adhere to the following
rules:
```

- Between 8 and 64 characters in length
- Contain at least 3 of the following:
  - A lowercase letter
  - An uppercase letter
  - A digit
  - A symbol
**Contact Phone Number:**
Organisations must provide the contact phone number
of an individual or team responsible for the production
support of the API client product or service.
**Organisation and ABN:**
We collect this information to assist us to identify the
users of the Modern Awards Pay Database API. This
information will be verified, and incorrect information
may result in rejection of the sign-up application or
cancellation of user accounts.
**Terms of Use and Important Information**
These important legal documents contain critical
information on the use of the Modern Awards Pay
Database API. Please read these thoroughly prior to
registering. Clicking the blue links will open the
documents in a new browser window to enable you to
share them easily within your organisation.

**Step 9.** Read the Important information; Check the ‘I have read the Important Information’ statement.

**Step 10.** Review the Terms of Use. After reviewing them and if you agree to them, check the ‘I agree to
the Terms of Use’ box. You will not be able to use the API if you do not agree to the Terms of
Use. It is critical that users subscribing to the Production Modern Awards Pay Database API are
appropriately authorised to accept these Terms of Use on behalf of their organisation.

**Step 11.** Click ‘Create’ to register your account. When the registration has been successfully completed
you will be prompted to configure multi-factor authentication for your account.

```
You will see the following screen, open your preferred authentication application, if you don’t
have a preferred application then you can use the provided links to obtain the free Microsoft
Authenticator App from the Google Play or Apple App Store.
```

```
Open the App, click to add a new account and scan the provided QR Code.
```

**Step 12.** Complete the steps to add the account to your app. When finished, return to the above
screen, and click the “Continue” button.

**Step 13.** You will be prompted to add the verification code generated by the App. Enter the code and
click the “Verify” button.

**Step 14.** You will now be returned to the FWC’s Developer Portal and automatically logged in. You will
notice the top navigation bar has been updated to include several new items:

**Step 15.** Click on the “Subscribe” link to sign up a new API client product and obtain your API
Subscription Keys.

**Step 16.** Type your product subscription name and click the “Subscribe” button.

**Step 17.** You will automatically be redirected to the ‘User Profile’ page that will show your new
subscription including your Subscription keys, which you will manage from this screen going
forward.

```
When your subscription is approved, you will also receive a confirmation email which includes
some useful information and links.
```

**Step 18.** You can click “Show” to display the Primary or Secondary Subscription Keys in clear text.

**Step 19.** You can now navigate to the API’s Link in the Navigation Bar to explore the Modern Awards
Pay Database API. When you click on the “Try It” button with the API Explorer if will be pre-
populated with your Subscription Keys.

```
End of Registration Process
```

#### Inactive accounts

We may from time-to-time review the user accounts and choose to suspend or disable accounts that have
been inactive for a period greater than 12 months.

Our Terms of Use note that the circumstances in which we may terminate user access, including without
notice, and the terms on which we provide access to the MAPD API.

#### Terms of Use

The use of the Modern Awards Pay Database API is governed by the Terms of Use. All Modern Awards Pay
Database API users, will be required to accept the Terms of Use prior to gaining access to the ‘Try it’
functionality or directly calling an API endpoint.

It is critical that users subscribing to the Production Modern Awards Pay Database API are appropriately
authorised to accept these Terms of Use on behalf of their organisation.

### Design, development, and pre-production readiness

#### Design Considerations

**Understanding the nature of modern awards information**

Modern awards cover many working people in Australia and different awards apply to different industries and
occupations. Each modern award sets out the minimum pay rates and conditions of employment for those
covered by a particular award, including:

- Penalty rates, overtime, and casual rates,
- Annual and other types of leave,
- Hours of work, and
- Allowances.

The Modern Awards Pay Database API provides access to a sub-set of that information in a digital format,
particularly providing:

- Minimum rates of pay for each classification,
- Most penalty rates, overtime, and casual rates,

- Some junior and apprentice rates, and
- Some wage-related and expense-related allowances.

Modern award minimum rates and allowances are subject to an annual review and we may decide to update
the minimum rates and resulting allowances during this annual wage review. We may also make other updates
at other times throughout the year as other decisions are made by us which update or change those rates.

We have guidance available about what the MAPD API includes and doesn’t, why this is important to know and
where to get assistance in accessing modern awards. See Modern Awards Pay Database API.

**Design for resilience**

Whilst we have designed the Modern Awards Pay Database API to be highly available, we do not provide an
availability commitment to API subscribers. This is outlined in its Terms of Use.

You should design your solutions to be fault tolerant and capable of operating effectively if the Modern
Awards Pay Database API is unavailable for a period. When designing your products, you should consider
implementing a policy to locally cache Modern Awards Pay Database data for a suitable period of time.

If this functionality is used, we **strongly recommend** you utilise the Webhooks capability to allow you to
systematically subscribe to update events and assist you to ensure that your software is remaining up to date
with adjustments and changes that may be made to MAPD rates. Further information about the Webhooks
capability is provided below. Responsibility for ensuring correct rates for end users, rests with the user.

**Design to reduce load on the Modern Awards Pay Database API**

Given the range of rates available in the full suite of Modern Awards Pay Database API there is the potential
for a large transactional load for stable data, with data changes that are generally infrequent.

To reduce load, we have implemented caching mechanisms that respond to most transactions at the front
door and throttling capabilities to minimise load on back-end infrastructure and provide consistent
performance for all users.

API users are also required to be responsible users. So, what does that look like?

1. Analyse the business use case that requires Modern Awards Pay Database API data, including
    modelling:

```
a. the cumulative frequency of use,
b. the distribution of requests across modern awards,
c. peak transaction periods
```

2. Implement an appropriate caching mechanism for Modern Awards Pay Database API data, we suggest
    at least to 24 hours for high frequency API calls.
3. Leverage cache optimised queries where possible.
4. Subscribe to Modern Awards Pay Database Webhooks to be notified of data changes. The following
    subsection will outline good practices for consuming Modern Awards Pay Database webhooks.
5. Engage early with us to help us understand your expected transaction load and ensure that we are
    jointly prepared to support a positive experience for Australian employers, employees, payroll
    practitioners and business advisors. Contact our support team via email to <awards@fwc.gov.au>.
6. Understand the importance of your obligations under the Terms of Use in using and accessing the
    Modern Awards Pay Database API. This includes but is not limited to awareness that data from the
    MAPD API must be read in conjunction with the applicable modern award. We have guidance available
    about what the MAPD API includes and doesn’t, why this is important to know and where to get
    assistance in accessing modern awards. See Modern Awards Pay Database API.

For reference, we throttle requests on a per User/API Key basis:

- 1000 requests per second for HTTP GET calls.
- 500 requests per second for PUT and PATCH calls to webhook endpoints.

Additionally, we have configured the API gateway with throttling policies that leverage IP Address and
Regional throttling strategies. If your solution is expected to exceed the above thresholds or traffic is expected
to originate outside of Australia then please advise us as soon as practical, prior to the production release of
your Modern Awards Pay Database API functionality.

If you exceed the API throttling limit the API will return a “HTTP 429 Too Many Requests” error.

#### Using the Modern Awards Pay Database API

**API Subscription Key**

The Modern Awards Pay Database API is a read-only API (apart from Webhooks subscription management)
and as such we have made the decision to only implement API Key based authorisation in preference to other
more complex methods.

To obtain an API Subscription Key, refer to steps 1 5 through 1 9 in the Developer Portal Registration
instructions above.

Once an API Subscription Key has been obtained it is the responsibility of the User and their organisation to
securely store and manage these API Keys. If an API Subscription Key has been publicly exposed, please notify
us as soon as possible and regenerate the Subscription Key by logging onto the Developer Portal, navigating to
the Profile page and clicking the “Regenerate” link corresponding to the exposed key.

To use the API key in your solution you MUST include the API Subscription Key value in the following header of
all API Calls:

```
Header Name: Ocp-Apim-Subscription-Key
Header Value: [API Subscription Key value]
```

**Understanding errors**

When the Modern Awards Pay Database API is unable to process a request and returns an error, the high-level
reason for the error will be indicated by the HTTP Response Code. The Modern Awards Pay Database API uses
the following response codes:

```
Code Meaning
200 OK
201 Accepted
400 Bad Request
404 Not Found
```

All MAPD API endpoints also support a common error response object, which is aligned with the Australia
Government’s National API Standard:

```
Attribute Data Type Comments
Errors Array -
```

➔ Id (^) String A unique identifier for the error event
➔ detail (^) String A human-readable explanation specific to this occurrence of
the problem.
➔ Code (^) String A textual application-specific error code, for example,
“HandshakeFailed”
➔ source (^) Object An object containing references to the source of the error,
optionally including any of the following members: Pointer
or Parameter
→ parameter (^) String JSON Pointer [RFC6901] to the associated entity in the
request document [e.g. “/data” for a primary data object, or
“/data/attributes/title” for a specific attribute].
→ pointer String A string indicating which URI query parameter caused the
error.

#### Implementing the Modern Awards Pay Database Webhooks

**What are webhooks?**

If you are new to webhooks the easiest way to describe a webhook is a subscription to an API resource that
notifies your predefined endpoint when that resource has been modified.

```
500 Internal Error
```

Webhooks are still an emerging capability and there is no formalised or agreed international standard for their
implementation. As a result, we review industry practices, and techniques in use across the accounting and
payroll software sector, leveraging common design features to establish the webhooks capability for the
Modern Awards Pay Database API.

The Modern Awards Pay Database Webhooks support users to subscribe to 17 different triggers, designed to
provide the API user with maximum flexibility to configure the subscriptions that best suit their business
needs.

1. **AllAwards** - All awards.
2. **SingleAward** - Single award specified by award_fixed_id.
3. **AllClassifications** - All classifications.
4. **ClassificationsForAward** - Classification related to an award specified by award_fixed_id.
5. **SpecificClassification** - Classification identified by classification_fixed_id (passed as entity_fixed_id).
6. **AllExpenseAllowances** - All expense-related allowances.
7. **ExpenseAllowancesForAward** – Expense-related allowance related to an award specified by
    award_fixed_id.
8. **SpecificExpenseAllowance** – Expense-related allowance identified by expense_allowance_fixed_id
    (passed as entity_fixed_id).
9. **AllPenalties** - All penalties.
10. **PenaltiesForAward** – Penalty related to an award specified by award_fixed_id.
11. **SpecificPenalty** - Penalty identified by penalty_fixed_id (passed as entity_fixed_id).
12. **AllWageAllowances** - All wage-related allowances.
13. **WageAllowancesForAward** – Wage-related allowances related to an award specified by
    award_fixed_id.
14. **SpecificWageAllowance** – Wage-related allowances identified by wage_allowance_fixed_id (passed as
    entity_fixed_id).
15. **AllPayRates** - All pay rates.
16. **PayRatesForAward** - Pay rates related to an award specified by award_fixed_id.
17. **PayRateForSpecificClassification** - Pay rates identified by classification_fixed_id (passed as
    entity_fixed_id).

Each subscription is treated independently, meaning that an API user can subscribe to a single event multiple
time, specifying a different notification endpoint for each subscription.

**The process to subscribe to a webhook**

We provide a series of API endpoints to manage your webhooks subscriptions. To subscribe to a webhook you
need to have the following pre-requisites completed:

1. Have a callback endpoint configured and publicly available over the internet.
2. Have enabled TLS 1.2 or higher on the callback endpoint.
3. Have configured the callback endpoint to process the Modern Awards Pay Database Webhook
    Handshake request.

Once the pre-requisites are in place, you will send a HTTP POST request to the
<https://api.fwc.gov.au/api/v1/subscriptions> endpoint with the correctly formatted input payload. If successful
you will receive a HTTP 201 response, if unsuccessful you will receive a HTTP 400 response code, including an
error description in the response payload.

**_How does the Modern Awards Pay Database Webhook Handshake request work?_**

We have implemented a Webhook Handshake on signup. This is to prevent someone maliciously signing up a
3 rd party endpoint and using the Webhook to generate a Denial-of-Service attack on that 3rd party.

When you submit your HTTP POST request to subscribe to a webhook you will provide the following key
information in the payload:

```
Key Required Description
http_verb Yes The Modern Awards Pay Database webhook only
supports HTTP POST. If you specify another method (e.g.,
GET, PUT) then the webhook subscribe method will
return a HTTP 400 error.
callback_url Yes The Modern Awards Pay Database webhook will validate
this value. If empty, it will return a HTTP 400 error with
the BadRequest message. If the callback_url is invalid
(doesn’t exist or respond as expected) then the error
code will be HandshakeFailed.
hook_on Yes The value of this field must match one of the 17 possible
webhook triggers.
entity_fixed_id No The identifier of the target award sub-entity (rate,
allowance, penalty etc).
award_fixed_id No The identifier of the target award to which you are
subscribing.
webhook_headers (Array) No A maximum of five (5) webhook_header objects are
allowed.
webhook_headers→
name
```

```
Optional You can provide a header that will be sent with all calls
to your endpoint.
webhook_headers→
value
```

```
Optional You can provide a static header value that will be sent
with all calls to your endpoint.
```

The MAPD subscription endpoint will process the POST request and then initiate its own POST request (the
Handshake request) to the specified callback_url. The handshake request will contain the following payload
structure:

{
"correlation_id": "0ca96cd3-cef7- 4746 - 8cb9-a1a70d5ef5c1", // unique identifier for th
is handshake
"webhook_fixed_id": "480a070d-e3df-4a88-9aec-8389de3e7955", // this will be the fixed
_id for your webhook
"message_type": "HANDSHAKE",
"payload": null
}
Your call-back endpoint will then be expected to process this payload. If your endpoint encounters the
“message_type”: “HANDSHAKE” value, then it is expected to return a HTTP 201 response with a payload
containing the webhook_fixed_id key and value, that was received. If the Modern Awards Pay Database
Webhook cannot negotiate an acceptable TLS version and algorithm set, it will return a HTTP 400 error.

You should also persist the webhook_fixed_id and the callback_secret value as you will need this in future to
maintain your webhook registration. The callback_secret can be used in future to validate the authenticity of
requests to your callback endpoint.

**What happens if my callback endpoint is down when a webhook trigger is sent?**

If a webhook is triggered for a resource to which you have subscribed, we will attempt to send a trigger
payload to your callback endpoint. If your registered callback endpoint is unavailable or times out, we will
perform the following processing steps:

1. We will reattempt the request four (4) additional times, with a short delay between requests.
2. If we are unable to successfully connect (your endpoint does not provide a valid HTTP 200 response)
    we will mark your webhook subscription as inactive.

While your webhook subscription is marked as inactive, any new triggers will not result in notification to your
endpoint. You will need to make a HTTP PUT request to the /subscription/{webhook_fixed_id} endpoint to re-
enable your webhook. It is your responsibility to ensure that your webhook endpoints are active. We
recommend you implement monitoring of your webhook endpoint.

**Recommended practices for Webhooks**

**_Use webhooks to monitor for changes rather than polling the Modern Awards Pay Database API_**

The Modern Awards Pay Database API has been designed to support short-term peaks in API transaction
volumes but is not anticipating that every software product will call the API for every employee, for every pay
run. As the Modern Awards Pay Database Data has a relatively low rate of change outside of the Annual Wage
Review, we recommend that API users design their products to locally cache high-volume API responses (e.g.,
base rates, penalties, and allowances etc.) and only call the API to retrieve the latest changes.

As such, we recommend subscribing the relevant Webhook for these items to receive a callback with a few
minutes, if the underlying resource changes. This prevents unnecessary polling of the API, which will return the
same value on most attempts. Of course, you are welcome to call the API outside of a webhook trigger but use
common sense to ensure that you are abiding by the Terms of Use (see Terms of Use) and acting as a
responsible user.

**_Only subscribe to what matters_**

The Modern Awards Pay Database API provides the flexibility to subscribe to webhooks at multiple levels and
to specific modern awards or classifications. It is recommended that your solution subscribe only to the
resources that matter to your solution and product.

For example, out of the 155 modern awards, 121 are industry and occupational modern awards, the
remainder are modern enterprise awards and State reference public sector modern awards. Products targeted
to a particular industry or type of employment may not need to reference all awards.

**_Build a solution to filter and queue notifications, then process_**

We have built a solution that allows you to set a small set of custom headers, and we provide a callback_secret
when you subscribe to a webhook. You can use these values to filter requests that haven’t come from us,
dropping them at the door to protect from end-point spamming. Additionally, you may want to use the
custom headers to support flags that support you to prioritise updates for certain subscriptions or awards.

Ideally, we expect your endpoint to respond within two seconds or less. In real time, this means that we are
anticipating that you will receive the webhook callback, validate its authenticity, queue it for asynchronous
processing by a downstream process, and then send us success response.

**_Why does the Modern Awards Pay Database API encourage you to queue the request rather than call on API
endpoints to download the latest resource while initially processing the webhooks?_**

That answer is simple, efficient use of resources. We expect to be sending hundreds of thousands of webhook
callbacks to different software products in a very short period of time during annual wage review periods. If
we must wait for software products to undertake complex processing logic before we get confirmation that
the callback has been delivered, we will have a significant backlog of requests on our outbound queue. This
might delay someone else’s or your next notification, slowing the overall ecosystem down and delaying the
time until your product is up to date.

**_Managing maintenance windows and outages_**

You can mark your callback endpoint as offline for maintenance and mark it back online afterwards. This puts
you in control and prevents the Modern Awards Pay Database Webhooks from attempting to send you
messages and marking your endpoint offline without your knowledge.

However, as with most webhook solutions you might miss something during this period. The best recovery
mechanism is to run a query to check what data has changed during this period before you mark your
webhooks back online.

Each of our API endpoints currently supports the ability to obtain all current records for a given resource and
sort by last_modified_datetime in descending order.

#### Pre-production testing

**Are there security requirements or other requirements that need to be demonstrated in an integration?**

It is your responsibility to ensure that your product is fit for purpose and secure.

We encourage all software developer organisations using the Modern Awards Pay Database API to actively
engage with us as part of launch planning. We will not endorse any specific products or services, but can work

with you to discuss technical support, for example your anticipated transaction volumes. We can be contacted
in relation to the application of particular modern awards and other related matters. See Modern Awards Pay
Database API.

It also should be noted that we offer the Modern Awards Pay Database API in accordance with the Terms of
Use that you must accept to obtain a User Account and API Subscription Key. The terms of use note the
Commission can revoke access to the Modern Awards Pay Database API.

### API Support & Governance

#### API support arrangements

The Modern Awards Pay Database API is supported by us on a best effort basis, in accordance with our Terms
of Use.

**You can check the current operational status of the Modern Awards Pay Database API here:**

- <https://api.fwc.gov.au/status>

If you experience issues with the Modern Awards Pay Database API or have a technical enquiry, please contact
us by email to <awards@fwc.gov.au>.

Our support business hours are Monday to Friday 9am to 5pm AEST. We will respond to your enquiry as soon
as practicable.

#### API usage reporting

The FWC’s Developer Portal provides statistical usage reports for your API subscription covering an historical
period of up to 90 days. (<https://developer.fwc.gov.au/reports>)

These reports enable you to view the following statistics relating to your individual product subscription:

- Request volumes (Success, failure, blocked, total) per subscription,
- Average response time in milliseconds per subscription,
- Request volumes (Success, failure, blocked, total) per operation,
- Average response time in milliseconds per operation.

#### API governance and prior version support

We anticipate, due to the nature of modern awards, that most future enhancements to the Modern Awards
Pay Database API will be backwards compatible.

However, it has committed to an N-1 support model where the current version of the API plus the version
immediately prior will be supported. API users using an older version of the Modern Awards Pay Database API
may find they have inconsistent experiences.

Award dictionary
Field Name Data type Description
award_fixed_id Integer A unique code for this instance of the modern award resource that remains identical year on year.
award_id Integer Unique identification number of award
award_operative_from Date The date when the award came into operation
award_operative_to
 NULLABLE  Date The date when the award ceased to be in effect (was revoked).
code String The code assigned to the modern award. Also known as the award number.
name String The human readable title of the award
last_modified_datetime DateTime This is the date and time that the resource was last modified.
published_year String Year in which the minimum rates of pay were determined in the annual wage review.
version_number Integer This number indicates the version of the award resource. It is incremented by one each time the resource is updated.

Classification
Field name Data type Description
award_fixed_id Integer A unique code for this instance of the modern award resource that remains identical year on year.
base_pay_rate_id
 NULLABLE  String A unique identification number of the base pay rate resource. Values have the prefix (BR).
base_rate
 NULLABLE  Decimal The rate that the annual wage review increase is directly applied to.
base_rate_type
 NULLABLE  String The rate frequency such as: weekly, hourly, annual, daily, piece rate, cents per km, engagement rate.
calculate_pay_rate_id*
 NULLABLE  String A unique identification number of the calculated pay rate resource. Values have the prefix (CR).
calculated_rate_type
 NULLABLE  String Calculated rate type (hourly, weekly, annual, daily, fortnightly, casual hourly, cents per km, piece rate, engagement rate).
calculated_rate
 NULLABLE  Decimal Calculate rate of classification within clause - derived value from base rate.
classification String Used to describe a job title that is associated with a rate of pay in a modern award. Sub level classification of clause
classification_fixed_id integer Unique identification number of classification that remains identical year on year.
classification_level*
 NULLABLE  integer A numerical representation of the classification within the hierarchical structure of classifications in a clause. Starts at 1 for the lowest level classification.
clause_description
 NULLABLE  String Used to describe the content of the clause.
clause_fixed_id Integer Unique identification number of clauses that remains identical year on year.
clauses String Clause number as it appears in the award.
code String The code assigned to the modern award. Also known as the award number.
employee_rate_type_code
 NULLABLE  String An indicator if the rate is for an adult or otherwise:
AD - Adult
JN - Junior
AP - Apprentice
AA - Adult apprentice
TN - Trainee rates
XT - Exited from trainee-ship but not an Adult
CA - Cadet
last_modified_datetime DateTime This is the date and time that the resource was last modified.
next_down_classification_fixed_id
 NULLABLE  integer Refers to the classification_fixed_id for the next logical classification down the classification hierarchy.
next_up_classification_fixed_id
 NULLABLE  integer Refers to the classification_fixed_id for the next logical classification up the classification hierarchy.
operative_from Date The date when the record comes into operation. For a particular employee, this will only take effect from the beginning of that employee's first full pay period that starts on or after that date.
operative_to
 NULLABLE  Date The date on which the classification ceased to be in effect.
parent_classification_name
 NULLABLE  String Description of a parent classification. Used when there are classifications that belong to a group of classifications, e.g "Technical stream" may be parent of a group containing Levels 1-6.
published_year Integer The year in which the minimum rates of pay were determined in the annual wage review. For example, for the published year 2019 the rates in the annual wage review were determined on 30 May 2019. It includes all data that came into operation between 1 July 2019 and 30 June 2020.
version_number Integer This number indicates the version of the classification resource. It is incremented by one each time the resource is updated.
Wage allowance
Field name Data type Description
allowance String Description of allowance, taken from the summary of monetary allowances table in the award if the award contains one. Otherwise the allowance description is taken from the allowance sheets.
allowance_amount
 NULLABLE  Decimal Contains calculated allowance value ($) for the current year.
award_fixed_id Integer A unique code for this instance of the modern award resource that remains identical year on year.
base_pay_rate_id Integer A unique identification number of the base pay rate resource. Values have the prefix (BR).
clause_fixed_id Integer Unique identification number of clauses that remains identical year on year.
clauses String Clause number
code String The code assigned to the modern award. Also known as the award number.
is_all_purpose TinyInteger Used to flag whether an allowance applies for all purposes (1 = True, 2 = False).
An all-purpose allowance applies to all employees or a specific group of employees and forms part of their ordinary hourly rate
last_modified_date_time DateTime This is the date and time that the resource was last modified.
operative_from Date The date when the record comes into operation. For a particular employee, this will only take effect from the beginning of that employee's first full pay period that starts on or after that date.
operative_to
 NULLABLE  Date The date on which the allowance ceased to be in effect.
parent_allowance
 NULLABLE  String Description of parent allowance (often used for a title of a group such as "meal allowances" for a group of breakfast, lunch and dinner allowances).
payment_frequency
 NULLABLE  String Denotes when the payment of an allowance is made, eg - per week, per hour, per meal etc.
published_year Integer The year in which the minimum rates of pay were determined in the annual wage review.
For example, for the published year 2019 the rates in the annual wage review were determined on 30 May 2019.
It includes all data that came into operation between 1 July 2019 and 30 June 2020.
rate
 NULLABLE  Decimal Percentage of standard rate (base rate)
rate_unit
 NULLABLE  String Rate unit (Percent)
version_number integer This number indicates the version of the allowance resource. It is incremented by one each time the resource is updated.
wage_allowance_fixed_id integer Unique identification number of the wage-related allowance that remains identical year on year.
Expense allowance
Field name Data type Description
allowance String Description of allowance, taken from the summary of monetary allowances table in the award if the award contains one. Otherwise the allowance description is taken from the allowance sheets.
allowance_amount
 NULLABLE  Decimal Contains calculated allowance value ($) for the current year.
award_fixed_id Integer A unique code for this instance of the modern award resource that remains identical year on year.
clauses String Clause number as it appears in the award.
clause_fixed_id Integer Unique identification number of clauses that remains identical year on year.
code String The code assigned to the modern award. Also known as the award number.
cpi_quarter_last_adjusted
 NULLABLE  String The quarter in which the CPI of last adjusted year relates to.
It will be populated in 2021 for those expense allowances that were adjusted in 2020.
expense_allowance_fixed_id Integer Unique identification number of expense-related allowance remains identical year on year.
is_all_purpose TinyInteger Used to flag whether an allowance applies for all purposes (1 = True, 0 = false).
An all-purpose allowance applies to all employees or a specific group of employees and forms part of their ordinary hourly rate.
last_adjusted_year
 NULLABLE  Integer The year in which the expense allowance was last adjusted
last_modified_date_time DateTime This is the date and time that the resource was last modified.
operative_from Date The date when the record comes into operation. For a particular employee, this will only take effect from the beginning of that employee's first full pay period that starts on or after that date.
operative_to
 NULLABLE  Date The date on which the allowance ceased to be in effect.
parent_allowance
 NULLABLE  String Description of parent allowance often used for a title of a group such as "meal allowances" for a group of breakfast, lunch and dinner allowances.
payment_frequency
 NULLABLE  String Denotes when the payment of an allowance is made, eg - per week, per hour, per meal etc.
published_year Integer The year in which the minimum rates of pay were determined in the annual wage review.
For example, for the published year 2019 the rates in the annual wage review were determined on 30 May 2019. It includes all data that came into operation between 1 July 2019 and 30 June 2020.
version_number integer This number indicates the version of the allowance resource. It is incremented by one each time the resource is updated.
Penalty
Field name Data type Description
award_fixed_id Integer A unique code for this instance of the modern award resource that remains identical year on year.
base_pay_rate_id
 NULLABLE  String A unique identification number of the base pay rate resource. Values have the prefix (BR).
classification_level
 NULLABLE  Integer A numerical representation of the classification within the hierarchical structure of classifications in a clause.
Starts at 1 for the lowest level classification.
clause_description String Adds context to the penalties of a clause.
Description is taken from the clause heading from the corresponding Summary table in the Award (ie Full-time and part-time adult employees-ordinary and penalty rates)
clause_fixed_id Integer Unique identification number of clause that is fixed over each year.
code String The code assigned to the modern award. Also known as the award number.
employee_rate_type code
 NULLABLE  String An indicator if the rate is for an adult or otherwise:
AD - Adult
JN - Junior
AP - Apprentice
AA - Adult apprentice
TN - Trainee rates
XT - Exited from trainee-ship but not an Adult
CA - Cadet
last_modified_date_time DateTime This is the date and time that the resource was last modified.
operative_from Date The date when the record comes into operation.
For a particular employee, this will only take effect from the beginning of that employe's first full pay period that starts on or after that date.
operative_to
 NULLABLE  Date The date on which the penalty rate ceased to be in effect.
penalty_calculated_value
 NULLABLE  Decimal Calculated value of penalty
penalty_description String Penalty description from the relevant clause in the award.
penalty_fixed_id Integer Unique identification number of the penalty that remains identical year on year.
published_year Integer The year in which the minimum rates of pay were determined in the annual wage review.
For example, for the published year 2019 the rates in the annual wage review were determined on 30 May 2019. It includes all data that came into operation between 1 July 2019 and 30 June 2020.
rate Decimal The value of penalty that is applied as a percentage to the minimum/ordinary hourly rate.
version_number integer This number indicates the version of the penalty resource. It is incremented by one each time the resource is updated.
