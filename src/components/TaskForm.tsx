import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, User, Phone, MapPin, Navigation, Tag } from "lucide-react";
import { getContrastColor } from "@/lib/utils";

export default function TaskForm({
  onSaved,
  onCancel,
  task,
  prefilledData,
}: {
  onSaved?: () => void;
  onCancel?: () => void;
  task?: any;
  prefilledData?: { phone: string; notes: string } | null;
}) {
  const [clientName, setClientName] = useState(task?.client_name || "");
  const [phone, setPhone] = useState(task?.phone_number || prefilledData?.phone || "");
  const [place, setPlace] = useState(task?.place || "");
  const [siteVisitPayment, setSiteVisitPayment] = useState(task?.site_visit_payment || "");
  const [siteVisitDate, setSiteVisitDate] = useState<string>(task?.site_visit_date || "");
  const [workStartDate, setWorkStartDate] = useState<string>(task?.work_start_date || "");
  const [notes, setNotes] = useState(task?.notes || prefilledData?.notes || "");
  const [status, setStatus] = useState<string>(task?.status || "pending");
  const [staff, setStaff] = useState(task?.staff || "");
  const [entryDate, setEntryDate] = useState<string>(
    task?.entry_date || new Date().toISOString().split('T')[0]
  );
  const [districts, setDistricts] = useState<any[]>([]);
  const [districtId, setDistrictId] = useState<string | null>(
    task?.district_id || null
  );
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    // when task prop changes, prefill form
    if (task) {
      setClientName(task.client_name || "");
      setPhone(task.phone_number || "");
      setPlace(task.place || "");
      setDistrictId(task.district_id || null);
      setSelectedTags((task.tags || []).map((t: any) => t.id));
      setSiteVisitPayment(task.site_visit_payment || "");
      setSiteVisitDate(task.site_visit_date || "");
      setWorkStartDate(task.work_start_date || "");
      setNotes(task.notes || "");
      setStatus(task.status || "pending");
      setStaff(task.staff || "");
      setEntryDate(task.entry_date || new Date().toISOString().split('T')[0]);
    } else if (prefilledData) {
      // Use prefilled data when creating new task from call history
      setPhone(prefilledData.phone || "");
      setNotes(prefilledData.notes || "");
      setStaff("");
      setEntryDate(new Date().toISOString().split('T')[0]);
      setSiteVisitDate("");
      setWorkStartDate("");
      // Set default tag to "pending" for new tasks
      const pendingTag = tags.find(t => t.name.toLowerCase() === "pending");
      if (pendingTag) {
        setSelectedTags([pendingTag.id]);
      }
    } else {
      // reset when no task
      setClientName("");
      setPhone("");
      setPlace("");
      setDistrictId(null);
      setStaff("");
      setEntryDate(new Date().toISOString().split('T')[0]);
      setSiteVisitDate("");
      setWorkStartDate("");
      // Set default tag to "pending" for new tasks
      const pendingTag = tags.find(t => t.name.toLowerCase() === "pending");
      if (pendingTag) {
        setSelectedTags([pendingTag.id]);
      }
    }
  }, [task, tags, prefilledData]);

  async function fetchMeta() {
    const d = await supabase.from("districts").select("id,name").order("name");
    setDistricts(d.data || []);
    const t = await supabase.from("tags").select("*").order("name");
    setTags(t.data || []);
    
    // If it's a new task and we have tags, set default to "pending"
    if (!task && t.data) {
      const pendingTag = t.data.find(tag => tag.name.toLowerCase() === "pending");
      if (pendingTag) {
        setSelectedTags([pendingTag.id]);
      }
    }
  }

  async function handleSubmit() {
    if (!clientName.trim()) {
      alert("Client name is required");
      return;
    }

    setSaving(true);
    try {
      if (task && task.id) {
        // update existing task
        const { error: uErr } = await supabase
          .from("tasks")
          .update({
            client_name: clientName,
            phone_number: phone,
            place,
            district_id: districtId,
            site_visit_payment: siteVisitPayment,
            site_visit_date: siteVisitDate || null,
            work_start_date: workStartDate || null,
            notes,
            status,
            staff,
            entry_date: entryDate,
          })
          .eq("id", task.id);

        if (uErr) {
          console.error("Error updating task", uErr);
          alert("Error updating task: " + uErr.message);
          return;
        }

        // replace tags: remove existing and insert new
        const { error: delErr } = await supabase
          .from("task_tags")
          .delete()
          .eq("task_id", task.id);
        if (delErr) console.error("Error deleting old task_tags", delErr);

        if (selectedTags.length) {
          const rows = selectedTags.map((tagId) => ({
            task_id: task.id,
            tag_id: tagId,
          }));
          const { error: tagError } = await supabase
            .from("task_tags")
            .insert(rows);
          if (tagError) {
            console.error("Error inserting task_tags", tagError);
            alert(
              "Task updated but failed to attach tags: " + tagError.message
            );
          }
        }
      } else {
        const { data: inserted, error } = await supabase
          .from("tasks")
          .insert({
            client_name: clientName,
            phone_number: phone,
            place,
            district_id: districtId,
            site_visit_payment: siteVisitPayment,
            site_visit_date: siteVisitDate || null,
            work_start_date: workStartDate || null,
            notes,
            status,
            staff,
            entry_date: entryDate,
          })
          .select("id")
          .maybeSingle();

        if (error) {
          console.error("Error inserting task", error);
          alert("Error inserting task: " + error.message);
          return;
        }

        const taskId = inserted?.id;
        console.debug(
          "Inserted task id:",
          taskId,
          "selectedTags:",
          selectedTags
        );

        // Handle call_history integration
        if (taskId && phone) {
          // Check if phone number exists in call_history
          const { data: existingCall } = await supabase
            .from("call_history")
            .select("id")
            .eq("phone_number", phone)
            .single();

          if (existingCall) {
            // Update existing call_history with task_id
            await supabase
              .from("call_history")
              .update({ task_id: taskId })
              .eq("id", existingCall.id);
          } else {
            // Add to call_history with task_id
            await supabase.from("call_history").insert({
              phone_number: phone,
              notes: notes || null,
              task_id: taskId,
            });
          }
        }

        if (taskId && selectedTags.length) {
          const rows = selectedTags.map((tagId) => ({
            task_id: taskId,
            tag_id: tagId,
          }));
          const { error: tagError } = await supabase
            .from("task_tags")
            .insert(rows);
          if (tagError) {
            console.error("Error inserting task_tags", tagError);
            alert("Task saved but failed to attach tags: " + tagError.message);
          }
        }
      }

      if (onSaved) onSaved();
    } catch (err) {
      console.error("Error saving task", err);
      alert("Unexpected error saving task: " + String(err));
    } finally {
      setSaving(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // (no-op) pending tag handling done when initializing selectedTags

  return (
    <div className="space-y-4">
      {/* Client Name */}
      <div className="space-y-2">
        <Label htmlFor="clientName" className="text-sm font-medium">
          Client Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter client name"
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium">
          Phone Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter phone number"
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Staff Name */}
      <div className="space-y-2">
        <Label htmlFor="staff" className="text-sm font-medium">
          Staff Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="staff"
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter staff name"
            className="pl-10 h-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Place */}
        <div className="space-y-2">
          <Label htmlFor="place" className="text-sm font-medium">
            Place
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter place"
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* District */}
        <div className="space-y-2">
          <Label htmlFor="district" className="text-sm font-medium">
            District
          </Label>
          <div className="relative">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
            <Select
              value={districtId || ""}
              onValueChange={(val) => setDistrictId(val || null)}
            >
              <SelectTrigger id="district" className="pl-10 h-10 w-full">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Select District --</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Entry Date */}
      <div className="space-y-2">
        <Label htmlFor="entryDate" className="text-sm font-medium">
          Entry Date
        </Label>
        <Input
          id="entryDate"
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          className="h-10"
        />
      </div>

      {/* Site Visit Date and Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="siteVisitDate" className="text-sm font-medium">
            Site Visit Date
          </Label>
          <Input
            id="siteVisitDate"
            type="date"
            value={siteVisitDate}
            onChange={(e) => setSiteVisitDate(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="siteVisitPayment" className="text-sm font-medium">
            Site Visit Payment
          </Label>
          <Input
            id="siteVisitPayment"
            value={siteVisitPayment}
            onChange={(e) => setSiteVisitPayment(e.target.value)}
            placeholder="e.g. 500"
            className="h-10"
          />
        </div>
      </div>

      {/* Work Start Date - Only show when status is completed */}
      {status === 'completed' && (
        <div className="space-y-2">
          <Label htmlFor="workStartDate" className="text-sm font-medium">
            Work Start Date
          </Label>
          <Input
            id="workStartDate"
            type="date"
            value={workStartDate}
            onChange={(e) => setWorkStartDate(e.target.value)}
            className="h-10"
          />
        </div>
      )}

      {/* Notes and Status */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes
          </Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-24 p-2 border rounded resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm"
            placeholder="Additional notes"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="statusCompleted"
            type="checkbox"
            checked={status === 'completed'}
            onChange={(e) => {
              const isCompleted = e.target.checked;
              setStatus(isCompleted ? 'completed' : 'pending');
              // Auto-set work start date to today when marking as completed
              if (isCompleted && !workStartDate) {
                setWorkStartDate(new Date().toISOString().split('T')[0]);
              }
            }}
            className="h-4 w-4"
          />
          <Label htmlFor="statusCompleted" className="text-sm">
            Mark as completed
          </Label>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Tags
        </Label>
  <div className="flex gap-2 flex-wrap min-h-10 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          {tags.map((t) => (
            <Badge
              key={t.id}
              variant={selectedTags.includes(t.id) ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              style={
                selectedTags.includes(t.id) && t.color
                  ? {
                      backgroundColor: t.color,
                      color: getContrastColor(t.color),
                    }
                  : {}
              }
              onClick={() => {
                setSelectedTags((prev) =>
                  prev.includes(t.id)
                    ? prev.filter((x) => x !== t.id)
                    : [...prev, t.id]
                );
              }}
            >
              {t.name}
            </Badge>
          ))}
          {tags.length === 0 && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              No tags available
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-9"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !clientName.trim()}
          className={`h-9 gap-2 ${
            task 
              ? "bg-blue-600 hover:bg-blue-700" 
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : task ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}
