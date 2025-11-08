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

type TaskTagsTable = {
  task_id: string;
  tag_id: string;
};

type DuplicateRowData = {
  originalRow: ExcelSheetData;
  duplicateCount: number;
  occurrenceNumber: number;
  phoneNumber: string;
};

const workStartedTagId = "2e60f6a0-1bfe-4820-ab6d-544b735115bb";
const cancelledTagId = "7ed72c57-9297-4d5f-aefa-ed9edc2d6b27";
const siteVisitedTagId = "31a4f755-22c8-447e-937b-a0f918a1cc99";
const workProgressTagId = "b669453c-2344-4a7b-8c0e-4d8c3aa8d226";

const TestPage = () => {
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dataToInsert, setDataToInsert] = useState<TaskTableData[]>([]);
  const [taskTagsToInsert, setTaskTagsToInsert] = useState<TaskTagsTable[]>([]);
  const [districts, setDistricts] = useState<Record<string, string>>({});
  const [invalidRows, setInvalidRows] = useState<Set<number>>(new Set());
  const [invalidRowDetails, setInvalidRowDetails] = useState<
    { no: number; enterDate: any; siteVisitDate: any }[]
  >([]);
  const [duplicateNumbers, setDuplicateNumbers] = useState<Set<string>>(
    new Set()
  );
  const [phoneNumberCounts, setPhoneNumberCounts] = useState<
    Record<string, number>
  >({});
  const [duplicateRowsData, setDuplicateRowsData] = useState<DuplicateRowData[]>([]);
  const [nonDuplicateExcelData, setNonDuplicateExcelData] = useState<ExcelSheetData[]>([]);

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

  // Function to validate date
  const isValidDate = (dateString: any): boolean => {
    if (!dateString) return true; // Empty dates are considered valid

    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  };

  // Function to find duplicate phone numbers and their counts
  const findDuplicatePhoneNumbers = (
    data: ExcelSheetData[]
  ): { duplicates: Set<string>; counts: Record<string, number> } => {
    const counts: Record<string, number> = {};
    const duplicates = new Set<string>();

    data.forEach((row) => {
      const phone = row["PH NO"]?.toString().trim();
      if (phone) {
        counts[phone] = (counts[phone] || 0) + 1;
      }
    });

    Object.entries(counts).forEach(([phone, count]) => {
      if (count > 1) {
        duplicates.add(phone);
      }
    });

    return { duplicates, counts };
  };

  // Function to find rows with invalid dates
  const findInvalidRows = (
    data: ExcelSheetData[]
  ): {
    invalidRows: Set<number>;
    details: { no: number; enterDate: any; siteVisitDate: any }[];
  } => {
    const invalidRowsSet = new Set<number>();
    const details: { no: number; enterDate: any; siteVisitDate: any }[] = [];

    data.forEach((row, index) => {
      const enterDateValid = isValidDate(row["ENTER DATE"]);
      const siteVisitDateValid = isValidDate(row["SITE VISIT DATE"]);

      if (!enterDateValid || !siteVisitDateValid) {
        invalidRowsSet.add(index);
        details.push({
          no: row["NO"],
          enterDate: row["ENTER DATE"],
          siteVisitDate: row["SITE VISIT DATE"],
        });
      }
    });

    return { invalidRows: invalidRowsSet, details };
  };

  // Function to separate duplicate and non-duplicate rows
  const separateDuplicateRows = (
    data: ExcelSheetData[],
    duplicates: Set<string>,
    counts: Record<string, number>
  ): {
    nonDuplicateData: ExcelSheetData[];
    duplicateData: DuplicateRowData[];
  } => {
    const nonDuplicateData: ExcelSheetData[] = [];
    const duplicateData: DuplicateRowData[] = [];
    const phoneOccurrenceMap: Record<string, number> = {};

    data.forEach((row) => {
      const phone = row["PH NO"]?.toString().trim();
      
      if (phone && duplicates.has(phone)) {
        // This is a duplicate row
        const occurrenceNumber = (phoneOccurrenceMap[phone] || 0) + 1;
        phoneOccurrenceMap[phone] = occurrenceNumber;
        
        duplicateData.push({
          originalRow: row,
          duplicateCount: counts[phone],
          occurrenceNumber: occurrenceNumber,
          phoneNumber : phone
        });
      } else {
        // This is a non-duplicate row
        nonDuplicateData.push(row);
      }
    });

    const sortedDuplicateDataByNumber = duplicateData.sort((a, b) => {
      return a.phoneNumber.localeCompare(b.phoneNumber);
    });

    return { nonDuplicateData, duplicateData: sortedDuplicateDataByNumber };
  };

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

        const convertDateString = (dateString: any): string | null => {
          console.log("Converting date string:", dateString);
          if (!dateString || dateString === "") return null;

          // If it's already a Date object or valid date string, return as is
          if (dateString instanceof Date && !isNaN(dateString.getTime())) {
            return dateString.toISOString().split("T")[0]; // yyyy-mm-dd
          }

          const stringDate = dateString.toString().trim();

          // Handle dd-mm-yyyy format (like "28-09-2025")
          if (stringDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
            const [day, month, year] = stringDate.split("-");
            // Create date in yyyy-mm-dd format
            const formattedDate = `${year}-${month.padStart(
              2,
              "0"
            )}-${day.padStart(2, "0")}`;
            const date = new Date(formattedDate);
            return !isNaN(date.getTime()) ? formattedDate : null;
          }

          // Handle other date formats or return null if invalid
          const date = new Date(stringDate);
          return !isNaN(date.getTime())
            ? date.toISOString().split("T")[0]
            : null;
        };

        // Update the date formatting part in your useEffect
        const formattedData = dataRows.map((row) => {
          const rowData: Partial<ExcelSheetData> = {};
          headers.forEach((header, index) => {
            if (header === "ENTER DATE" || header === "SITE VISIT DATE") {
              // Convert date strings to proper format
              const originalDate = row[index];
              rowData[header as keyof ExcelSheetData] =
                convertDateString(XLSX.SSF.format("yyyy-mm-dd", originalDate));
            } else if (header === "HIGHLIGHT") {
              const value = row[index] as string;

              if (rowData["TAGS"] === undefined) {
                if (value && value.toLowerCase() === "yellow") {
                  rowData["TAGS"] = "SITE VISITED";
                } else if (value && value.toLowerCase() === "blue") {
                  rowData["TAGS"] = "CANCELLED";
                }
              } else {
                rowData["TAGS"] = rowData["TAGS"];
              }
            } else {
              rowData[header as keyof ExcelSheetData] = row[index] as any;
            }
          });
          return rowData as ExcelSheetData;
        });

        // Find invalid rows and duplicate numbers
        const { invalidRows: invalidRowsSet, details: invalidDetails } =
          findInvalidRows(formattedData);
        const { duplicates, counts } = findDuplicatePhoneNumbers(formattedData);

        // Separate duplicate and non-duplicate rows
        const { nonDuplicateData, duplicateData } = separateDuplicateRows(
          formattedData, 
          duplicates, 
          counts
        );

        setInvalidRows(invalidRowsSet);
        setInvalidRowDetails(invalidDetails);
        setDuplicateNumbers(duplicates);
        setPhoneNumberCounts(counts);
        setNonDuplicateExcelData(nonDuplicateData);
        setDuplicateRowsData(duplicateData);
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

    // Use nonDuplicateExcelData instead of excelData to exclude duplicates
    const formattedData: any = nonDuplicateExcelData
      .filter((row) => row.DISTRICT !== undefined)
      .map((row) => ({
        id: crypto.randomUUID(),
        client_name: row["NAME "],
        phone_number: `${row["PH NO"]}`,
        place: row["PLACE"],
        district_id:
          Object.keys(districts).find(
            (key) =>
              districts[key].trim().toUpperCase() ===
              row["DISTRICT"]?.trim().toUpperCase()
          ) || "",
        site_visit_payment: row["SITE VISIT  PAYMENT"],
        site_visit_date: row["SITE VISIT DATE"]
          ? new Date(row["SITE VISIT DATE"])
          : null,
        entry_date: row["ENTER DATE"] ? new Date(row["ENTER DATE"]) : null,
        staff: row["STAFF NAME"],
        tags: row["TAGS"]?.trim() || "",
      }));

    const taskTagsData: TaskTagsTable[] = formattedData
      .filter((task: any) => task.tags !== "")
      .map((task: any) => ({
        task_id: task.id,
        tag_id:
          task.tags === "WOK STARTED"
            ? workStartedTagId
            : task.tags === "CANCELLED"
            ? cancelledTagId
            : task.tags === "SITE VISITED"
            ? siteVisitedTagId
            : task.tags === "WORK"
            ? workProgressTagId
            : "",
      }));

    const dataToInsertToTaskTable: TaskTableData[] = formattedData.map(
      (task: TaskTableData) => ({
        id: task.id,
        client_name: task.client_name,
        phone_number: task.phone_number,
        place: task.place,
        district_id: task.district_id,
        site_visit_payment: task.site_visit_payment,
        site_visit_date: task.site_visit_date,
        entry_date: task.entry_date,
        staff: task.staff,
      })
    );

    console.log("Data to insert to Task Table:", dataToInsertToTaskTable);
    console.log("Task Tags Data to insert:", taskTagsData);

    setDataToInsert(dataToInsertToTaskTable);
    setTaskTagsToInsert(taskTagsData);
  }, [districts, nonDuplicateExcelData]); // Use nonDuplicateExcelData as dependency

  // Function to get row background color based on validation
  const getRowBackgroundColor = (
    row: ExcelSheetData,
    index: number
  ): string => {
    const phoneNumber = row["PH NO"]?.toString().trim();

    // Check if row has invalid dates
    const hasInvalidDate = invalidRows.has(index);

    // Check if phone number is duplicate
    const isDuplicate = phoneNumber && duplicateNumbers.has(phoneNumber);

    if (hasInvalidDate && isDuplicate) {
      return "#ffb3b3"; // Light red for both issues
    } else if (hasInvalidDate) {
      return "#ffcccc"; // Light red for invalid dates
    } else if (isDuplicate) {
      return "#ffddcc"; // Light orange for duplicate numbers
    }

    return "transparent"; // No issues
  };

  // Function to get row title for tooltip
  const getRowTitle = (row: ExcelSheetData, index: number): string => {
    const issues: string[] = [];

    if (invalidRows.has(index)) {
      const enterDateValid = isValidDate(row["ENTER DATE"]);
      const siteVisitDateValid = isValidDate(row["SITE VISIT DATE"]);

      if (!enterDateValid) issues.push("Invalid ENTER DATE");
      if (!siteVisitDateValid) issues.push("Invalid SITE VISIT DATE");
    }

    const phoneNumber = row["PH NO"]?.toString().trim();
    if (phoneNumber && duplicateNumbers.has(phoneNumber)) {
      const count = phoneNumberCounts[phoneNumber] || 0;
      issues.push(`Duplicate phone number (appears ${count} times)`);
    }

    return issues.length > 0 ? `Issues: ${issues.join(", ")}` : "";
  };

  // Get sorted duplicate numbers with counts
  const getSortedDuplicateNumbers = () => {
    return Array.from(duplicateNumbers)
      .map((phone) => ({
        phone,
        count: phoneNumberCounts[phone] || 0,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  };

  const handleDownloadTaskData = () => {
    const worksheet = XLSX.utils.json_to_sheet(dataToInsert);
    const workbook = XLSX.utils.book_new();

    //dont make the number like 23094329048032 to some thing like 9.23432E+12
    worksheet["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
    worksheet["!rows"] = [{ hpx: 20 }, { hpx: 20 }, { hpx: 20 }, { hpx: 20 }, { hpx: 20 }, { hpx: 20 }, { hpx: 20 }, { hpx: 20 }, { hpx: 20 }, { hpx: 20 }];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, "data_to_insert.csv");
  };

  const handleDownloadTaskTagsData = () => {
    const worksheet = XLSX.utils.json_to_sheet(taskTagsToInsert);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TaskTags");
    XLSX.writeFile(workbook, "task_tags_to_insert.csv");
  };

  const handleDownloadDuplicateData = () => {
   const duplicateDataForDownload = duplicateRowsData.map((dupRow) => ({
    ...dupRow.originalRow,
    "ENTER DATE": dupRow.originalRow["ENTER DATE"],
    "SITE VISIT DATE": dupRow.originalRow["SITE VISIT DATE"],
  }));

    const worksheet = XLSX.utils.json_to_sheet(duplicateDataForDownload);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Duplicates");
    XLSX.writeFile(workbook, "duplicate_data.csv");
  };

  return (
    <div
      ref={containerRef}
      className="h-screen w-full relative"
      style={{ padding: "16px" }}
    >
      {/* Left Column - Table */}
      <div
        style={{
          // width: `${leftWidth}%`,
          border: "1px solid #e5e7eb",
          padding: "16px",
          borderRadius: "8px",
          overflow: "auto",
          height: "100%",
        }}
      >
        <h2 style={{ marginBottom: "16px", textAlign: "center" }}>
          Excel Data Table (Duplicates Excluded from Main Data)
        </h2>

        {/* Validation Summary */}
        <div
          style={{
            marginBottom: "16px",
            padding: "8px",
            backgroundColor: "#f3f4f6",
            borderRadius: "4px",
          }}
        >
          <strong>Validation Summary:</strong>
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "4px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "#dc2626" }}>
              Rows with invalid dates: {invalidRows.size}
            </span>
            <span style={{ color: "#ea580c" }}>
              Duplicate phone numbers: {duplicateNumbers.size}
            </span>
            <span style={{ color: "#16a34a" }}>
              Non-duplicate rows: {nonDuplicateExcelData.length}
            </span>
            <span style={{ color: "#ca8a04" }}>
              Duplicate rows: {duplicateRowsData.length}
            </span>
          </div>

          {/* Invalid Rows List */}
          {invalidRowDetails.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "8px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "4px",
              }}
            >
              <strong style={{ color: "#dc2626" }}>
                Rows with Invalid Dates:
              </strong>
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "12px",
                  maxHeight: "100px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 1fr",
                    gap: "8px",
                    padding: "4px",
                    fontWeight: "bold",
                    borderBottom: "1px solid #fecaca",
                  }}
                >
                  <span>NO</span>
                  <span>ENTER DATE</span>
                  <span>SITE VISIT DATE</span>
                </div>
                {invalidRowDetails.map((row, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px 1fr 1fr",
                      gap: "8px",
                      padding: "4px",
                      borderBottom:
                        index < invalidRowDetails.length - 1
                          ? "1px solid #fecaca"
                          : "none",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>{row.no}</span>
                    <span
                      style={{
                        color: !isValidDate(row.enterDate)
                          ? "#dc2626"
                          : "inherit",
                      }}
                    >
                      {row.enterDate || "Empty"}
                      {!isValidDate(row.enterDate) && " ⚠️"}
                    </span>
                    <span
                      style={{
                        color: !isValidDate(row.siteVisitDate)
                          ? "#dc2626"
                          : "inherit",
                      }}
                    >
                      {row.siteVisitDate || "Empty"}
                      {!isValidDate(row.siteVisitDate) && " ⚠️"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Numbers List */}
          {duplicateNumbers.size > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "8px",
                backgroundColor: "#fff7ed",
                border: "1px solid #fdba74",
                borderRadius: "4px",
              }}
            >
              <strong style={{ color: "#ea580c" }}>
                Duplicate Phone Numbers ({duplicateRowsData.length} rows):
              </strong>
              <Button 
                onClick={handleDownloadDuplicateData}
                style={{ 
                  marginLeft: "12px", 
                  padding: "4px 8px", 
                  fontSize: "12px",
                  backgroundColor: "#ea580c",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Download Duplicate Data
              </Button>
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "12px",
                  maxHeight: "100px",
                  overflowY: "auto",
                }}
              >
                {getSortedDuplicateNumbers().map(({ phone, count }) => (
                  <div
                    key={phone}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "2px 4px",
                    }}
                  >
                    <span>{phone}</span>
                    <span style={{ color: "#dc2626", fontWeight: "bold" }}>
                      ({count} {count === 1 ? "time" : "times"})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Data Table (Non-duplicates only) */}
        <h3 style={{ marginBottom: "12px", color: "#16a34a" }}>
          Main Data ({nonDuplicateExcelData.length} rows - Duplicates Excluded)
        </h3>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            minWidth: "800px",
            marginBottom: "24px",
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
            {nonDuplicateExcelData.map((row, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: getRowBackgroundColor(row, index),
                }}
                title={getRowTitle(row, index)}
              >
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

        {/* Duplicate Data Table */}
        {duplicateRowsData.length > 0 && (
          <>
            <h3 style={{ marginBottom: "12px", color: "#ca8a04" }}>
              Duplicate Data ({duplicateRowsData.length} rows)
            </h3>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                minWidth: "800px",
                backgroundColor: "#fff7ed",
              }}
              cellPadding={5}
              cellSpacing={0}
            >
              <thead>
                <tr>
                  <th style={cellStyle}>Occurrence</th>
                  <th style={cellStyle}>PHONE NO</th>
                  <th style={cellStyle}>NO</th>
                  <th style={cellStyle}>ENTER DATE</th>
                  <th style={cellStyle}>STAFF NAME</th>
                  <th style={cellStyle}>NAME</th>
                  <th style={cellStyle}>TAGS</th>
                  <th style={cellStyle}>PLACE</th>
                  <th style={cellStyle}>DISTRICT</th>
                  <th style={cellStyle}>SITE VISIT DATE</th>
                </tr>
              </thead>
              <tbody>
                {duplicateRowsData.map((dupRow, index) => (
                  <tr key={index}>
                    <td style={cellStyle}>
                      {dupRow.occurrenceNumber}/{dupRow.duplicateCount}
                    </td>
                    <td style={{...cellStyle, fontWeight: "bold", color: "#dc2626"}}>
                      {dupRow.originalRow["PH NO"]}
                    </td>
                    <td style={cellStyle}>{dupRow.originalRow["NO"]}</td>
                    <td style={cellStyle}>{dupRow.originalRow["ENTER DATE"]}</td>
                    <td style={cellStyle}>{dupRow.originalRow["STAFF NAME"]}</td>
                    <td style={cellStyle}>{dupRow.originalRow["NAME "]}</td>
                    <td style={cellStyle}>{dupRow.originalRow["TAGS"]}</td>
                    <td style={cellStyle}>{dupRow.originalRow["PLACE"]}</td>
                    <td style={cellStyle}>{dupRow.originalRow["DISTRICT"]}</td>
                    <td style={cellStyle}>{dupRow.originalRow["SITE VISIT DATE"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
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
          {JSON.stringify(taskTagsToInsert, null, 2)}
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