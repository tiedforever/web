export type DashboardTaskData = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
};

export type DashboardQueryData = {
  guestCount: number;
  unassignedGuestCount: number;
  householdCount: number;
  taskCount: number;
  completedTaskCount: number;
  upcomingTasks: DashboardTaskData[];
};

export type DashboardPresentationData = {
  userFirstName: string;
  weddingName: string;
  partnerNames: string;
  weddingDate: string;
  timezone: string;
  locationSummary: string | null;
};
