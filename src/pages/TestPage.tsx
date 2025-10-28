import supabase from "@/lib/supabase";
import React from "react";

const TestPage = () => {
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [tags, setTags] = React.useState<any[]>([]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = React.useState<string[]>([]);
  const [districts, setDistricts] = React.useState<any[]>([]);

  const fetchMetadata = async () => {
    const { data: tags, error: tagsError } = await supabase
      .from("tags")
      .select("*");
    if (tagsError) {
      console.error("Error fetching tags:", tagsError);
    } else {
      setTags(tags || []);
    }

    const { data: districts, error: districtsError } = await supabase
      .from("districts")
      .select("*");
    if (districtsError) {
      console.error("Error fetching districts:", districtsError);
    } else {
      setDistricts(districts || []);
    }
  };

  const filterTasks = async (tags: string[] = [], districts: string[] = [], status: string | null = null) => {
    let query = supabase.from("tasks").select(`
      *,
      districts(*),
      task_tags(
        tag_id
      )
    `);

    // Filter by multiple districts
    if (districts.length > 0) {
      query = query.in("district_id", districts);
    }

    // Filter by multiple tags
    if (tags.length > 0) {
      // First, get tasks that have the specified tags
      const { data: taskTags, error: tagsError } = await supabase
        .from("task_tags")
        .select("task_id")
        .in("tag_id", tags);

      if (tagsError) throw tagsError;

      if (taskTags && taskTags.length > 0) {
        const taskIds = [...new Set(taskTags.map((tt) => tt.task_id))];
        query = query.in("id", taskIds);
      } else {
        // If no tasks found with these tags, return empty array
        setTasks([]);
        return;
      }
    }

    // Filter by status (optional)
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;
    setTasks(data || []);
  };

  // Fetch metadata on component mount
  React.useEffect(() => {
    fetchMetadata();
  }, []);

  // Filter tasks when selectedTags or selectedDistricts change
  React.useEffect(() => {
    filterTasks(selectedTags, selectedDistricts, null);
  }, [selectedTags, selectedDistricts]);

  return (
    <div className="p-10">
      <h1 className="mb-6 text-2xl font-bold">Districts:</h1>
      <ul className="mb-8">
        {districts.map((district) => (
          <li key={district.id} className="mb-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedDistricts.includes(district.id)}
                onChange={() => {
                  if (selectedDistricts.includes(district.id)) {
                    setSelectedDistricts(
                      selectedDistricts.filter((id) => id !== district.id)
                    );
                  } else {
                    setSelectedDistricts([...selectedDistricts, district.id]);
                  }
                }}
                className="w-4 h-4"
              />
              {district.name}
            </label>
          </li>
        ))}
      </ul>

      <h1 className="mb-6 text-2xl font-bold">Tags:</h1>
      <ul className="mb-8">
        {tags.map((tag) => (
          <li key={tag.id} className="mb-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag.id)}
                onChange={() => {
                  if (selectedTags.includes(tag.id)) {
                    setSelectedTags(selectedTags.filter((id) => id !== tag.id));
                  } else {
                    setSelectedTags([...selectedTags, tag.id]);
                  }
                }}
                className="w-4 h-4"
              />
              <span 
                className="w-3 h-3 rounded-full inline-block mr-2"
                style={{ backgroundColor: tag.color }}
              ></span>
              {tag.name}
            </label>
          </li>
        ))}
      </ul>

      <div className="mb-4">
        <button
          onClick={() => {
            setSelectedTags([]);
            setSelectedDistricts([]);
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear All Filters
        </button>
      </div>

      <h2 className="mt-10 mb-4 text-xl font-bold">
        Tasks ({tasks.length} found):
      </h2>

      {tasks.length === 0 ? (
        <p className="text-gray-500">No tasks found with current filters.</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{task.client_name}</h3>
              <p>Phone: {task.phone_number}</p>
              <p>Place: {task.place}</p>
              <p>District: {task.districts?.name}</p>
              <p>Status: <span className={`px-2 py-1 rounded text-xs ${
                task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>{task.status}</span></p>
            </div>
          ))}
        </div>
      )}

      <details className="mt-8">
        <summary className="cursor-pointer font-semibold">Raw Data</summary>
        <code className="block mt-2 p-4 bg-gray-100 rounded overflow-auto">
          <pre>{JSON.stringify(tasks, null, 2)}</pre>
        </code>
      </details>
    </div>
  );
};

export default TestPage;