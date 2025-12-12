import { useState, useEffect } from 'react'
import './App.css'

interface Class {
  Subj: string
  Code: string
}

interface AvailableClass {
  Subj: string
  Crse: string
}

interface CourseSection {
  CRN: string
  Subj: string
  Crse: string
  Title: string
  Creds: string
  Avail: string
  Max: string
  Time: string
  Day: string
  Location: string
  Instructor: string
  Notes: string
}

interface ConflictClass {
  Subj: string
  Code: string
}

interface Schedule {
  schedules: CourseSection[][]
  count: number,
  message: string,
  conflicts: ConflictClass[]
}

const API_BASE = '/api'
function min_between_time(start: number, end: number): number {
  return Math.floor((end - start) / 100) * 60 + ((end - start) % 100)
}

const DISTINCT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B739', // Orange
  '#52B788', // Green
  '#E76F51', // Terra Cotta
  '#2A9D8F', // Dark Teal
  '#E9C46A', // Gold
  '#F4A261', // Sandy Brown
  '#8E44AD', // Dark Purple
];

const createNumberRange = (start: number, end: number, step = 1) => {
  const length = Math.floor((end - start) / step) + 1;
  return Array.from({ length }, (_, index) => start + index * step);
};

function CalendarView({ schedule }: { schedule: CourseSection[] }) {

  const sync_classes = schedule.filter(obj => obj.Location != "ASYNC WEB");

  const earliest_time = Math.min(...sync_classes.map(obj => parseInt(obj.Time.split('-')[0])));
  const latest_time = Math.max(...sync_classes.map(obj => parseInt(obj.Time.split('-')[1])));

  const window = min_between_time(earliest_time, latest_time)
  const sects = window / 10
  const grid_style = {
    'display': 'grid',
    'grid-template-columns': '50px repeat(5, 1fr)',
    'grid-template-rows': `30px repeat(${sects}, 10px)`,
    'gap': '1px',
    'padding': '10px',
    'overflow': 'auto'
  }

  const day_to_col: { [key: string]: number } = {
    'm': 2,
    't': 3,
    'w': 4,
    'r': 5,
    'f': 6
  };

  return <div style={grid_style}>
    {createNumberRange(1, sects).map((n) => {
    const minutes_from_start = (n - 1) * 10;
    const hours = Math.floor(minutes_from_start / 60);
    const mins = minutes_from_start % 60;
    const time_int = earliest_time + (hours * 100) + mins;
    const display_hour = Math.floor(time_int / 100);
    const display_min = time_int % 100;
    const period = display_hour >= 12 ? 'PM' : 'AM';
    const hour_12 = display_hour > 12 ? display_hour - 12 : display_hour === 0 ? 12 : display_hour;
    
    return (
      <p key={n} style={{
        'gridColumn': 1,
        'color': 'black',
        'gridRow': n + 1,
        'fontSize': '8px',
        'margin': 0,
        'textAlign': 'right',
        'paddingRight': '5px'
      }}>
        {`${hour_12}:${display_min.toString().padStart(2, '0')} ${period}`}
      </p>
    );
    })}
    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((val, index) => (
      <p style={{
        'gridColumn': index + 2,
        'gridRow': 1,
        'color': 'black',
        'textAlign': 'center'
      }}>{val}</p>
    ))}
    {sync_classes.map((section, index) => (
      section.Day.split('').map((day) => (
        <div style={{
          'gridRowStart': (min_between_time(earliest_time, parseInt(section.Time.split('-')[0])) / 10) + 2,
          'gridRowEnd': (min_between_time(earliest_time, parseInt(section.Time.split('-')[1])) / 10) + 2,
          'gridColumn': day_to_col[day],
          'backgroundColor': DISTINCT_COLORS[index]
        }}>
          {`${section.Subj} ${section.Crse}\n${section.Title}`}
        </div>
      ))
    ))}
  </div>
}

