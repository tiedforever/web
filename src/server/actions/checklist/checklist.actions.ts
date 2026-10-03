"use server";

import { revalidatePath } from "next/cache";
import {
  ActiveWeddingRequiredError,
} from "../../auth/get-active-wedding";
import type { ActiveWeddingContext } from "../../auth/get-active-wedding";
import { AuthenticationRequiredError } from "../../auth/get-authenticated-user";
import {
  PermissionDeniedError,
  requireRole,
} from "../../auth/authorization";
import { logger } from "../../logging/logger";
import {
  ChecklistRepositoryError,
  checklistRepository,
  type CreateCategoryInput as RepositoryCreateCategoryInput,
  type CreateTaskInput as RepositoryCreateTaskInput,
  type TaskLinkInput as RepositoryTaskLinkInput,
  type TaskRecurrenceInput as RepositoryTaskRecurrenceInput,
  type UpdateCategoryInput as RepositoryUpdateCategoryInput,
  type UpdateTaskInput as RepositoryUpdateTaskInput,
} from "../../repositories/checklist.repository";

const MAX_CATEGORY_NAME_LENGTH = 100;
const MAX_TASK_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 10_000;
const MAX_ICON_LENGTH = 100;
const MAX_COLOUR_LENGTH = 50;
const MAX_LINK_LABEL_LENGTH = 200;
const MAX_LINK_URL_LENGTH = 2_048;

const taskStatuses = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly NonNullable<RepositoryCreateTaskInput["status"]>[];

const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const satisfies readonly NonNullable<RepositoryCreateTaskInput["priority"]>[];

const recurrenceFrequencies = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
] as const satisfies readonly RepositoryTaskRecurrenceInput["frequency"][];

type DateValue = Date | string;
type InputRecord = Record<string, unknown>;

type ParseResult<T> = { value: T } | { error: string };

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CategoryActionData = {
  id: string;
  weddingId: string;
  name: string;
  icon: string | null;
  colour: string | null;
  position: number;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AssignableMemberActionData = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
};

type AssigneeActionData = {
  id: string;
  weddingId: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  } | null;
};

type LinkActionData = {
  id: string;
  taskId: string;
  label: string | null;
  url: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

type RecurrenceActionData = {
  id: string;
  taskId: string;
  frequency: string;
  interval: number;
  startsOn: string | null;
  endsOn: string | null;
  nextOccurrenceAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CategorySummaryActionData = Omit<CategoryActionData, "taskCount">;

export type TaskSummaryActionData = {
  id: string;
  weddingId: string;
  categoryId: string;
  assigneeId: string | null;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskActionData = TaskSummaryActionData & {
  assignee: AssigneeActionData | null;
  recurrence: RecurrenceActionData | null;
  links: LinkActionData[];
  children: TaskActionData[];
  category: CategorySummaryActionData | null;
  parentTask: TaskSummaryActionData | null;
};

type RepositoryCategoryRecord = {
  id: string;
  weddingId: string;
  name: string;
  icon: string | null;
  colour: string | null;
  position: number;
  createdAt: DateValue;
  updatedAt: DateValue;
  _count?: { tasks: number };
};

type RepositoryAssigneeRecord = {
  id: string;
  weddingId: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: DateValue | null;
  leftAt: DateValue | null;
  createdAt: DateValue;
  updatedAt: DateValue;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  };
};

type RepositoryAssignableMemberRecord = {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  };
};

type RepositoryLinkRecord = {
  id: string;
  taskId: string;
  label: string | null;
  url: string;
  position: number;
  createdAt: DateValue;
  updatedAt: DateValue;
};

type RepositoryRecurrenceRecord = {
  id: string;
  taskId: string;
  frequency: string;
  interval: number;
  startsOn: DateValue | null;
  endsOn: DateValue | null;
  nextOccurrenceAt: DateValue | null;
  createdAt: DateValue;
  updatedAt: DateValue;
};

type RepositoryTaskRecord = {
  id: string;
  weddingId: string;
  categoryId: string;
  assigneeId: string | null;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: DateValue | null;
  completedAt: DateValue | null;
  position: number;
  createdAt: DateValue;
  updatedAt: DateValue;
  assignee?: RepositoryAssigneeRecord | null;
  recurrence?: RepositoryRecurrenceRecord | null;
  links?: readonly RepositoryLinkRecord[];
  childTasks?: readonly RepositoryTaskRecord[];
  category?: RepositoryCategoryRecord | null;
  parentTask?: RepositoryTaskRecord | null;
};

function failure<T = never>(error: string): ActionResult<T> {
  return { success: false, error };
}

class ChecklistValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChecklistValidationError";
  }
}

