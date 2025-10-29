import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Phone,
  Send,
  Trash2,
  Edit2,
  Eye,
  Calendar,
  X,
  Check,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import TaskForm from "@/components/TaskForm";

interface CallHistoryItem {
  id: string;
  phone_number: string;
  notes: string | null;
  task_id: string | null;
  created_at: string;
}

interface Task {
  id: string;
  client_name: string;
  phone_number: string;
}

interface GroupedHistory {
  [key: string]: CallHistoryItem[];
}

export default function AdminHome({
  onNavigateToHome,
  onViewTask,
}: {
  onNavigateToHome?: () => void;
  onViewTask?: (taskId: string) => void;
}) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [viewMode, setViewMode] = useState<"history" | "createTask">("history");
  const [taskFormData, setTaskFormData] = useState<{
    phone: string;
    notes: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showAllCalls, setShowAllCalls] = useState(false);

  useEffect(() => {
    fetchCallHistory();
    fetchTasks();
  }, [showAllCalls]);

  const fetchCallHistory = async () => {
    let query = supabase
      .from("call_history")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter to show only calls without tasks by default
    if (!showAllCalls) {
      query = query.is("task_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching call history:", error);
      return;
    }

    setCallHistory(data || []);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, client_name, phone_number");

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    setTasks(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setLoading(true);
    
    // Check if phone number already exists in call history
    const { data: existingCall } = await supabase
      .from("call_history")
      .select("id")
      .eq("phone_number", phoneNumber.trim())
      .single();

    if (existingCall) {
      // Check if there's a task with this phone number
      const { data: existingTask } = await supabase
        .from("tasks_full_data")
        .select("id, client_name")
        .eq("phone_number", phoneNumber.trim())
        .limit(1)
        .single();

      if (existingTask) {
        const viewTask = confirm(
          `This phone number is already in the call history for "${existingTask.client_name}".\n\nDo you want to view the task?`
        );
        if (viewTask && onViewTask) {
          onViewTask(existingTask.id);
        }
      } else {
        alert("This phone number is already in the call history");
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("call_history").insert({
      phone_number: phoneNumber.trim(),
      notes: notes.trim() || null,
    });

    if (error) {
      console.error("Error adding call history:", error);
      if (error.code === "23505") {
        // Unique violation error code - check for task
        const { data: existingTask } = await supabase
          .from("tasks_full_data")
          .select("id, client_name")
          .eq("phone_number", phoneNumber.trim())
          .limit(1)
          .single();

        if (existingTask) {
          const viewTask = confirm(
            `This phone number is already in the call history for "${existingTask.client_name}".\n\nDo you want to view the task?`
          );
          if (viewTask && onViewTask) {
            onViewTask(existingTask.id);
          }
        } else {
          alert("This phone number is already in the call history");
        }
      } else {
        alert("Failed to add phone number");
      }
    } else {
      setPhoneNumber("");
      setNotes("");
      fetchCallHistory();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;

    const { error } = await supabase.from("call_history").delete().eq("id", id);

    if (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete");
    } else {
      fetchCallHistory();
    }
  };

  const handleEdit = (item: CallHistoryItem) => {
    setEditingId(item.id);
    setEditPhone(item.phone_number);
    setEditNotes(item.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editPhone.trim()) return;

    const { error } = await supabase
      .from("call_history")
      .update({
        phone_number: editPhone.trim(),
        notes: editNotes.trim() || null,
      })
      .eq("id", editingId);

    if (error) {
      console.error("Error updating:", error);
      alert("Failed to update");
    } else {
      setEditingId(null);
      setEditPhone("");
      setEditNotes("");
      fetchCallHistory();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPhone("");
    setEditNotes("");
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  const handleCreateTask = (item: CallHistoryItem) => {
    setTaskFormData({ phone: item.phone_number, notes: item.notes || "" });
    setViewMode("createTask");
  };

  const handleTaskSaved = () => {
    setViewMode("history");
    setTaskFormData(null);
    fetchTasks();
    fetchCallHistory();
  };

  const findTaskByPhone = (phone: string): Task | undefined => {
    return tasks.find((task) => task.phone_number === phone);
  };

  // Filter call history based on search query
  const filteredCallHistory = callHistory.filter(item =>
    item.phone_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination
  const totalItems = filteredCallHistory.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedHistory = filteredCallHistory.slice(startIndex, startIndex + pageSize);

  const groupHistoryByDate = (history: CallHistoryItem[]): GroupedHistory => {
    const groups: GroupedHistory = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    history.forEach((item) => {
      const itemDate = new Date(item.created_at);
      const itemDateStr = itemDate.toLocaleDateString();
      const todayStr = today.toLocaleDateString();
      const yesterdayStr = yesterday.toLocaleDateString();

      let groupKey: string;
      if (itemDateStr === todayStr) {
        groupKey = "Today";
      } else if (itemDateStr === yesterdayStr) {
        groupKey = "Yesterday";
      } else {
        groupKey = itemDate.toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  };

  const groupedHistory = groupHistoryByDate(paginatedHistory);
  const sortedGroupKeys = Object.keys(groupedHistory).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // Show TaskForm component if in createTask mode
  if (viewMode === "createTask") {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-900 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Create New Task
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setViewMode("history");
                setTaskFormData(null);
              }}
              className="h-8 px-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <TaskForm
            onSaved={handleTaskSaved}
            onCancel={() => {
              setViewMode("history");
              setTaskFormData(null);
            }}
            prefilledData={taskFormData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-900 p-3 pb-32">
      {/* Compact Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Call List
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {totalItems} total entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchCallHistory}
            className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
            title="Refresh call list"
          >
            Refresh
            <RefreshCw className="w-3 h-3" />
          </Button>
          {onNavigateToHome && (
            <Button
              onClick={onNavigateToHome}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back to Tasks
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 mb-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="w-full pl-8 h-9 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 rounded-lg"
              placeholder="Search phone numbers or notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button
            onClick={() => setShowAllCalls(!showAllCalls)}
            className={`h-9 px-3 text-xs ${
              !showAllCalls
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
            }`}
          >
            <Filter className="w-4 h-4 mr-1" />
            {!showAllCalls ? "All Calls" : "New Calls"}
          </Button>
        </div>
      </div>

      {/* Mobile Cards - Only show on mobile */}
      <div className="lg:hidden space-y-4">
        {callHistory.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center border border-slate-200 dark:border-slate-700">
            <Phone className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
               Empty call list
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Add phone numbers below to get started
            </p>
          </div>
        ) : filteredCallHistory.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center border border-slate-200 dark:border-slate-700">
            <Search className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              No results found
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Adjust your search query
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedGroupKeys.map((groupKey) => (
              <div key={groupKey}>
                {/* Date Header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    {groupKey}
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    {groupedHistory[groupKey].length}
                  </span>
                </div>

                {/* Cards for this date group */}
                <div className="space-y-2">
                  {groupedHistory[groupKey].map((item) => {
                    const relatedTask = findTaskByPhone(item.phone_number);
                    const isEditing = editingId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                      >
                        <div className="p-3">
                          {isEditing ? (
                            /* Edit Mode */
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                                  Phone Number
                                </label>
                                <Input
                                  type="tel"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  className="h-8 text-sm"
                                  placeholder="Enter phone number"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                                  Notes (Optional)
                                </label>
                                <Input
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  className="h-8 text-sm"
                                  placeholder="Add notes..."
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleSaveEdit}
                                  size="sm"
                                  className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  onClick={handleCancelEdit}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-8 text-xs"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* View Mode */
                            <>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex-1 min-w-0">
                                  {relatedTask ? (
                                    <>
                                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                        {relatedTask.client_name}
                                      </h3>
                                      <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                        <Phone className="w-3 h-3" />
                                        <span className="truncate">{item.phone_number}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {item.phone_number}
                                      </h3>
                                    </>
                                  )}
                                  {item.notes && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                  {new Date(item.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleCall(item.phone_number)}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg transition-colors text-white text-xs font-medium cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  Call
                                </button>
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white text-xs font-medium cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                {!relatedTask ? (
                                  <button
                                    onClick={() => handleCreateTask(item)}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-white text-xs font-medium cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Task
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onViewTask?.(relatedTask.id)}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white text-xs font-medium cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-white text-xs font-medium cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Pagination */}
        {filteredCallHistory.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="text-slate-600 dark:text-slate-400">
              {totalItems} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2 text-xs"
              >
                Prev
              </Button>
              <div className="text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
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
        <div className="overflow-x-auto max-h-[calc(100vh-200px)]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
              <tr className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Phone Number
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Client
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Notes
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                  Date & Time
                </th>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 w-48">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {callHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center border-b border-slate-200 dark:border-slate-700">
                    <Phone className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Empty call list
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Add phone numbers below to get started
                    </p>
                  </td>
                </tr>
              ) : filteredCallHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center border-b border-slate-200 dark:border-slate-700">
                    <Search className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      No results found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Adjust your search query
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((item) => {
                  const relatedTask = findTaskByPhone(item.phone_number);
                  const isEditing = editingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {isEditing ? (
                        /* Edit Mode - spans all columns */
                        <td colSpan={5} className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                          <div className="flex gap-4 items-start p-2">
                            <div className="flex-1">
                              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                                Phone Number
                              </label>
                              <Input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="h-8 text-sm"
                                placeholder="Enter phone number"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                                Notes (Optional)
                              </label>
                              <Input
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="h-8 text-sm"
                                placeholder="Add notes..."
                              />
                            </div>
                            <div className="flex gap-2 mt-6">
                              <Button
                                onClick={handleSaveEdit}
                                size="sm"
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        /* View Mode */
                        <>
                          <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {item.phone_number}
                            </div>
                          </td>
                          <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                            <div className="text-slate-900 dark:text-white">
                              {relatedTask ? relatedTask.client_name : "-"}
                            </div>
                          </td>
                          <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {item.notes || "-"}
                          </td>
                          <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            <div>
                              {new Date(item.created_at).toLocaleDateString()}
                            </div>
                           
                            <div className="text-xs text-slate-500 dark:text-slate-500">
                              {new Date(item.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleCall(item.phone_number)}
                                className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 rounded transition-colors text-white text-xs font-medium cursor-pointer"
                              >
                                <Phone className="w-3 h-3" />
                                Call
                              </button>
                              <button
                                onClick={() => handleEdit(item)}
                                className="flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded transition-colors text-white text-xs font-medium cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>
                              {!relatedTask ? (
                                <button
                                  onClick={() => handleCreateTask(item)}
                                  className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded transition-colors text-white text-xs font-medium cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  Task
                                </button>
                              ) : (
                                <button
                                  onClick={() => onViewTask?.(relatedTask.id)}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-white text-xs font-medium cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 rounded transition-colors text-white text-xs font-medium cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        {filteredCallHistory.length > 0 && (
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="text-slate-600 dark:text-slate-400">
              {totalItems} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2 text-xs"
              >
                Prev
              </Button>
              <div className="text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="h-7 px-2 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-3 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number..."
                className="w-full pl-8 h-9 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 rounded-lg"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !phoneNumber.trim()}
              className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 dark:disabled:bg-slate-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)..."
            className="h-9 text-sm bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 rounded-lg"
            disabled={loading}
          />
        </form>
      </div>
    </div>
  );
}