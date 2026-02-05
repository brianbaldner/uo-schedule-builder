from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
import sqlite3
import pandas as pd
import os

app = FastAPI()

class Classes(BaseModel):
    Subj: str
    Code: str

@app.get("/api/search")
def read_root(Subj: str | None = None, Crse: str | None = None, Title: str | None = None, Creds: str | None = None, CRN: str | None = None, Avail: str | None = None, Max: str | None = None, Time: str | None = None, Day: str | None = None, Location: str | None = None, Instructor: str | None = None, Notes: str | None = None):
    
    conn = sqlite3.connect('classes.db')

    args = {
        "Subj": Subj,
        "Crse": Crse,
        "Title": Title,
        "Creds": Creds,
        "CRN": CRN,
        "Avail": Avail,
        "Max": Max,
        "Time": Time,
        "Day": Day,
        "Location": Location,
        "Instructor": Instructor,
        "Notes": Notes,
    }

    cursor = conn.cursor()
    
    # Build the query dynamically based on provided filters
    query = "SELECT * FROM Classes WHERE 1=1"

    if len([x for x in args.values() if x is not None]) == 0:
        return HTTPException(status_code=400, detail="At least one search parameter is required")

    for field, value in args.items():
        if value is None:
            continue
        query += f' AND {field} LIKE "{value}"'

    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    columns = [description[0] for description in cursor.description]
    
    # Convert to list of dictionaries
    results = [dict(zip(columns, row)) for row in rows]
    
    return {"results": results, "count": len(results)}


def get_all_combos(classes):
    if len(classes) == 0:
        return [[]]  # Return list containing empty schedule
    
    curr_classes = classes[0]
    groups = []
    
    for c in curr_classes:
        without = c.copy()
        del without['assoc_sections']
        if len(c['assoc_sections']) > 0:
            groups.extend([[without, a] for a in c['assoc_sections']])
        else:
            groups.append([without])
    
    recurs = get_all_combos(classes[1:])
    
    # Combine each group with each recursive result
    result = []
    for group in groups:
        for schedule in recurs:
            result.append(group + schedule)
    
    return result

@app.post("/api/generate_schedules")
def read_item(classes: list[Classes]):
    conn = sqlite3.connect('classes.db')
    query = "SELECT * FROM Classes WHERE " + " OR ".join([f'(Subj = "{c.Subj}" AND Crse = "{c.Code}")' for c in classes])

    df = pd.read_sql_query(query, conn, index_col='CRN')
    df['CRN'] = df.index.values
    df.index = df.index.astype(int)
    main = []
    for c in classes:
        filtered = df[(df['Subj'] == c.Subj) & (df['Crse'] == c.Code)]
        class_structure = []
        for ind, row in filtered.iterrows():
            if '+' == row['Title'][0]:
                continue
            associated_classes = []
            crn = ind
            while crn + 1 in df.index and '+' == df.loc[crn + 1]['Title'][0]:
                associated_classes.append(df.loc[crn + 1].to_dict())
                crn += 1
            sect = row.to_dict()
            sect['assoc_sections'] = associated_classes
            class_structure.append(sect)
        main.append(class_structure)

    combos = get_all_combos(main)
    valid_schedules = [s for s in combos if not schedule_has_conflicts(s)]
    # If no valid schedules, find which classes conflict
    if len(valid_schedules) == 0:
        conflicts = find_conflicting_classes(classes, main)
        return {
            "schedules": [], 
            "count": 0,
            "conflicts": conflicts,
            "message": "No valid schedules found. The following classes have conflicts:"
        }
    
    return {"schedules": valid_schedules, "count": len(valid_schedules)}


def find_conflicting_classes(classes: list[Classes], main):
    """Find which pairs of classes have conflicts across all sections"""
    conflicts = []
    for c in classes:
        removed = [main[x] for x in range(len(main)) if main[x][0]['Subj'] != c.Subj and main[x][0]['Crse'] != c.Code]
        combos = get_all_combos(removed)
        valid_schedules = [s for s in combos if not schedule_has_conflicts(s)]
        if len(valid_schedules) > 0:
            conflicts.append(c)
    
    return conflicts
            

def parse_time(time_str):
    """Convert time like '1000-1120' to (start_minutes, end_minutes)"""
    if not time_str or time_str == 'TBA':
        return None, None
    
    parts = time_str.split('-')
    if len(parts) != 2:
        return None, None
    
    start = int(parts[0])
    end = int(parts[1])
    
    # Convert to minutes since midnight
    start_mins = (start // 100) * 60 + (start % 100)
    end_mins = (end // 100) * 60 + (end % 100)
    
    return start_mins, end_mins

def times_overlap(time1, time2):
    """Check if two time ranges overlap"""
    start1, end1 = parse_time(time1)
    start2, end2 = parse_time(time2)
    
    if None in (start1, end1, start2, end2):
        return False
    
    return start1 < end2 and start2 < end1

def days_overlap(day1, day2):
    """Check if two day strings share any days"""
    if not day1 or not day2:
        return False
    return any(d in day2 for d in day1)

def has_conflict(section1, section2):
    """Check if two sections conflict"""
    if section1['Location'] == 'ASYNC WEB' or section2['Location'] == 'ASYNC WEB':
        return False
    return days_overlap(section1['Day'], section2['Day']) and times_overlap(section1['Time'], section2['Time'])

def schedule_has_conflicts(schedule):
    """Check if a schedule has any conflicts"""
    for i in range(len(schedule)):
        for j in range(i + 1, len(schedule)):
            if has_conflict(schedule[i], schedule[j]):
                return True
    return False

@app.get("/api/all_classes")
def all_classes():
    query = """
    SELECT DISTINCT Subj, Crse
    FROM Classes
    """
    with sqlite3.connect('classes.db') as conn:
        df = pd.read_sql_query(query, conn)
    return df.to_dict('records')

# Mount static files for React app (after all API routes)
app.mount("/assets", StaticFiles(directory="schedule-builder/dist/assets"), name="assets")

@app.get('/favicon.ico')
async def serve_ico():
    return FileResponse('schedule-builder/dist/favicon.ico')
# Catch-all route to serve React app for client-side routing
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve the React app for all non-API routes"""
    index_path = "schedule-builder/dist/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(status_code=404, detail="React app not built. Run 'npm run build' in schedule-builder directory.")