function isParseError<T>(result: ParseResult<T>): result is { error: string } {
  return "error" in result;
}

function parseRecord(input: unknown): ParseResult<InputRecord> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { error: "Invalid input" };
  }

  return { value: input as InputRecord };
}

function parseRequiredString(
  value: unknown,
  field: string,
  maxLength?: number,
): ParseResult<string> {
  if (typeof value !== "string") {
    return { error: `${field} is required` };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { error: `${field} is required` };
  }

  if (maxLength !== undefined && trimmed.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer` };
  }

  return { value: trimmed };
}

function parseOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
): ParseResult<string | null | undefined> {
  if (value === undefined) {
    return { value: undefined };
  }

  if (value === null) {
    return { value: null };
  }

  if (typeof value !== "string") {
    return { error: `${field} must be a string` };
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer` };
  }

  return { value: trimmed.length > 0 ? trimmed : null };
}

function parseOptionalId(
  value: unknown,
  field: string,
): ParseResult<string | null | undefined> {
  if (value === undefined || value === null) {
    return { value };
  }

  return parseRequiredString(value, field);
}

function parseOptionalPosition(
  value: unknown,
  field: string,
): ParseResult<number | undefined> {
  if (value === undefined) {
    return { value: undefined };
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return { error: `${field} must be a non-negative integer` };
  }

  return { value };
}

function parseRequiredPosition(value: unknown, field: string): ParseResult<number> {
  const position = parseOptionalPosition(value, field);

  if (isParseError(position)) {
    return position;
  }

  if (position.value === undefined) {
    return { error: `${field} is required` };
  }

  return { value: position.value };
}

function parseOptionalDate(
  value: unknown,
  field: string,
): ParseResult<Date | null | undefined> {
  if (value === undefined) return { value: undefined };
  if (value === null || value === "") return { value: null };

  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : typeof value === "string"
        ? new Date(value)
        : null;

  if (!date || Number.isNaN(date.getTime())) {
    return { error: `${field} must be a valid date` };
  }

  return { value: date };
}

function parseOptionalPositiveInteger(
  value: unknown,
  field: string,
): ParseResult<number | undefined> {
  if (value === undefined) {
    return { value: undefined };
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return { error: `${field} must be a positive integer` };
  }

  return { value };
}

function parseEnumValue<T extends string>(
  value: unknown,
  field: string,
  values: readonly T[],
): ParseResult<T> {
  if (typeof value !== "string" || !values.includes(value as T)) {
    return { error: `${field} must be one of: ${values.join(", ")}` };
  }

  return { value: value as T };
}

function parseOptionalEnum<T extends string>(
  value: unknown,
  field: string,
  values: readonly T[],
): ParseResult<T | undefined> {
  if (value === undefined) return { value: undefined };

  return parseEnumValue(value, field, values);
}

function parseLinks(
  value: unknown,
): ParseResult<readonly RepositoryTaskLinkInput[] | undefined> {
  if (value === undefined) {
    return { value: undefined };
  }

  if (!Array.isArray(value)) {
    return { error: "links must be an array" };
  }

  const links: RepositoryTaskLinkInput[] = [];

  for (const [index, item] of value.entries()) {
    const record = parseRecord(item);

    if (isParseError(record)) {
      return { error: `links[${index}] is invalid` };
    }

    const label = parseOptionalString(
      record.value.label,
      `links[${index}].label`,
      MAX_LINK_LABEL_LENGTH,
    );
    if (isParseError(label)) return label;

    const url = parseRequiredString(
      record.value.url,
      `links[${index}].url`,
      MAX_LINK_URL_LENGTH,
    );
    if (isParseError(url)) return url;

    const position = parseOptionalPosition(
      record.value.position,
      `links[${index}].position`,
    );
    if (isParseError(position)) return position;

    links.push({
      label: label.value,
      url: url.value,
      ...(position.value !== undefined ? { position: position.value } : {}),
    });
  }

  return { value: links };
}

