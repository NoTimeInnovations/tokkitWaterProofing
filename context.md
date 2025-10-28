Project Context: Tokkit Waterproofing Client Management App

1. Project Overview

This project is a mobile-first data entry and management web application for "Tokkit Waterproofing Solutions." The primary goal is to replace the current multi-sheet Excel system with a centralized, searchable, and filterable database using Supabase. The app will allow staff to quickly enter new client tasks, manage their status, and filter the entire client list based on various criteria.

2. Technology Stack

Language: TypeScript

Frontend Framework: React (run via Vite)

Package Manager: Bun

Database & BaaS: Supabase

Styling: Tailwind CSS

Component Library: No component library — the UI uses Tailwind CSS utility classes only (no MUI or Polaris). The project was migrated away from Shopify Polaris and MUI.

UI approach: Use Tailwind CSS utility classes for all UI elements (cards, buttons, inputs, badges, modals). Keep markup semantic and lightweight; avoid component-library-specific APIs.

3. Authentication

The application will be protected by a login screen.

Access will be restricted to a single administrator account using Supabase Auth (Email & Password).

Admin Email: admin@tokkit.app

Admin Password: 123456

Only the authenticated admin user will be able to view, add, edit, or delete any data.

4. Core Requirements & Features

4.1. Main Data View

A mobile-first list view (e.g., a ResourceList or custom Card components) displaying all client tasks.

Each list item should concisely show key info: Client Name, Place, Phone Number, and assigned Tags.

A persistent "Add New Task" button (e.g., a Floating Action Button on mobile).


4.2. Global Search

A prominent search bar (e.g., MUI TextField with a search icon).

This should search across multiple fields in the database, primarily:

client_name

phone_number

place

4.3. Filtering System

A collapsible or popover-based filter section with the following options:


District Selection:

A dropdown (MUI Select) populated with all Kerala districts (and "Other State") from the districts table.

Selecting a district filters the main list.


Tag-Based Filtering:

A multi-select or chip-based filter (MUI Chips, Autocomplete with multiple, or Select with multiple).

Users can select one or more tags (e.g., "Urgent," "Completed," "Cancelled").

The list will update to show tasks matching all selected tags.

Distance Filter (v1.5 Feature):

Allow the user to find tasks "near me" or within a certain radius (e.g., 10km, 25km) of a specified location.

Note: This requires latitude and longitude to be stored for each task. This may require a geocoding service (like Google Maps API or a PostGIS function) to convert the place + district into coordinates upon data entry.

4.4. Tag Management

As you requested ("Option kodutho create cheyyan"), users need full control over tags.

Color-Coded Tags: Tags (MUI Chip) must display with distinct colors (e.g., Urgent = Red, Completed = Green).

Create/Edit Tags: A separate "Settings" or "Manage Tags" page where authorized users can:

Create new tags (e.g., "Follow-up", "High-Priority").

Assign a color to each tag.

Edit tag names and colors.

Delete tags.

4.5. Data Entry & Editing

A clean, mobile-friendly form (e.g., in a Modal or on a separate page) for adding a new task.

An "Edit" flow for modifying existing tasks.

Fields will be based on the proposed data model.

5. Proposed Supabase Data Model

To normalize the data from your CSVs and support the required features, we should use multiple related tables. This schema should be created in your Supabase project.

Table 1: districts

Stores the list of districts to populate the filter dropdown.

Column

Type

Notes

id

uuid

Primary Key (default gen_random_uuid())

name

text

Unique (e.g., "KANNUR", "KOZHIKODE")

Table 2: staff

Stores the list of staff members.

Column

Type

Notes

id

uuid

Primary Key (default gen_random_uuid())

name

text

Unique (e.g., "BHAVYA")

Table 3: tags

Stores the user-creatable tags and their colors.

Column

Type

Notes

id

uuid

Primary Key (default gen_random_uuid())

name

text

Unique (e.g., "Urgent", "Completed")

color

text

Stores a color value suitable for MUI Chip styling (e.g., hex color, Tailwind class, or CSS color token)

Table 4: tasks (The Main Table)

This table will hold the core information for each client/task, referencing the other tables.

Column

Type

Notes

id

uuid

Primary Key (default gen_random_uuid())

created_at

timestampz

Default now()

entry_date

date

From "ENTER DATE" column

client_name

text

From "NAME" column

phone_number

text

From "PH NO" / "NUMBER" column

place

text

From "PLACE" column

district_id

uuid

Foreign Key -> districts.id

staff_id

uuid

Foreign Key -> staff.id

site_visit_payment

text

From "SITE VISIT PAYMENT" (stores "1000", "OK", etc.)

notes

text

From "STATUS" or other note columns (nullable)

latitude

numeric

For Distance Filter (nullable)

longitude

numeric

For Distance Filter (nullable)

Table 5: task_tags (Join Table)

This table creates a many-to-many relationship between tasks and tags.

Column

Type

Notes

task_id

uuid

Foreign Key -> tasks.id (Composite PK)

tag_id

uuid

Foreign Key -> tags.id (Composite PK)

6. Data Migration Plan

Write a one-time script (e.g., Node.js or Python) to:

Populate districts and staff: Read all CSVs, find all unique district and staff names, and insert them.

Populate tags: Pre-populate with the common values from your "STATUS" column (e.g., "Urgent", "Pending", "Finished" -> "Completed") and assign default colors.

Populate tasks: Iterate through every row of every CSV. For each row:

Find the corresponding district_id and staff_id.

Insert the row data into the tasks table.

Get the new task_id for the inserted row.

Populate task_tags: After inserting a task, check its "STATUS" column. If it matches a tag (e.g., "URGENT"), find that tag_id and insert a new row into task_tags (e.g., task_id, tag_id_for_urgent).