function App() {
  const [selectedClasses, setSelectedClasses] = useState<Class[]>([])
  const [schedules, setSchedules] = useState<CourseSection[][]>([])
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0)
  const [lockedCRNs, setLockedCRNs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<ConflictClass[]>([])
  const [newSubj, setNewSubj] = useState('')
  const [newCode, setNewCode] = useState('')
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<AvailableClass[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch all available classes on mount
    const fetchClasses = async () => {
      try {
        const response = await fetch(`${API_BASE}/all_classes`)
        if (response.ok) {
          const data = await response.json()
          setAvailableClasses(data)
        }
      } catch (err) {
        console.error('Failed to fetch available classes:', err)
      }
    }
    fetchClasses()
  }, [])

  useEffect(() => {
    // Filter suggestions based on input
    if (newSubj || newCode) {
      const filtered = availableClasses.filter((cls) => {
        const subjMatch = !newSubj || cls.Subj.toLowerCase().includes(newSubj.toLowerCase())
        const codeMatch = !newCode || cls.Crse.includes(newCode)
        return subjMatch && codeMatch
      })
      setFilteredSuggestions(filtered.slice(0, 10)) // Limit to 10 suggestions
    } else {
      setFilteredSuggestions([])
    }
  }, [newSubj, newCode, availableClasses])

  const validateClass = (subj: string, code: string): boolean => {
    return availableClasses.some(
      (cls) => cls.Subj.toUpperCase() === subj.toUpperCase() && cls.Crse === code
    )
  }

  const addClassToList = () => {
    setValidationError(null)
    
    if (!newSubj || !newCode) {
      setValidationError('Please enter both subject and code')
      return
    }

    const subjUpper = newSubj.toUpperCase()
    
    // Check if class exists in available classes
    if (!validateClass(subjUpper, newCode)) {
      setValidationError(`Class ${subjUpper} ${newCode} not found in available courses`)
      return
    }

    // Check if already added
    const alreadyAdded = selectedClasses.some(
      (cls) => cls.Subj === subjUpper && cls.Code === newCode
    )
    
    if (alreadyAdded) {
      setValidationError('This class is already in your list')
      return
    }

    setSelectedClasses([...selectedClasses, { Subj: subjUpper, Code: newCode }])
    setNewSubj('')
    setNewCode('')
    setShowSuggestions(false)
  }

  const selectSuggestion = (cls: AvailableClass) => {
    setNewSubj(cls.Subj)
    setNewCode(cls.Crse)
    setShowSuggestions(false)
    setValidationError(null)
  }

  const removeClassFromList = (index: number) => {
    setSelectedClasses(selectedClasses.filter((_, i) => i !== index))
  }

  const generateSchedules = async () => {
    if (selectedClasses.length === 0) {
      setError('Please add at least one class')
      return
    }

    setLoading(true)
    setError(null)
    setConflicts([])
    setLockedCRNs([])

    try {
      const response = await fetch(`${API_BASE}/generate_schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedClasses),
      })

      if (!response.ok) {
        throw new Error('Failed to generate schedules')
      }

      const data: Schedule = await response.json()
      
      if (data.schedules.length === 0 && data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts)
        setError(data.message || 'No valid schedules found due to conflicts')
      } else {
        setSchedules(data.schedules)
        setCurrentScheduleIndex(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    if (!time || time === 'TBA') return 'TBA'
    const [start, end] = time.split('-')
    const formatSingle = (t: string) => {
      const hours = parseInt(t.slice(0, -2))
      const mins = t.slice(-2)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
      return `${displayHours}:${mins} ${period}`
    }
    return `${formatSingle(start)} - ${formatSingle(end)}`
  }

  const filteredSchedules = lockedCRNs.length === 0 
  ? schedules 
  : schedules.filter(schedule => 
      lockedCRNs.every(crn => schedule.some(section => section.CRN === crn))
    );

  const currentSchedule = filteredSchedules[currentScheduleIndex]

  return (
    <div className="app">
      <header>
        <h1>UOregon Unofficial Schedule Builder</h1>
      </header>

      <div className="container">
        <div className="sidebar">
          <div className="class-input">
            <h2>Add Classes</h2>
            <div className="input-group">
              <div className="autocomplete-container">
                <input
                  type="text"
                  placeholder="Subject (e.g., CSCI)"
                  value={newSubj}
                  onChange={(e) => {
                    setNewSubj(e.target.value.toUpperCase())
                    setShowSuggestions(true)
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && addClassToList()}
                  onFocus={() => setShowSuggestions(true)}
                />
                <input
                  type="text"
                  placeholder="Code (e.g., 1301)"
                  value={newCode}
                  onChange={(e) => {
                    setNewCode(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && addClassToList()}
                  onFocus={() => setShowSuggestions(true)}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {filteredSuggestions.map((cls, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => selectSuggestion(cls)}
                      >
                        {cls.Subj} {cls.Crse}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={addClassToList}>Add</button>
            </div>
            {validationError && <div className="validation-error">{validationError}</div>}
          </div>

          <div className="class-list">
            <h3>Selected Classes ({selectedClasses.length})</h3>
            {selectedClasses.length === 0 ? (
              <p className="empty-state">No classes selected</p>
            ) : (
              <ul>
                {selectedClasses.map((cls, index) => (
                  <li key={index}>
                    <span>{cls.Subj} {cls.Code}</span>
                    <button onClick={() => removeClassFromList(index)}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button 
            className="generate-btn" 
            onClick={generateSchedules}
            disabled={loading || selectedClasses.length === 0}
          >
            {loading ? 'Generating...' : 'Generate Schedules'}
          </button>

          {error && <div className="error">{error}</div>}
          
          {conflicts.length > 0 && (
            <div className="conflicts-warning">
              <h4>⚠️ Remove one of these classes to fix:</h4>
              <ul>
                {conflicts.map((cls, index) => (
                  <li key={index}>
                    <span>{cls.Subj} {cls.Code}</span>
                    <button 
                      onClick={() => {
                        setSelectedClasses(
                          selectedClasses.filter(
                            c => !(c.Subj === cls.Subj && c.Code === cls.Code)
                          )
                        )
                        setConflicts([])
                        setError(null)
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="main-content">
          {schedules.length > 0 ? (
            <>
              <div className="schedule-nav">
                <button 
                  onClick={() => setCurrentScheduleIndex(Math.max(0, currentScheduleIndex - 1))}
                  disabled={currentScheduleIndex === 0}
                >
                  Previous
                </button>
                <span>Schedule {currentScheduleIndex + 1} of {filteredSchedules.length}</span>
                  <button 
                    onClick={() => setCurrentScheduleIndex(Math.min(filteredSchedules.length - 1, currentScheduleIndex + 1))}
                    disabled={currentScheduleIndex === filteredSchedules.length - 1}
                  >
                  Next
                </button>
              </div>
            <CalendarView schedule={currentSchedule} />
              <div className="schedule-view">
                {currentSchedule.map((section, index) => (
                  <div key={index} className="course-card">
                    <div className="course-header">
                      <button style={{
                        'aspectRatio': 1,
                        'height': '40px',
                        'padding': '0px',
                        'borderRadius': '50%'
                      }} onClick={() => {setCurrentScheduleIndex(0);
                        setLockedCRNs(
                        lockedCRNs.includes(section.CRN) 
                          ? lockedCRNs.filter(crn => crn !== section.CRN)
                          : [...lockedCRNs, section.CRN]
                        )}}>
                        {lockedCRNs.includes(section.CRN) ? '🔒' : '🔓'}
                      </button>
                      <h3>{section.Subj} {section.Crse}</h3>
                      <span className="crn">CRN: {section.CRN}</span>
                    </div>
                    <div className="course-title">{section.Title}</div>
                    <div className="course-details">
                      <div className="detail-row">
                        <span className="label">Time:</span>
                        <span>{formatTime(section.Time)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Days:</span>
                        <span>{section.Day || 'TBA'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Location:</span>
                        <span>{section.Location}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Instructor:</span>
                        <span>{section.Instructor}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Credits:</span>
                        <span>{section.Creds}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Seats:</span>
                        <span>{section.Avail}/{section.Max}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-schedule">
              <h2>No schedules generated yet</h2>
              <p>Add classes and click "Generate Schedules" to see possible schedule combinations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