function parseRecurrence(
  value: unknown,
): ParseResult<RepositoryTaskRecurrenceInput | null | undefined> {
  if (value === undefined || value === null) {
    return { value };
  }

  const record = parseRecord(value);
  if (isParseError(record)) {
    return { error: "recurrence must be an object or null" };
  }

  const frequency = parseEnumValue(
    record.value.frequency,
    "recurrence.frequency",
    recurrenceFrequencies,
  );
  if (isParseError(frequency)) return frequency;

  const interval = parseOptionalPositiveInteger(
    record.value.interval,
    "recurrence.interval",
  );
  if (isParseError(interval)) return interval;

  const startsOn = parseOptionalDate(
    record.value.startsOn,
    "recurrence.startsOn",
  );
  if (isParseError(startsOn)) return startsOn;

  const endsOn = parseOptionalDate(record.value.endsOn, "recurrence.endsOn");
  if (isParseError(endsOn)) return endsOn;

  if (
    startsOn.value instanceof Date &&
    endsOn.value instanceof Date &&
    endsOn.value < startsOn.value
  ) {
    return { error: "recurrence.endsOn must not be before recurrence.startsOn" };
  }

  const nextOccurrenceAt = parseOptionalDate(
    record.value.nextOccurrenceAt,
    "recurrence.nextOccurrenceAt",
  );
  if (isParseError(nextOccurrenceAt)) return nextOccurrenceAt;

  return {
    value: {
      frequency: frequency.value,
      ...(interval.value !== undefined ? { interval: interval.value } : {}),
      ...(startsOn.value !== undefined ? { startsOn: startsOn.value } : {}),
      ...(endsOn.value !== undefined ? { endsOn: endsOn.value } : {}),
      ...(nextOccurrenceAt.value !== undefined
        ? { nextOccurrenceAt: nextOccurrenceAt.value }
        : {}),
    },
  };
}

function parseTaskOptionalFields(
  record: InputRecord,
): ParseResult<
  Omit<RepositoryUpdateTaskInput, "categoryId" | "links" | "recurrence">
    & {
      links?: readonly RepositoryTaskLinkInput[];
      recurrence?: RepositoryTaskRecurrenceInput | null;
    }
> {
  const assigneeId = parseOptionalId(record.assigneeId, "assigneeId");
  if (isParseError(assigneeId)) return assigneeId;

  const parentTaskId = parseOptionalId(record.parentTaskId, "parentTaskId");
  if (isParseError(parentTaskId)) return parentTaskId;

  const description = parseOptionalString(
    record.description,
    "description",
    MAX_DESCRIPTION_LENGTH,
  );
  if (isParseError(description)) return description;

  const status = parseOptionalEnum(record.status, "status", taskStatuses);
  if (isParseError(status)) return status;

  const priority = parseOptionalEnum(
    record.priority,
    "priority",
    taskPriorities,
  );
  if (isParseError(priority)) return priority;

  const dueDate = parseOptionalDate(record.dueDate, "dueDate");
  if (isParseError(dueDate)) return dueDate;

  const completedAt = parseOptionalDate(record.completedAt, "completedAt");
  if (isParseError(completedAt)) return completedAt;

  const position = parseOptionalPosition(record.position, "position");
  if (isParseError(position)) return position;

  const links = parseLinks(record.links);
  if (isParseError(links)) return links;

  const recurrence = parseRecurrence(record.recurrence);
  if (isParseError(recurrence)) return recurrence;

  return {
    value: {
      ...(assigneeId.value !== undefined ? { assigneeId: assigneeId.value } : {}),
      ...(parentTaskId.value !== undefined
        ? { parentTaskId: parentTaskId.value }
        : {}),
      ...(description.value !== undefined ? { description: description.value } : {}),
      ...(status.value !== undefined ? { status: status.value } : {}),
      ...(priority.value !== undefined ? { priority: priority.value } : {}),
      ...(dueDate.value !== undefined ? { dueDate: dueDate.value } : {}),
      ...(completedAt.value !== undefined
        ? { completedAt: completedAt.value }
        : {}),
      ...(position.value !== undefined ? { position: position.value } : {}),
      ...(links.value !== undefined ? { links: links.value } : {}),
      ...(recurrence.value !== undefined ? { recurrence: recurrence.value } : {}),
    },
  };
}

