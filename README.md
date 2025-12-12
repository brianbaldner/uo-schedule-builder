# Class Scraper & Schedule Builder

A full-stack web application for scraping course data and generating optimal class schedules. This project consists of a FastAPI backend that serves course data and a React/TypeScript frontend for building and visualizing class schedules.

## Features

- **Course Data Scraping**: Automatically scrapes course information from the university registration system
- **Advanced Search**: Search courses by subject, code, title, instructor, time, location, and more
- **Schedule Generation**: Automatically generates all possible valid schedules from selected courses
- **Conflict Detection**: Identifies time conflicts between courses and suggests alternatives
- **Interactive UI**: Modern React interface for browsing courses and visualizing schedules

## Project Structure

```
class-scraper/
├── main.py                  # FastAPI backend server
├── class-scraper.ipynb     # Jupyter notebook for web scraping
├── classes.db              # SQLite database (generated)
├── requirements.txt        # Python dependencies
└── schedule-builder/       # React frontend
    ├── src/
    ├── public/
    └── package.json
```

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

## Installation

### Backend Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd class-scraper
```

2. Create a virtual environment:
```bash
python -m venv .venv
```

3. Activate the virtual environment:
- Windows: `.venv\Scripts\activate`
- Mac/Linux: `source .venv/bin/activate`

4. Install Python dependencies:
```bash
pip install -r requirements.txt
```

5. Run the scraper to populate the database:
```bash
jupyter notebook class-scraper.ipynb
```
Execute all cells to scrape course data and create `classes.db`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd schedule-builder
```

2. Install dependencies:
```bash
npm install
```

3. Build the frontend:
```bash
npm run build
```

## Running the Application

### Option 1: Using Docker (Recommended)

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

2. Open your browser and navigate to:
```
http://localhost:8000
```

### Option 2: Manual Setup

1. From the root directory, start the FastAPI server:
```bash
uvicorn main:app --reload
```

2. Open your browser and navigate to:
```
http://localhost:8000
```

The React app is served by FastAPI and all API endpoints are available under `/api/`

### Docker Commands

- **Build the image**: `docker build -t class-scraper .`
- **Run the container**: `docker run -p 8000:8000 -v ./classes.db:/app/classes.db class-scraper`
- **Stop all containers**: `docker-compose down`

## API Endpoints

### `GET /api/search`
Search for courses with various filters:
- Query parameters: `Subj`, `Crse`, `Title`, `Creds`, `CRN`, `Avail`, `Max`, `Time`, `Day`, `Location`, `Instructor`, `Notes`
- Returns: List of matching courses

### `POST /api/generate_schedules`
Generate all valid schedules from selected courses:
- Request body: Array of `{Subj, Code}` objects
- Returns: All valid schedule combinations without time conflicts

### `GET /api/all_classes`
Get all available subject/course combinations

## Development

### Frontend Development
To run the frontend in development mode with hot reload:
```bash
cd schedule-builder
npm run dev
```

### Backend Development
The FastAPI server runs with hot reload enabled using `--reload` flag:
```bash
uvicorn main:app --reload
```

## Technologies Used

### Backend
- **FastAPI**: Modern Python web framework
- **SQLite**: Lightweight database for course data
- **Pandas**: Data manipulation and analysis
- **Requests**: HTTP library for web scraping

### Frontend
- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **CSS3**: Styling

## Database Schema

The `classes.db` database contains a `Spring2026Classes` table with the following columns:
- `Subj`: Subject code (e.g., "CIS")
- `Crse`: Course number (e.g., "211")
- `Title`: Course title
- `Creds`: Credit hours
- `CRN`: Course Reference Number
- `Avail`: Available seats
- `Max`: Maximum enrollment
- `Time`: Class time (e.g., "1000-1120")
- `Day`: Days of week (e.g., "MWF")
- `Location`: Building and room
- `Instructor`: Instructor name
- `Notes`: Additional notes

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- University of Oregon course registration system
- FastAPI and React communities
