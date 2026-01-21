---
trigger: model_decision
description: when an error happens, or api is required check here first
---

gcloud - manage Google Cloud resources and developer workflow

DESCRIPTION
    The gcloud CLI manages authentication, local configuration, developer
    workflow, and interactions with the Google Cloud APIs.

    cheat-sheet or see the `gcloud` CLI cheat sheet
    (https://cloud.google.com/sdk/docs/cheatsheet).
OTHER FLAGS
-access-token-file=ACCESS_TOKEN_FILE A file path to read the access token. Use this flag to authenticate
        gcloud with an access token. The credentials of the active account (if
        exists) will be ignored. The file should only contain an access token
        with no other information. Overrides the default auth/access_token_file
        property value for this command invocation.

     --impersonate-service-account=SERVICE_ACCOUNT_EMAILS
        For this gcloud invocation, all API requests will be made as the given
        service account or target service account in an impersonation
        delegation chain instead of the currently selected account. You can
        specify either a single service account as the impersonator, or a
        comma-separated list of service accounts to create an impersonation
        delegation chain. The impersonation is done without needing to create,
        download, and activate a key for the service account or accounts.
In order to make API requests as a service account, your currently
        selected account must have an IAM role that includes the
        iam.serviceAccounts.getAccessToken permission for the service account
        or accounts.

        The roles/iam.serviceAccountTokenCreator role has the
        iam.serviceAccounts.getAccessToken permission. You can also create a
        custom role.

        You can specify a list of service accounts, separated with commas. This
        creates an impersonation delegation chain in which each service account
        delegates its permissions to the next service account in the chain.
        Each service account in the list must have the
        roles/iam.serviceAccountTokenCreator role on the next service account
        in the list. For example, when --impersonate-service-account=
        SERVICE_ACCOUNT_1,SERVICE_ACCOUNT_2, the active account must have the
        roles/iam.serviceAccountTokenCreator role on SERVICE_ACCOUNT_1, which
        must have the roles/iam.serviceAccountTokenCreator role on
        SERVICE_ACCOUNT_2. SERVICE_ACCOUNT_1 is the impersonated service
        account and SERVICE_ACCOUNT_2 is the delegate.

        Overrides the default auth/impersonate_service_account property value
        for this command invocation.

     --log-http
        Log all HTTP server requests and responses to stderr. Overrides the
        default core/log_http property value for this command invocation.

     --trace-token=TRACE_TOKEN
        Token used to route traces of service requests for investigation of
--user-output-enabled
        Print user intended output to the console. Overrides the default
        core/user_output_enabled property value for this command invocation.
        Use --no-user-output-enabled to disable.

GROUPS
    GROUP is one of the following:

     access-approval
        Manage Access Approval requests and settings.

     access-context-manager
        Manage Access Context Manager resources.

     active-directory
        Manage Managed Microsoft AD resources.

     ai
        Manage entities in Vertex AI.

     ai-platform
        Manage AI Platform jobs and models.

     alloydb
        Create and manage AlloyDB databases.

     alpha
        (ALPHA) Alpha versions of gcloud commands.

     anthos
        Anthos command Group.

     api-gateway
        Manage Cloud API Gateway resources.

     apigee
        Manage Apigee resources.

     app
        Manage your App Engine deployments.

     apphub
        Manage App Hub resources.

     artifacts
        Manage Artifact Registry resources.
asset
        Manage the Cloud Asset Inventory.

     assured
        Read and manipulate Assured Workloads data controls.

     audit-manager
        Enroll resources, audit workloads and generate reports.

     auth
        Manage oauth2 credentials for the Google Cloud CLI.

     backup-dr
        Manage Backup and DR resources.

     batch
        Manage Batch resources.

     beta
        (BETA) Beta versions of gcloud commands.

     beyondcorp
        Manage Beyondcorp resources.

     bigtable
        Manage your Cloud Bigtable storage.

     billing
        Manage billing accounts and associate them with projects.

     bms
        Manage Bare Metal Solution resources.

     bq
        Manage Bq resources.

     builds
        Create and manage builds for Google Cloud Build.

     certificate-manager
        Manage SSL certificates for your Google Cloud projects.

     cloud-shell
        Manage Google Cloud Shell.
 cloudlocationfinder
        Manage Cloudlocationfinder resources.

     colab
        Manage Colab Enterprise resources.

     compliance-manager
        Manage Compliance Manager resources.

     components
        List, install, update, or remove Google Cloud CLI components.

     composer
        Create and manage Cloud Composer Environments.

     compute
        Create and manipulate Compute Engine resources.

     config
        View and edit Google Cloud CLI properties.

     container
        Deploy and manage clusters of machines for running containers.

     data-catalog
        Manage Data Catalog resources.

     database-migration
        Manage Database Migration Service resources.

     dataflow
        Manage Google Cloud Dataflow resources.

     dataplex
        Manage Dataplex resources.
dataproc
        Create and manage Google Cloud Dataproc clusters and jobs.

     datastore
        Manage your Cloud Datastore resources.

     datastream
        Manage Cloud Datastream resources.

     deploy
        Create and manage Cloud Deploy resources.

     deployment-manager
        Manage deployments of cloud resources.

     design-center
        Manage Application Design Center resources.
developer-connect
        Manage Developer Connect resources.
     dns
        Manage your Cloud DNS managed-zones and record-sets.
domains
        Manage domains for your Google Cloud projects.

     edge-cache
        Manage Media CDN resources.

     edge-cloud
        Manage edge-cloud resources.

     emulators
        Set up your local development environment using emulators.

     endpoints
        Create, enable and manage API services.
eventarc
        Manage Eventarc resources.
filestore
        Create and manipulate Filestore resources.

     firebase
        Work with Google Firebase.

     firestore
        Manage your Cloud Firestore resources.

     functions
        Manage Google Cloud Functions.

     gemini
        Manage resources associated with Gemini Code Assist and Gemini Cloud
        Assist.
healthcare
        Manage Cloud Healthcare resources.

     iam
        Manage IAM service accounts and keys.

     iap
        Manage IAP policies.

     identity
        Manage Cloud Identity Groups and Memberships resources.

     ids
        Manage Cloud IDS.

     immersive-stream
        Manage Immersive Stream resources.

     infra-manager
        Manage Infra Manager resources.

     kms
        Manage cryptographic keys in the cloud.

     logging
        Manage Cloud Logging.

     looker
        Manage Looker resources.

     lustre
        Manage Lustre resources.
managed-kafka
        Administer Managed Service for Apache Kafka clusters, topics, and
        consumer groups.

     memcache
        Manage Cloud Memorystore Memcached resources.

     memorystore
        Manage Memorystore resources.

     metastore
        Manage Dataproc Metastore resources.
migration
        The root group for various Cloud Migration teams.

     ml
        Use Google Cloud machine learning capabilities.

     model-armor
        Model Armor is a service offering LLM-agnostic security and AI safety
        measures to mitigate risks associated with large language models
        (LLMs).

     monitoring
        Manage Cloud Monitoring dashboards.

     netapp
        Create and manipulate Cloud NetApp Files resources.

     network-connectivity
        Manage Network Connectivity resources.
network-management
        Manage Network Management resources.

     network-security
        Manage Network Security resources.

     network-services
        Manage Network Services resources.

     notebooks
        Notebooks Command Group.

     observability
        Manage Observability resources.
org-policies
        Create and manage Organization Policies.

     organizations
        Create and manage Google Cloud Platform Organizations.

     pam
        Manage Privileged Access Manager (PAM) entitlements and grants.

     parametermanager
        Parameter Manager is a single source of truth to store, access and
        manage the lifecycle of your application parameters.

     policy-intelligence
        A platform to help better understand, use, and manage policies at
        scale.
recommender
        Manage Cloud recommendations and recommendation rules.

     redis
        Manage Cloud Memorystore Redis resources.

     resource-manager
        Manage Cloud Resources.

     run
        Manage your Cloud Run applications.

     scc
        Manage Cloud SCC resources.

     scheduler
        Manage Cloud Scheduler jobs and schedules.

     secrets
        Manage secrets on Google Cloud.
service-directory
        Command groups for Service Directory.

     service-extensions
        Manage Service Extensions resources.

     services
        List, enable and disable APIs and services.
source
        Cloud git repository commands.

     source-manager
        Manage Secure Source Manager resources.

     spanner
        Command groups for Cloud Spanner.

     sql
        Create and manage Google Cloud SQL databases.

     storage
        Create and manage Cloud Storage buckets and objects.

     tasks
        Manage Cloud Tasks queues and tasks.
telco-automation
        Manage Telco Automation resources.

     topic
        gcloud supplementary help.

     transcoder
        Manage Transcoder jobs and job templates.

     transfer
        Manage Transfer Service jobs, operations, and agents.

vmware Manage Google Cloud VMware Engine resources.

     workbench
        Workbench Command Group.

     workflows
        Manage your Cloud Workflows resources.

     workspace-add-ons
        Manage Google Workspace Add-ons resources.

     workstations
        Manage Cloud Workstations resources.

COMMANDS COMMAND is one of the following:

cheat-sheet=Display gcloud cheat sheet.
help= Search gcloud help text.
info=Display information on the current gcloud environment.
init=Initialize or reinitialize gcloud.
version= Print version information for Google Cloud CLI components.

https://console.cloud.google.com/welcome?project=uvai-730bb

https://docs.cloud.google.com/docs/samples

https://platform.openai.com/docs/guides/speech-to-text

https://docs.cloud.google.com/vertex-ai/docs

https://js.api.genkit.dev/

https://docs.cloud.google.com/vertex-ai/docs/glossary

https://github.com/openai/whisper

https://python.api.genkit.dev/

https://genkit.dev/docs/tutorials/summarize-youtube-videos/

https://developers.google.com/apis-explorer

https://geminicli.com/

https://docs.cloud.google.com/vertex-ai/docs/predictions/get-online-predictions

https://docs.cloud.google.com/vertex-ai/docs