function parseIsoDate(value: DateValue | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapCategory(
  category: RepositoryCategoryRecord,
): CategoryActionData {
  return {
    id: category.id,
    weddingId: category.weddingId,
    name: category.name,
    icon: category.icon,
    colour: category.colour,
    position: category.position,
    taskCount: category._count?.tasks ?? 0,
    createdAt: parseIsoDate(category.createdAt) as string,
    updatedAt: parseIsoDate(category.updatedAt) as string,
  };
}

function mapCategorySummary(
  category: RepositoryCategoryRecord,
): CategorySummaryActionData {
  const mapped = mapCategory(category);

  return {
    id: mapped.id,
    weddingId: mapped.weddingId,
    name: mapped.name,
    icon: mapped.icon,
    colour: mapped.colour,
    position: mapped.position,
    createdAt: mapped.createdAt,
    updatedAt: mapped.updatedAt,
  };
}

function mapAssignableMember(
  member: RepositoryAssignableMemberRecord,
): AssignableMemberActionData {
  return {
    id: member.id,
    userId: member.user.id,
    firstName: member.user.firstName,
    lastName: member.user.lastName,
    profileImageUrl: member.user.profileImageUrl,
  };
}

function mapAssignee(
  assignee: RepositoryAssigneeRecord | null | undefined,
): AssigneeActionData | null {
  if (!assignee) return null;

  return {
    id: assignee.id,
    weddingId: assignee.weddingId,
    userId: assignee.userId,
    role: assignee.role,
    status: assignee.status,
    joinedAt: parseIsoDate(assignee.joinedAt),
    leftAt: parseIsoDate(assignee.leftAt),
    createdAt: parseIsoDate(assignee.createdAt) as string,
    updatedAt: parseIsoDate(assignee.updatedAt) as string,
    user: assignee.user
      ? {
          id: assignee.user.id,
          firstName: assignee.user.firstName,
          lastName: assignee.user.lastName,
          profileImageUrl: assignee.user.profileImageUrl,
        }
      : null,
  };
}

function mapLink(link: RepositoryLinkRecord): LinkActionData {
  return {
    id: link.id,
    taskId: link.taskId,
    label: link.label,
    url: link.url,
    position: link.position,
    createdAt: parseIsoDate(link.createdAt) as string,
    updatedAt: parseIsoDate(link.updatedAt) as string,
  };
}

function mapRecurrence(
  recurrence: RepositoryRecurrenceRecord | null | undefined,
): RecurrenceActionData | null {
  if (!recurrence) return null;

  return {
    id: recurrence.id,
    taskId: recurrence.taskId,
    frequency: recurrence.frequency,
    interval: recurrence.interval,
    startsOn: parseIsoDate(recurrence.startsOn),
    endsOn: parseIsoDate(recurrence.endsOn),
    nextOccurrenceAt: parseIsoDate(recurrence.nextOccurrenceAt),
    createdAt: parseIsoDate(recurrence.createdAt) as string,
    updatedAt: parseIsoDate(recurrence.updatedAt) as string,
  };
}

function mapTaskSummary(task: RepositoryTaskRecord): TaskSummaryActionData {
  return {
    id: task.id,
    weddingId: task.weddingId,
    categoryId: task.categoryId,
    assigneeId: task.assigneeId,
    parentTaskId: task.parentTaskId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: parseIsoDate(task.dueDate),
    completedAt: parseIsoDate(task.completedAt),
    position: task.position,
    createdAt: parseIsoDate(task.createdAt) as string,
    updatedAt: parseIsoDate(task.updatedAt) as string,
  };
}

function mapTask(task: RepositoryTaskRecord): TaskActionData {
  return {
    ...mapTaskSummary(task),
    assignee: mapAssignee(task.assignee),
    recurrence: mapRecurrence(task.recurrence),
    links: (task.links ?? []).map(mapLink),
    children: (task.childTasks ?? []).map(mapTask),
    category: task.category ? mapCategorySummary(task.category) : null,
    parentTask: task.parentTask ? mapTaskSummary(task.parentTask) : null,
  };
}

function revalidateChecklistPaths() {
  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

async function runAction<T>(
  actionName: string,
  access: "read" | "edit",
  operation: (context: ActiveWeddingContext) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const context = await requireRole(
      access === "read" ? ["OWNER", "EDITOR", "VIEWER"] : ["OWNER", "EDITOR"],
      { redirectToOnboarding: false },
    );
    return { success: true, data: await operation(context) };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return failure("Authentication is required.");
    }

    if (error instanceof ActiveWeddingRequiredError) {
      return failure("Create or select a wedding before using the checklist.");
    }

    if (error instanceof ChecklistValidationError) {
      return failure(error.message);
    }

    if (error instanceof PermissionDeniedError) {
      return failure(error.message);
    }

    if (error instanceof ChecklistRepositoryError) {
      return failure(error.message);
    }

    logger.error(`[checklist] ${actionName} failed`, error);
    return failure(`Unable to ${actionName}. Please try again.`);
  }
}

