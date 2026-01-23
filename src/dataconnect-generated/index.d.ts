import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CompleteJobData {
  videoJob_update?: VideoJob_Key | null;
}

export interface CompleteJobVariables {
  id: UUIDString;
  resultJson: string;
  title?: string | null;
}

export interface CreateVideoJobData {
  videoJob_insert: VideoJob_Key;
}

export interface CreateVideoJobVariables {
  videoUrl: string;
  source: string;
  taskType: string;
}

export interface FailJobData {
  videoJob_update?: VideoJob_Key | null;
}

export interface FailJobVariables {
  id: UUIDString;
  error: string;
}

export interface GetJobData {
  videoJob?: {
    id: UUIDString;
    videoUrl: string;
    source: string;
    taskType: string;
    status: string;
    executedAgents: string[];
    resultJson?: string | null;
    error?: string | null;
    title?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & VideoJob_Key;
}

export interface GetJobEventsData {
  jobEvents: ({
    id: UUIDString;
    eventType: string;
    agent?: string | null;
    details?: string | null;
    timestamp: TimestampString;
  } & JobEvent_Key)[];
}

export interface GetJobEventsVariables {
  jobId: UUIDString;
}

export interface GetJobVariables {
  id: UUIDString;
}

export interface JobEvent_Key {
  id: UUIDString;
  __typename?: 'JobEvent_Key';
}

export interface ListJobsData {
  videoJobs: ({
    id: UUIDString;
    videoUrl: string;
    source: string;
    taskType: string;
    status: string;
    title?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & VideoJob_Key)[];
}

export interface ListJobsVariables {
  limit?: number | null;
}

export interface RecordJobEventData {
  jobEvent_insert: JobEvent_Key;
}

export interface RecordJobEventVariables {
  jobId: UUIDString;
  eventType: string;
  agent?: string | null;
  details?: string | null;
}

export interface UpdateJobStatusData {
  videoJob_update?: VideoJob_Key | null;
}

export interface UpdateJobStatusVariables {
  id: UUIDString;
  status: string;
  executedAgents?: string[] | null;
}

export interface VideoJob_Key {
  id: UUIDString;
  __typename?: 'VideoJob_Key';
}

interface CreateVideoJobRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateVideoJobVariables): MutationRef<CreateVideoJobData, CreateVideoJobVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateVideoJobVariables): MutationRef<CreateVideoJobData, CreateVideoJobVariables>;
  operationName: string;
}
export const createVideoJobRef: CreateVideoJobRef;

export function createVideoJob(vars: CreateVideoJobVariables): MutationPromise<CreateVideoJobData, CreateVideoJobVariables>;
export function createVideoJob(dc: DataConnect, vars: CreateVideoJobVariables): MutationPromise<CreateVideoJobData, CreateVideoJobVariables>;

interface UpdateJobStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateJobStatusVariables): MutationRef<UpdateJobStatusData, UpdateJobStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateJobStatusVariables): MutationRef<UpdateJobStatusData, UpdateJobStatusVariables>;
  operationName: string;
}
export const updateJobStatusRef: UpdateJobStatusRef;

export function updateJobStatus(vars: UpdateJobStatusVariables): MutationPromise<UpdateJobStatusData, UpdateJobStatusVariables>;
export function updateJobStatus(dc: DataConnect, vars: UpdateJobStatusVariables): MutationPromise<UpdateJobStatusData, UpdateJobStatusVariables>;

interface CompleteJobRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CompleteJobVariables): MutationRef<CompleteJobData, CompleteJobVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CompleteJobVariables): MutationRef<CompleteJobData, CompleteJobVariables>;
  operationName: string;
}
export const completeJobRef: CompleteJobRef;

export function completeJob(vars: CompleteJobVariables): MutationPromise<CompleteJobData, CompleteJobVariables>;
export function completeJob(dc: DataConnect, vars: CompleteJobVariables): MutationPromise<CompleteJobData, CompleteJobVariables>;

interface FailJobRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: FailJobVariables): MutationRef<FailJobData, FailJobVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: FailJobVariables): MutationRef<FailJobData, FailJobVariables>;
  operationName: string;
}
export const failJobRef: FailJobRef;

export function failJob(vars: FailJobVariables): MutationPromise<FailJobData, FailJobVariables>;
export function failJob(dc: DataConnect, vars: FailJobVariables): MutationPromise<FailJobData, FailJobVariables>;

interface RecordJobEventRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordJobEventVariables): MutationRef<RecordJobEventData, RecordJobEventVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: RecordJobEventVariables): MutationRef<RecordJobEventData, RecordJobEventVariables>;
  operationName: string;
}
export const recordJobEventRef: RecordJobEventRef;

export function recordJobEvent(vars: RecordJobEventVariables): MutationPromise<RecordJobEventData, RecordJobEventVariables>;
export function recordJobEvent(dc: DataConnect, vars: RecordJobEventVariables): MutationPromise<RecordJobEventData, RecordJobEventVariables>;

interface GetJobRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetJobVariables): QueryRef<GetJobData, GetJobVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetJobVariables): QueryRef<GetJobData, GetJobVariables>;
  operationName: string;
}
export const getJobRef: GetJobRef;

export function getJob(vars: GetJobVariables): QueryPromise<GetJobData, GetJobVariables>;
export function getJob(dc: DataConnect, vars: GetJobVariables): QueryPromise<GetJobData, GetJobVariables>;

interface ListJobsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListJobsVariables): QueryRef<ListJobsData, ListJobsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: ListJobsVariables): QueryRef<ListJobsData, ListJobsVariables>;
  operationName: string;
}
export const listJobsRef: ListJobsRef;

export function listJobs(vars?: ListJobsVariables): QueryPromise<ListJobsData, ListJobsVariables>;
export function listJobs(dc: DataConnect, vars?: ListJobsVariables): QueryPromise<ListJobsData, ListJobsVariables>;

interface GetJobEventsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetJobEventsVariables): QueryRef<GetJobEventsData, GetJobEventsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetJobEventsVariables): QueryRef<GetJobEventsData, GetJobEventsVariables>;
  operationName: string;
}
export const getJobEventsRef: GetJobEventsRef;

export function getJobEvents(vars: GetJobEventsVariables): QueryPromise<GetJobEventsData, GetJobEventsVariables>;
export function getJobEvents(dc: DataConnect, vars: GetJobEventsVariables): QueryPromise<GetJobEventsData, GetJobEventsVariables>;

