import { Icon } from "../shared/icons";
import { Badge, Input, Select } from "../shared/ui";

export type ChecklistStatusFilter = "all" | "todo" | "done";

export type ChecklistCategoryFilterOption = {
  id: string;
  name: string;
};

type ChecklistToolbarProps = {
  categories: ChecklistCategoryFilterOption[];
  categoryId: string;
  completedCount: number;
  incompleteCount: number;
  onCategoryChange: (categoryId: string) => void;
  onPriorityChange: (priority: string) => void;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: ChecklistStatusFilter) => void;
  priorities: string[];
  priority: string;
  search: string;
  status: ChecklistStatusFilter;
  totalCount: number;
};

export function ChecklistToolbar({
  categories,
  categoryId,
  completedCount,
  incompleteCount,
  onCategoryChange,
  onPriorityChange,
  onSearchChange,
  onStatusChange,
  priorities,
  priority,
  search,
  status,
  totalCount,
}: ChecklistToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <label className="relative min-w-[220px] flex-1 sm:max-w-[280px]">
        <span className="sr-only">Search tasks</span>
        <Input
          aria-label="Search tasks"
          className="w-full pl-9"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search tasks…"
          value={search}
        />
        <span className="pointer-events-none absolute left-3 top-3 text-[#8A8A82]">
          <Icon name="search" size={14} />
        </span>
      </label>

      <label>
        <span className="sr-only">Filter by category</span>
        <Select
          aria-label="Filter by category"
          onChange={(event) => onCategoryChange(event.target.value)}
          value={categoryId}
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </label>

      <label>
        <span className="sr-only">Filter by priority</span>
        <Select
          aria-label="Filter by priority"
          onChange={(event) => onPriorityChange(event.target.value)}
          value={priority}
        >
          <option value="all">All priorities</option>
          {priorities.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </label>

      <div
        aria-label="Filter by status"
        className="flex items-center gap-0.5 rounded-[10px] bg-[#F4F4F1] p-1 sm:ml-auto"
        role="group"
      >
        <Tab
          active={status === "all"}
          count={totalCount}
          label="All"
          onClick={() => onStatusChange("all")}
        />
        <Tab
          active={status === "todo"}
          count={incompleteCount}
          label="To Do"
          onClick={() => onStatusChange("todo")}
        />
        <Tab
          active={status === "done"}
          count={completedCount}
          label="Done"
          onClick={() => onStatusChange("done")}
        />
      </div>
    </div>
  );
}

function Tab({
  active = false,
  count,
  label,
  onClick,
}: {
  active?: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition ${active ? "bg-white text-[#1C1C1C] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[#8A8A82] hover:text-[#1C1C1C]"}`}
      onClick={onClick}
      type="button"
    >
      {label}
      <Badge tone={active ? "success" : "default"}>{count}</Badge>
    </button>
  );
}