async function requireCategoryInWedding(
  categoryId: string,
  weddingId: string,
) {
  const category = await checklistRepository.getCategory(categoryId);

  if (category.weddingId !== weddingId) {
    throw new PermissionDeniedError();
  }

  return category;
}

async function requireTaskInWedding(taskId: string, weddingId: string) {
  const task = await checklistRepository.getTask(taskId);

  if (task.weddingId !== weddingId) {
    throw new PermissionDeniedError();
  }

  return task;
}

async function requireActiveAssigneeInWedding(
  assigneeId: string,
  weddingId: string,
) {
  const assignee = await checklistRepository.findWeddingMember(assigneeId);

  if (
    !assignee ||
    assignee.weddingId !== weddingId ||
    assignee.status !== "ACTIVE"
  ) {
    throw new ChecklistValidationError(
      "Selected assignee is not part of this wedding.",
    );
  }

  return assignee;
}

async function requireParentTaskInWedding(
  parentTaskId: string,
  weddingId: string,
) {
  const parentChain = await checklistRepository.findTaskParentChain(parentTaskId);

  if (!parentChain || parentChain.chain.some((task) => task.weddingId !== weddingId)) {
    throw new ChecklistValidationError(
      "Parent task does not belong to this wedding.",
    );
  }

  if (parentChain.hasCycle) {
    throw new ChecklistValidationError("Parent task would create a cycle.");
  }

  return parentChain.chain[0];
}

export async function getCategories(): Promise<ActionResult<CategoryActionData[]>> {
  return runAction("load categories", "read", async (context) => {
    const categories = await checklistRepository.getCategories(context.wedding.id);
    return categories.map(mapCategory);
  });
}

export async function getAssignableMembers(): Promise<
  ActionResult<AssignableMemberActionData[]>
> {
  return runAction("load checklist members", "read", async (context) => {
    const members = await checklistRepository.getActiveWeddingMembers(
      context.wedding.id,
    );

    return members.map(mapAssignableMember);
  });
}

export async function getTasksForWedding(): Promise<
  ActionResult<TaskActionData[]>
> {
  return runAction("load wedding tasks", "read", async (context) => {
    const tasks = await checklistRepository.getTasksForWedding(
      context.wedding.id,
    );

    return tasks.map(mapTask);
  });
}

export type ChecklistReadData = {
  categories: Array<{
    category: CategoryActionData;
    tasks: TaskActionData[];
  }>;
  members: AssignableMemberActionData[];
};

export async function getChecklistData(): Promise<
  ActionResult<ChecklistReadData>
> {
  return runAction("load checklist", "read", async (context) => {
    const [categories, members, tasks] = await Promise.all([
      checklistRepository.getCategories(context.wedding.id),
      checklistRepository.getActiveWeddingMembers(context.wedding.id),
      checklistRepository.getTasksForWedding(context.wedding.id),
    ]);

    const tasksByCategory = new Map<string, TaskActionData[]>();
    for (const task of tasks.map(mapTask)) {
      const categoryTasks = tasksByCategory.get(task.categoryId) ?? [];
      categoryTasks.push(task);
      tasksByCategory.set(task.categoryId, categoryTasks);
    }

    return {
      categories: categories.map((category) => ({
        category: mapCategory(category),
        tasks: tasksByCategory.get(category.id) ?? [],
      })),
      members: members.map(mapAssignableMember),
    };
  });
}

