import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabase";
import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";

type ExcelSheetData = {
  NO: number;
  "ENTER DATE": any;
  "STAFF NAME": string;
  "NAME ": string;
  TAGS: string;
  "PH NO": string;
  PLACE: string;
  DISTRICT: string;
  "SITE VISIT DATE": any;
  "SITE VISIT  PAYMENT": string;
  "WORK STATUS": string;
  "WORK START DATE": any;
  REMARKS: string;
  HIGHLIGHT: string;
};

type TaskTableData = {
  id: string;
  client_name: string;
  phone_number: string;
  place: string;
  district_id: string;
  site_visit_payment: string;
  site_visit_date: Date | null;
  entry_date: Date | null;
  staff: string;
};

type DistrictData = {
  id: string;
  name: string;
};

type TaskTagsTable = {
  task_id: string;
  tag_id: string;
};

const workStartedTagId = "c890009e-8ef5-463b-8643-1a12ab83c34d";
const cancelledTagId = "7ed72c57-9297-4d5f-aefa-ed9edc2d6b27";
const siteVisitedTagId = "31a4f755-22c8-447e-937b-a0f918a1cc99";
const workProgressTagId = "b669453c-2344-4a7b-8c0e-4d8c3aa8d226";

const TestPage = () => {
  const [excelData, setExcelData] = useState<ExcelSheetData[]>([]);
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dataToInsert, setDataToInsert] = useState<TaskTableData[]>([]);
  const [taskTagsToInsert, setTaskTagsToInsert] = useState<TaskTagsTable[]>([]);
  const [districts, setDistricts] = useState<Record<string, string>>({});

  const cellStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    padding: "8px",
    textAlign: "left",
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    const newLeftWidth = (mouseX / containerWidth) * 100;

    // Set boundaries (10% min width for each column)
    setLeftWidth(Math.max(10, Math.min(90, newLeftWidth)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const getData = async () => {
      try {
        const excel = await fetch("/Main file Edited With Hightlight.xlsx");
        const excelBlob = await excel.blob();
        const arrayBuffer = await excelBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(uint8Array, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<ExcelSheetData>(worksheet, {
          header: 1,
        });

        const headers = jsonData[1] as unknown as string[];
        const dataRows = jsonData.slice(2) as unknown as any[][];

        const formattedData = dataRows.map((row) => {
          const rowData: Partial<ExcelSheetData> = {};
          headers.forEach((header, index) => {
            if (header === "ENTER DATE" || header === "SITE VISIT DATE") {

              //need date in iso format

              rowData[header as keyof ExcelSheetData] = XLSX.SSF.format(
                "yyyy-mm-dd", row[index]
              )

            } else if (header === "HIGHLIGHT") {
              const value = row[index] as string;

              if (rowData["TAGS"] === undefined) {

              if (value && value.toLowerCase() === "yellow") {
                rowData["TAGS"] = "SITE VISITED";
              } else if (value && value.toLowerCase() === "blue") {
                rowData["TAGS"] = "CANCELLED";
              }

            }else{
              rowData["TAGS"] = rowData["TAGS"];
            }

              
            } else {
              rowData[header as keyof ExcelSheetData] = row[index] as any;
            }
          });
          return rowData as ExcelSheetData;
        });

        setExcelData(formattedData);
      } catch (error) {
        console.error("Error loading Excel file:", error);
      }
    };

    getData();
  }, []);

  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const { data, error } = await supabase.from("districts").select("*");

        if (error) {
          throw error;
        }

        const districtMap = (data || []).reduce((acc, district) => {
          acc[district.id] = district.name;
          return acc;
        }, {} as Record<string, string>);

        setDistricts(districtMap);
      } catch (error) {
        console.error("Error fetching districts:", error);
      }
    };

    fetchDistricts();
  }, []);

  useEffect(() => {
    const districtEntries = Object.entries(districts);

    const districtMap = districtEntries.reduce((acc, [id, name]) => {
      acc[name.toUpperCase()] = id;
      return acc;
    }, {} as Record<string, string>);

    console.log("Districts districtMap:", districtMap);

    // console.log("Excel Data:", excelData[0]["ENTER DATE"]);

    const formattedData: any = excelData
      .filter((row) => row.DISTRICT !== undefined)
      .map((row) => ({
        id: crypto.randomUUID(),
        client_name: row["NAME "],
        phone_number: row["PH NO"],
        place: row["PLACE"],
        district_id:
          Object.keys(districts).find(
            (key) =>
              districts[key].trim().toUpperCase() ===
              row["DISTRICT"]?.trim().toUpperCase()
          ) || "",
        site_visit_payment: row["SITE VISIT  PAYMENT"],
        site_visit_date: row["SITE VISIT DATE"] ? new Date(row["SITE VISIT DATE"]) : null,
        entry_date: row["ENTER DATE"] ? new Date(row["ENTER DATE"]) : null,
        staff: row["STAFF NAME"],
        tags: row["TAGS"]?.trim() || "",
      }));



      
      const taskTagsData: TaskTagsTable[] = formattedData
      .filter((task: any) => task.tags !== "")
      .map((task: any) => ({
        task_id: task.id,
        tag_id:
        task.tags === "WORK STARTED"
        ? workStartedTagId
            : task.tags === "CANCELLED"
            ? cancelledTagId
            : task.tags === "SITE VISITED"
            ? siteVisitedTagId
            : task.tags === "WORK"
            ? workProgressTagId
            : "",
          }));


     const dataToInsertToTaskTable : TaskTableData[] = formattedData.map((task: TaskTableData) => ({
       id: task.id,
       client_name: task.client_name,
       phone_number: task.phone_number,
       place: task.place,
       district_id: task.district_id,
       site_visit_payment: task.site_visit_payment,
       site_visit_date: task.site_visit_date,
       entry_date: task.entry_date,
       staff: task.staff,
     }));

     console.log("Data to insert to Task Table:", dataToInsertToTaskTable);
     console.log("Task Tags Data to insert:", taskTagsData);

    setDataToInsert(dataToInsertToTaskTable);
    setTaskTagsToInsert(taskTagsData);
  }, [districts, excelData]);

  const handleDownloadTaskData = () => {
    const worksheet = XLSX.utils.json_to_sheet(dataToInsert);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, "data_to_insert.csv");
  };

  const handleDownloadTaskTagsData = () => {
    const worksheet = XLSX.utils.json_to_sheet(taskTagsToInsert);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TaskTags");
    XLSX.writeFile(workbook, "task_tags_to_insert.csv");
  };

  return (
    <div
      ref={containerRef}
      className="flex h-screen w-full relative"
      style={{ padding: "16px" }}
    >
      {/* Left Column - Table */}
      <div
        style={{
          width: `${leftWidth}%`,
          border: "1px solid #e5e7eb",
          padding: "16px",
          borderRadius: "8px",
          overflow: "auto",
          height: "100%",
        }}
      >
        <h2 style={{ marginBottom: "16px", textAlign: "center" }}>
          Excel Data Table
        </h2>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            minWidth: "800px",
          }}
          cellPadding={5}
          cellSpacing={0}
        >
          <thead>
            <tr>
              <th style={cellStyle}>NO</th>
              <th style={cellStyle}>ENTER DATE</th>
              <th style={cellStyle}>STAFF NAME</th>
              <th style={cellStyle}>NAME</th>
              <th style={cellStyle}>TAGS</th>
              <th style={cellStyle}>PHONE NO</th>
              <th style={cellStyle}>PLACE</th>
              <th style={cellStyle}>DISTRICT</th>
              <th style={cellStyle}>SITE VISIT DATE</th>
              <th style={cellStyle}>SITE VISIT PAYMENT</th>
            </tr>
          </thead>
          <tbody>
            {excelData.map((row, index) => (
              <tr key={index}>
                <td style={cellStyle}>{row["NO"]}</td>
                <td style={cellStyle}>{row["ENTER DATE"]}</td>
                <td style={cellStyle}>{row["STAFF NAME"]}</td>
                <td style={cellStyle}>{row["NAME "]}</td>
                <td style={cellStyle}>{row["TAGS"]}</td>
                <td style={cellStyle}>{row["PH NO"]}</td>
                <td style={cellStyle}>{row["PLACE"]}</td>
                <td style={cellStyle}>{row["DISTRICT"]}</td>
                <td style={cellStyle}>{row["SITE VISIT DATE"]}</td>
                <td style={cellStyle}>{row["SITE VISIT  PAYMENT"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Draggable Divider */}
      <div
        style={{
          width: "8px",
          height: "100%",
          backgroundColor: isDragging ? "#3b82f6" : "#d1d5db",
          cursor: "col-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            width: "2px",
            height: "40px",
            backgroundColor: isDragging ? "#ffffff" : "#6b7280",
            borderRadius: "1px",
          }}
        />
      </div>

      {/* Right Column - JSON Data */}
      <div
        style={{
          width: `${100 - leftWidth}%`,
          border: "1px solid #e5e7eb",
          padding: "16px",
          borderRadius: "8px",
          overflow: "auto",
          height: "100%",
        }}
      >
        <h2 style={{ marginBottom: "16px", textAlign: "center" }}>
          Raw JSON Data
        </h2>

        <Button onClick={handleDownloadTaskData}>Download Task Data</Button>
        <Button onClick={handleDownloadTaskTagsData}>
          Download Task Tags Data
        </Button>

        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            fontSize: "12px",
          }}
        >
          {/* {JSON.stringify(taskTagsToInsert, null, 2)} */}
          <br />
          {JSON.stringify(dataToInsert, null, 2)}
        </pre>
      </div>

      {/* Dragging overlay */}
      {isDragging && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: "col-resize",
            zIndex: 1000,
          }}
        />
      )}
    </div>
  );
};

export default TestPage;
