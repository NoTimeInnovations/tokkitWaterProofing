import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Tag,
  Check,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  LogOut,
  X,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase, signOut } from "../lib/supabase";
import { getContrastColor } from "../lib/utils";
import TagManager from "./TagManager";
import TaskForm from "@/components/TaskForm";

// Type definitions
interface District {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface Task {
  id: string;
  created_at: string;
  entry_date?: string;
  client_name: string;
  phone_number: string;
  place: string;
  district_id: string;
  status?: string;
  district?: string;
  site_visit_payment?: string;
  notes?: string;
  staff?: string;
  tags?: Tag[];
}

export default function Home({
  onNavigateToAdmin,
  initialTaskId,
}: {
  onNavigateToAdmin?: () => void;
  initialTaskId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [districts, setDistricts] = useState<District[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "pending"
  >("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalTasks, setTotalTasks] = useState(0);

  const [panelMode, setPanelMode] = useState<"none" | "add" | "tags" | "edit">(
    "none"
  );
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(
    null
  );

  // Filter states for the sheet
  const [sheetStatusFilter, setSheetStatusFilter] = useState(statusFilter);
  const [sheetSelectedTags, setSheetSelectedTags] =
    useState<string[]>(selectedTags);
  const [sheetSelectedDistricts, setSheetSelectedDistricts] =
    useState<string[]>(selectedDistricts);

  useEffect(() => {
    // Load saved filter state from localStorage, then fetch meta & tasks
    try {
      const saved = localStorage.getItem("tasks_filters_v1");
      if (saved) {
        const s = JSON.parse(saved);
        setQuery(s.query || "");
        setSelectedDistricts(s.selectedDistricts || []);
        setSelectedTags(s.selectedTags || []);
        setStatusFilter(s.statusFilter || "all");
        setPage(s.page || 1);

        // Initialize sheet filters
        setSheetStatusFilter(s.statusFilter || "all");
        setSheetSelectedTags(s.selectedTags || []);
        setSheetSelectedDistricts(s.selectedDistricts || []);
      }
    } catch (e) {
      // ignore JSON parse errors
    }
    fetchMeta();
  }, []);

  // Handle initialTaskId from navigation
  useEffect(() => {
    if (initialTaskId) {
      // Find the task by ID and set it as expanded and highlighted
      const task = tasks.find((t) => t.id === initialTaskId);
      if (task) {
        setExpandedTask(initialTaskId);
        setHighlightedTaskId(initialTaskId);
        // Optionally scroll to the task
        setTimeout(() => {
          const element = document.getElementById(`task-${initialTaskId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    }
  }, [initialTaskId, tasks]);

  // Handle click outside to unhighlight
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (highlightedTaskId) {
        const highlightedElement = document.getElementById(
          `task-${highlightedTaskId}`
        );
        if (
          highlightedElement &&
          !highlightedElement.contains(event.target as Node)
        ) {
          setHighlightedTaskId(null);
        }
      }
    };

    if (highlightedTaskId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [highlightedTaskId]);

  async function fetchMeta() {
    const d = await supabase.from("districts").select("id,name").order("name");
    setDistricts(d.data || []);
    setIsLoadingTags(true);
    const t = await supabase.from("tags").select("*").order("name");
    setTags(t.data || []);
    setIsLoadingTags(false);
    // Don't call fetchTasks here - let the useEffect handle it after filters are set
  }

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      let fetchQuery = supabase.from("tasks_full_data").select(
        `
        *,
        districts(*),
        task_tags(
          tag_id
        )
      `,
        { count: "exact" }
      );

      if (selectedDistricts.length > 0) {
        fetchQuery = fetchQuery.in("district_id", selectedDistricts);
      }

      if (selectedTags.length > 0) {
        const { data: taskTags, error: tagsError } = await supabase
          .from("task_tags")
          .select("task_id")
          .in("tag_id", selectedTags);

        if (tagsError) throw tagsError;

        if (taskTags && taskTags.length > 0) {
          const taskIds = [...new Set(taskTags.map((tt) => tt.task_id))];
          fetchQuery = fetchQuery.in("id", taskIds);
        } else {
          setTasks([]);
          setTotalTasks(0);
          setIsLoadingTasks(false);
          return;
        }
      }

      if (statusFilter && statusFilter !== "all") {
        fetchQuery = fetchQuery.eq("status", statusFilter);
      }

      if (query.trim()) {
        fetchQuery = fetchQuery.or(
          "client_name.ilike.%" +
            query +
            "%,place.ilike.%" +
            query +
            "%,phone_number.ilike.%" +
            query +
            "%,staff.ilike.%" +
            query +
            "%"
        );
      }

      // Order by entry_date (newest first), fallback to created_at
      fetchQuery = fetchQuery
        .order("entry_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      const { data, error, count } = await fetchQuery;

      if (error) throw error;

      console.log("Fetched tasks:", data);

      setTasks(data || []);
      setTotalTasks(count || 0);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [query, selectedDistricts, selectedTags, statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedDistricts, selectedTags, statusFilter]);

  // Sync sheet filters with main filters when main filters change
  useEffect(() => {
    setSheetStatusFilter(statusFilter);
    setSheetSelectedTags(selectedTags);
    setSheetSelectedDistricts(selectedDistricts);
  }, [statusFilter, selectedTags, selectedDistricts]);

  const handleDelete = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    fetchTasks();
  };

  const markComplete = async (taskId: string) => {
    try {
      await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", taskId);
      // optimistic UI: refresh list
      fetchTasks();
    } catch (err) {
      console.error("Error marking task complete", err);
      alert("Failed to mark task complete");
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, "_self");
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      await signOut();
    }
  };

  // Toggle a tag in the selectedTags array
  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  // Sheet filter handlers
  const toggleSheetTag = (tagId: string) => {
    setSheetSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const toggleSheetDistrict = (districtId: string) => {
    setSheetSelectedDistricts((prev) =>
      prev.includes(districtId)
        ? prev.filter((d) => d !== districtId)
        : [...prev, districtId]
    );
  };

  const applyFilters = () => {
    setStatusFilter(sheetStatusFilter);
    setSelectedTags(sheetSelectedTags);
    setSelectedDistricts(sheetSelectedDistricts);
    setShowFilterSheet(false);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSheetStatusFilter("all");
    setSheetSelectedTags([]);
    setSheetSelectedDistricts([]);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (selectedTags.length > 0) count++;
    if (selectedDistricts.length > 0) count++;
    return count;
  };

  useEffect(() => {
    try {
      const payload = {
        query,
        selectedDistricts,
        selectedTags,
        statusFilter,
        page,
      };
      localStorage.setItem("tasks_filters_v1", JSON.stringify(payload));
    } catch (e) {}
  }, [query, selectedDistricts, selectedTags, statusFilter, page]);

  if (panelMode !== "none") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {panelMode === "add" && "Add New Task"}
              {panelMode === "edit" && "Edit Task"}
              {panelMode === "tags" && "Manage Tags"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPanelMode("none");
                setEditTask(null);
              }}
              className="h-8 px-3"
            >
              Back
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          {panelMode === "tags" && (
            <TagManager
              onChanged={() => {
                setPanelMode("none");
                fetchMeta();
              }}
              onClose={() => {
                setPanelMode("none");
                fetchMeta();
              }}
            />
          )}

          {(panelMode === "add" || panelMode === "edit") && (
            <TaskForm
              task={panelMode === "edit" ? editTask : undefined}
              onSaved={() => {
                setPanelMode("none");
                setEditTask(null);
                fetchTasks();
                fetchMeta();
              }}
              onCancel={() => {
                setPanelMode("none");
                setEditTask(null);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3">
      {/* Filter Sheet Overlay */}
      {showFilterSheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="absolute right-0 top-0 h-full w-90 bg-white dark:bg-slate-800 shadow-lg overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Filters
                </h2>
                <button
                  onClick={() => setShowFilterSheet(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Status Filter */}
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">
                  Status
                </h3>
                <div className="space-y-2">
                  {[
                    { value: "all", label: "All Statuses" },
                    { value: "completed", label: "Completed" },
                    { value: "pending", label: "Not Completed" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={sheetStatusFilter === option.value}
                        onChange={(e) =>
                          setSheetStatusFilter(e.target.value as any)
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tags Filter */}
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">
                  Tags
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 mb-2"
                    >
                      <input
                        type="checkbox"
                        checked={sheetSelectedTags.includes(tag.id)}
                        onChange={() => toggleSheetTag(tag.id)}
                        className="mr-2"
                      />
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: tag.color }}
                      ></span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {tag.name}
                      </span>
                    </label>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No tags available
                    </p>
                  )}
                </div>
              </div>

              {/* District Filter */}
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">
                  Districts
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {districts.map((district) => (
                    <label key={district.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sheetSelectedDistricts.includes(district.id)}
                        onChange={() => toggleSheetDistrict(district.id)}
                        className="mr-2"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {district.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex gap-2">
                <Button
                  onClick={clearAllFilters}
                  variant="outline"
                  className="flex-1"
                >
                  Clear All
                </Button>
                <Button
                  onClick={applyFilters}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Tasks
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {totalTasks} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setPanelMode("add");
              setEditTask(null);
            }}
            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
          <Button
            onClick={() => {
              setPanelMode("tags");
              setEditTask(null);
            }}
            className="h-8 px-3 text-xs"
            variant="outline"
          >
            <div className="flex items-center">
              <Tag className="w-3 h-3 mr-1" />
              <span>Tags</span>
              {isLoadingTags && (
                <span className="ml-2 text-xs text-slate-500">Loading...</span>
              )}
            </div>
          </Button>
          {onNavigateToAdmin && (
            <Button
              onClick={onNavigateToAdmin}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <History className="w-3 h-3 mr-1" />
              Call List
            </Button>
          )}
          <Button
            onClick={handleLogout}
            className="h-8 px-3 text-xs bg-red-600 hover:bg-red-700 text-white"
            variant="destructive"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 mb-3">
        <div className="flex gap-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="w-full pl-8 h-9 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 rounded-lg"
              placeholder="Search tasks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Filter Button */}
          <Button
            onClick={() => setShowFilterSheet(true)}
            className="h-9 px-3 text-xs"
            variant="outline"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {getActiveFilterCount() > 0 && (
              <span className="ml-1 bg-blue-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                {getActiveFilterCount()}
              </span>
            )}
          </Button>
        </div>

        {/* Active filters display */}
        {(statusFilter !== "all" ||
          selectedTags.length > 0 ||
          selectedDistricts.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {statusFilter !== "all" && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                Status:{" "}
                {statusFilter === "completed" ? "Completed" : "Not Completed"}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedTags.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              return tag ? (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: tag.color || undefined,
                    color: getContrastColor(tag.color || undefined),
                  }}
                >
                  {tag.name}
                  <button
                    onClick={() => toggleTag(tag.id)}
                    className="ml-1 hover:opacity-70 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : null;
            })}
            {selectedDistricts.map((districtId) => {
              const district = districts.find((d) => d.id === districtId);
              return district ? (
                <span
                  key={district.id}
                  className="inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-xs"
                >
                  {district.name}
                  <button
                    onClick={() =>
                      setSelectedDistricts((prev) =>
                        prev.filter((d) => d !== districtId)
                      )
                    }
                    className="ml-1 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Mobile Cards - Only show on mobile */}
      <div className="lg:hidden space-y-2">
        {tasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center border border-slate-200 dark:border-slate-700">
            <Search className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              No tasks found
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Adjust your search or filters
            </p>
          </div>
        ) : isLoadingTasks ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Loading...
            </div>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              id={`task-${task.id}`}
              className={`relative bg-white dark:bg-slate-800 rounded-lg border ${
                highlightedTaskId === task.id
                  ? "border-blue-500 shadow-lg ring-2 ring-blue-500/50"
                  : "border-slate-200 dark:border-slate-700"
              } overflow-hidden ${
                task.status === "completed" ? "opacity-60" : ""
              }`}
            >
              {/* Mark complete button (top-right) */}
              {task.status !== "completed" && task.status === "pending" && (
                <button
                  onClick={() => markComplete(task.id)}
                  className="absolute top-2 right-2 bg-green-600 hover:bg-green-700 text-white h-7 px-2 rounded text-xs flex items-center gap-1 cursor-pointer"
                  title="Mark as complete"
                >
                  <Check className="w-3 h-3" />
                  Complete
                </button>
              )}
              <div className="p-3">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {task.client_name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">
                        {task.place}, {task?.district}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {task.entry_date
                        ? new Date(task.entry_date).toLocaleDateString()
                        : task.created_at
                        ? new Date(task.created_at).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  {task.site_visit_payment && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>{task.site_visit_payment}</span>
                    </div>
                  )}
                </div>

                {/* Tags: show only Completed badge when task is completed, otherwise show task tags */}
                {task.status === "completed" ? (
                  <div className="flex flex-wrap gap-1 mb-3">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full"
                      style={{
                        backgroundColor: "#10b981",
                        color: getContrastColor("#10b981"),
                      }}
                    >
                      Completed
                    </span>
                  </div>
                ) : (
                  task.tags &&
                  task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {task.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: tag.color || undefined,
                            color: getContrastColor(tag.color || undefined),
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )
                )}

                {/* Action Buttons with Text */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => handleCall(task.phone_number)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg transition-colors text-white text-xs font-medium cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </button>
                  <button
                    onClick={() => {
                      setPanelMode("edit");
                      setEditTask(task as Task);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white text-xs font-medium cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-white text-xs font-medium cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>

                {/* Expandable Details */}
                {expandedTask === task.id && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    {/* Location Details */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Place
                        </div>
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <MapPin className="w-3 h-3" />
                          <span>{task.place}</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          District
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">
                          {task.district}
                        </div>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Contact
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        {task.phone_number}
                      </div>
                    </div>

                    {/* Staff */}
                    {task.staff && (
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Staff
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">
                          {task.staff}
                        </div>
                      </div>
                    )}

                    {/* Payment Details */}
                    {task.site_visit_payment && (
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Site Visit Payment
                        </div>
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <DollarSign className="w-3 h-3" />
                          <span>{task.site_visit_payment}</span>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {task.notes && (
                      <div>
                        <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          <FileText className="w-3 h-3" />
                          Notes
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 pl-4">
                          {task.notes}
                        </p>
                      </div>
                    )}

                    {/* Entry Date */}
                    <div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Entry Date
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        {task.entry_date
                          ? new Date(task.entry_date).toLocaleDateString()
                          : task.created_at
                          ? new Date(task.created_at).toLocaleDateString()
                          : ""}
                      </div>
                    </div>
                  </div>
                )}

                {/* Toggle Details */}
                <button
                  onClick={() => {
                    if (expandedTask === task.id) {
                      // Collapsing - clear highlight
                      setExpandedTask(null);
                      setHighlightedTaskId(null);
                    } else {
                      // Expanding
                      setExpandedTask(task.id);
                    }
                  }}
                  className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mt-1 cursor-pointer"
                >
                  {expandedTask === task.id ? "Show Less" : "Show Details"}
                </button>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {tasks.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="text-slate-600 dark:text-slate-400">
              {totalTasks} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoadingTasks}
                className="h-7 px-2 text-xs"
              >
                Prev
              </Button>
              <div className="text-slate-600 dark:text-slate-400">
                Page {page}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={
                  page >= Math.ceil(totalTasks / pageSize) || isLoadingTasks
                }
                className="h-7 px-2 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table - Only show on desktop */}
      <div className="hidden lg:block mt-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Client
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Contact
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Place
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  District
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Staff
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Payment
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Tags
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  id={`task-${task.id}`}
                  className={`${
                    task.status === "completed" ? "opacity-60" : ""
                  } ${
                    highlightedTaskId === task.id
                      ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/50"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  } transition-colors`}
                >
                  <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {task.client_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {task.entry_date
                        ? new Date(task.entry_date).toLocaleDateString()
                        : task.created_at
                        ? new Date(task.created_at).toLocaleDateString()
                        : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="text-slate-900 dark:text-white">
                      {task.phone_number}
                    </div>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    {task.place}
                  </td>
                  <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    {task.district}
                  </td>
                  <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    {task.staff || "-"}
                  </td>
                  <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    {task.site_visit_payment || "-"}
                  </td>
                  <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap gap-1">
                      {task.status === "completed" ? (
                        <span
                          className="px-1.5 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: "#10b981",
                            color: getContrastColor("#10b981"),
                          }}
                        >
                          Completed
                        </span>
                      ) : (
                        (task.tags || []).map((tag) => (
                          <span
                            key={tag.id}
                            className="px-1.5 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: tag.color || undefined,
                              color: getContrastColor(tag.color || undefined),
                            }}
                          >
                            {tag.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex gap-1">
                      {task.status !== "completed" &&
                        task.status === "pending" && (
                          <button
                            onClick={() => markComplete(task.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-xs font-medium cursor-pointer"
                            title="Mark as complete"
                          >
                            <Check className="w-3 h-3" />
                            Complete
                          </button>
                        )}
                      <button
                        onClick={() => handleCall(task.phone_number)}
                        className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 rounded transition-colors text-white text-xs font-medium cursor-pointer"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </button>
                      <button
                        onClick={() => {
                          setPanelMode("edit");
                          setEditTask(task as Task);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded transition-colors text-white text-xs font-medium cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 rounded transition-colors text-white text-xs font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="text-slate-600 dark:text-slate-400">
            {totalTasks} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoadingTasks}
              className="h-7 px-2 text-xs"
            >
              Prev
            </Button>
            <div className="text-slate-600 dark:text-slate-400">
              Page {page}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={
                page >= Math.ceil(totalTasks / pageSize) || isLoadingTasks
              }
              className="h-7 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