export async function createCategory(
  input: unknown,
): Promise<ActionResult<CategoryActionData>> {
  const record = parseRecord(input);
  if (isParseError(record)) return failure(record.error);

  const name = parseRequiredString(
    record.value.name,
    "name",
    MAX_CATEGORY_NAME_LENGTH,
  );
  if (isParseError(name)) return failure(name.error);

  const icon = parseOptionalString(record.value.icon, "icon", MAX_ICON_LENGTH);
  if (isParseError(icon)) return failure(icon.error);

  const colour = parseOptionalString(
    record.value.colour,
    "colour",
    MAX_COLOUR_LENGTH,
  );
  if (isParseError(colour)) return failure(colour.error);

  const position = parseOptionalPosition(record.value.position, "position");
  if (isParseError(position)) return failure(position.error);

  const data: Omit<RepositoryCreateCategoryInput, "weddingId"> = {
    name: name.value,
    ...(icon.value !== undefined ? { icon: icon.value } : {}),
    ...(colour.value !== undefined ? { colour: colour.value } : {}),
    ...(position.value !== undefined ? { position: position.value } : {}),
  };

  return runAction("create category", "edit", async (context) => {
    const nameExists = await checklistRepository.categoryNameExists(
      context.wedding.id,
      data.name,
    );

    if (nameExists) {
      throw new ChecklistRepositoryError(
        "A category with this name already exists in this wedding.",
      );
    }

    const category = await checklistRepository.createCategory({
      ...data,
      weddingId: context.wedding.id,
    });
    revalidateChecklistPaths();
    return mapCategory(category);
  });
}

export async function updateCategory(
  id: unknown,
  input: unknown,
): Promise<ActionResult<CategoryActionData>> {
  const parsedId = parseRequiredString(id, "id");
  if (isParseError(parsedId)) return failure(parsedId.error);

  const record = parseRecord(input);
  if (isParseError(record)) return failure(record.error);

  const data: RepositoryUpdateCategoryInput = {};

  if (record.value.name !== undefined) {
    const name = parseRequiredString(
      record.value.name,
      "name",
      MAX_CATEGORY_NAME_LENGTH,
    );
    if (isParseError(name)) return failure(name.error);
    data.name = name.value;
  }

  if (record.value.icon !== undefined) {
    const icon = parseOptionalString(
      record.value.icon,
      "icon",
      MAX_ICON_LENGTH,
    );
    if (isParseError(icon)) return failure(icon.error);
    data.icon = icon.value ?? null;
  }

  if (record.value.colour !== undefined) {
    const colour = parseOptionalString(
      record.value.colour,
      "colour",
      MAX_COLOUR_LENGTH,
    );
    if (isParseError(colour)) return failure(colour.error);
    data.colour = colour.value ?? null;
  }

  if (record.value.position !== undefined) {
    const position = parseOptionalPosition(record.value.position, "position");
    if (isParseError(position)) return failure(position.error);
    data.position = position.value;
  }

  if (Object.keys(data).length === 0) {
    return failure("At least one category field must be provided");
  }

  return runAction("update category", "edit", async (context) => {
    await requireCategoryInWedding(parsedId.value, context.wedding.id);

    if (data.name !== undefined) {
      const nameExists = await checklistRepository.categoryNameExists(
        context.wedding.id,
        data.name,
        parsedId.value,
      );

      if (nameExists) {
        throw new ChecklistRepositoryError(
          "A category with this name already exists in this wedding.",
        );
      }
    }

    const category = await checklistRepository.updateCategory(parsedId.value, data);
    revalidateChecklistPaths();
    return mapCategory(category);
  });
}

export async function deleteCategory(
  id: unknown,
): Promise<ActionResult<CategoryActionData>> {
  const parsedId = parseRequiredString(id, "id");
  if (isParseError(parsedId)) return failure(parsedId.error);

  return runAction("delete category", "edit", async (context) => {
    await requireCategoryInWedding(parsedId.value, context.wedding.id);
    const category = await checklistRepository.deleteCategory(parsedId.value);
    revalidateChecklistPaths();
    return mapCategory(category);
  });
}

export async function reorderCategories(
  updates: unknown,
): Promise<ActionResult<null>> {
  const parsedUpdates = parsePositionUpdates(updates, "categories");
  if (isParseError(parsedUpdates)) return failure(parsedUpdates.error);

  return runAction("reorder categories", "edit", async (context) => {
    await checklistRepository.reorderCategories(
      context.wedding.id,
      parsedUpdates.value,
    );
    revalidateChecklistPaths();
    return null;
  });
}

export async function getTasks(
  categoryId: unknown,
): Promise<ActionResult<TaskActionData[]>> {
  const parsedCategoryId = parseRequiredString(categoryId, "categoryId");
  if (isParseError(parsedCategoryId)) return failure(parsedCategoryId.error);

  return runAction("load tasks", "read", async (context) => {
    await requireCategoryInWedding(parsedCategoryId.value, context.wedding.id);
    const tasks = await checklistRepository.getTasks(parsedCategoryId.value);
    return tasks.map(mapTask);
  });
}

export async function getTask(
  id: unknown,
): Promise<ActionResult<TaskActionData>> {
  const parsedId = parseRequiredString(id, "id");
  if (isParseError(parsedId)) return failure(parsedId.error);

  return runAction("load task", "read", async (context) => {
    await requireTaskInWedding(parsedId.value, context.wedding.id);
    const task = await checklistRepository.getTask(parsedId.value);
    return mapTask(task);
  });
}

export async function createTask(
  input: unknown,
): Promise<ActionResult<TaskActionData>> {
  const record = parseRecord(input);
  if (isParseError(record)) return failure(record.error);

  const categoryId = parseRequiredString(record.value.categoryId, "categoryId");
  if (isParseError(categoryId)) return failure(categoryId.error);

  const title = parseRequiredString(
    record.value.title,
    "title",
    MAX_TASK_TITLE_LENGTH,
  );
  if (isParseError(title)) return failure(title.error);

  const optionalFields = parseTaskOptionalFields(record.value);
  if (isParseError(optionalFields)) return failure(optionalFields.error);

  const data: Omit<RepositoryCreateTaskInput, "weddingId"> = {
    categoryId: categoryId.value,
    title: title.value,
    ...optionalFields.value,
  };

  return runAction("create task", "edit", async (context) => {
    await requireCategoryInWedding(data.categoryId, context.wedding.id);

    if (data.assigneeId) {
      await requireActiveAssigneeInWedding(
        data.assigneeId,
        context.wedding.id,
      );
    }

    if (data.parentTaskId) {
      // The repository generates a new task ID, so a new task cannot point to
      // itself. Checking the complete existing ancestry also rejects any
      // already-cyclic parent graph before it is extended.
      await requireParentTaskInWedding(
        data.parentTaskId,
        context.wedding.id,
      );
    }

    const task = await checklistRepository.createTask({
      ...data,
      weddingId: context.wedding.id,
    });
    revalidateChecklistPaths();
    return mapTask(task);
  });
}

export async function updateTask(
  id: unknown,
  input: unknown,
): Promise<ActionResult<TaskActionData>> {
  const parsedId = parseRequiredString(id, "id");
  if (isParseError(parsedId)) return failure(parsedId.error);

  const record = parseRecord(input);
  if (isParseError(record)) return failure(record.error);

  const data: RepositoryUpdateTaskInput = {};

  if (record.value.categoryId !== undefined) {
    const categoryId = parseRequiredString(record.value.categoryId, "categoryId");
    if (isParseError(categoryId)) return failure(categoryId.error);
    data.categoryId = categoryId.value;
  }

  if (record.value.title !== undefined) {
    const title = parseRequiredString(
      record.value.title,
      "title",
      MAX_TASK_TITLE_LENGTH,
    );
    if (isParseError(title)) return failure(title.error);
    data.title = title.value;
  }

  const optionalFields = parseTaskOptionalFields(record.value);
  if (isParseError(optionalFields)) return failure(optionalFields.error);

  Object.assign(data, optionalFields.value);

  if (Object.keys(data).length === 0) {
    return failure("At least one task field must be provided");
  }

  return runAction("update task", "edit", async (context) => {
    const currentTask = await requireTaskInWedding(parsedId.value, context.wedding.id);

    if (data.categoryId !== undefined) {
      await requireCategoryInWedding(data.categoryId, context.wedding.id);
    }

    if (data.parentTaskId) {
      if (data.parentTaskId === parsedId.value) {
        throw new PermissionDeniedError();
      }

      await requireTaskInWedding(data.parentTaskId, context.wedding.id);
    }

    if (data.assigneeId) {
      const assignee = await checklistRepository.getWeddingMember(data.assigneeId);
      if (
        assignee.weddingId !== currentTask.weddingId ||
        assignee.status !== "ACTIVE"
      ) {
        throw new PermissionDeniedError();
      }
    }

    const task = await checklistRepository.updateTask(parsedId.value, data);
    revalidateChecklistPaths();
    return mapTask(task);
  });
}

export async function deleteTask(
  id: unknown,
): Promise<ActionResult<TaskActionData>> {
  const parsedId = parseRequiredString(id, "id");
  if (isParseError(parsedId)) return failure(parsedId.error);

  return runAction("delete task", "edit", async (context) => {
    await requireTaskInWedding(parsedId.value, context.wedding.id);
    const task = await checklistRepository.deleteTask(parsedId.value);
    revalidateChecklistPaths();
    return mapTask(task);
  });
}

export async function completeTask(
  id: unknown,
): Promise<ActionResult<TaskActionData>> {
  const parsedId = parseRequiredString(id, "id");
  if (isParseError(parsedId)) return failure(parsedId.error);

  return runAction("complete task", "edit", async (context) => {
    await requireTaskInWedding(parsedId.value, context.wedding.id);
    const task = await checklistRepository.completeTask(parsedId.value);
    revalidateChecklistPaths();
    return mapTask(task);
  });
}

export async function reopenTask(
  id: unknown,
): Promise<ActionResult<TaskActionData>> {
  const parsedId = parseRequiredString(id, "id");
  if (isParseError(parsedId)) return failure(parsedId.error);

  return runAction("reopen task", "edit", async (context) => {
    await requireTaskInWedding(parsedId.value, context.wedding.id);
    const task = await checklistRepository.reopenTask(parsedId.value);
    revalidateChecklistPaths();
    return mapTask(task);
  });
}

export async function reorderTasks(
  categoryId: unknown,
  updates: unknown,
): Promise<ActionResult<null>> {
  const parsedCategoryId = parseRequiredString(categoryId, "categoryId");
  if (isParseError(parsedCategoryId)) return failure(parsedCategoryId.error);

  const parsedUpdates = parsePositionUpdates(updates, "tasks");
  if (isParseError(parsedUpdates)) return failure(parsedUpdates.error);

  return runAction("reorder tasks", "edit", async (context) => {
    await requireCategoryInWedding(parsedCategoryId.value, context.wedding.id);
    await checklistRepository.reorderTasks(
      parsedCategoryId.value,
      parsedUpdates.value,
    );
    revalidateChecklistPaths();
    return null;
  });
}

function parsePositionUpdates(
  value: unknown,
  entityName: string,
): ParseResult<readonly { id: string; position: number }[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: `${entityName} reorder updates must not be empty` };
  }

  const parsed: { id: string; position: number }[] = [];
  const ids = new Set<string>();

  for (const [index, item] of value.entries()) {
    const record = parseRecord(item);
    if (isParseError(record)) {
      return { error: `${entityName}[${index}] is invalid` };
    }

    const id = parseRequiredString(record.value.id, `${entityName}[${index}].id`);
    if (isParseError(id)) return id;

    if (ids.has(id.value)) {
      return { error: `${entityName}[${index}].id is duplicated` };
    }
    ids.add(id.value);

    const position = parseRequiredPosition(
      record.value.position,
      `${entityName}[${index}].position`,
    );
    if (isParseError(position)) return position;

    parsed.push({ id: id.value, position: position.value });
  }

  return { value: parsed };
}
