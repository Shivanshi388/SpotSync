<div align="center">

# SpotSync

### Smart Parking Discovery, Availability & Management Platform

[![Frontend](https://img.shields.io/badge/Frontend-Live-2ea44f)](https://spot-sync-seven.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Live-2ea44f)](https://spotsync-api-ag0v.onrender.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)

**Find parking. Check availability. Park smarter.**

</div>

## Overview



SpotSync is a smart parking platform designed to help users discover parking facilities and view parking availability through a web interface backed by a REST API.



The project combines a React frontend with a Python FastAPI backend and a database layer to support parking information and availability data.



### Key Features



- **Frontend:** https://spot-sync-seven.vercel.app/

- **Backend API:** https://spotsync-api-ag0v.onrender.com/

- **API Documentation:** https://spotsync-api-ag0v.onrender.com/docs



## Project Goals



- Make parking information easier to access.

- Present parking availability in a clear interface.

- Provide an API for parking-related data.

- Build a foundation for future smart parking integrations.



## Key Features



- **Parking Overview:** Displays parking facilities and availability counts.

- **Availability Information:** Shows available and occupied parking spaces in the current demo data.

- **Web Interface:** Built with React and Vite.

- **REST API:** FastAPI-based backend with interactive API documentation.

- **Database Integration:** SQLAlchemy and PostgreSQL-compatible database configuration.

- **Extensible Architecture:** Dependencies are included for potential payment, MQTT, and machine-learning functionality; availability of these dependencies does not mean every integration is fully implemented.



## System Architecture



```mermaid

flowchart TD

&#x20;   A[User] --> B[React Frontend]

&#x20;   B -->|HTTP requests| C[FastAPI Backend]

&#x20;   C --> D[SQLAlchemy]

&#x20;   D --> E[(Database)]

&#x20;   C --> F[Parking Overview API]

&#x20;   F --> B

```



## Application Workflow



```mermaid

flowchart TD

&#x20;   A[Open SpotSync] --> B[Load Parking Overview]

&#x20;   B --> C[Backend API Request]

&#x20;   C --> D[Retrieve Parking Data]

&#x20;   D --> E[Return JSON Response]

&#x20;   E --> F[Display Availability]

```



## Technology Stack



| Layer | Technologies |

|---|---|

| Frontend | React 19, Vite, React Router |

| HTTP Client | Axios |

| UI Icons | Lucide React |

| Backend | Python, FastAPI, Uvicorn |

| Database | SQLAlchemy, PostgreSQL-compatible driver |

| Authentication Dependencies | PyJWT, pwdlib |

| Additional Dependencies | Razorpay, MQTT, scikit-learn, NumPy, APScheduler |

| Testing | Pytest, Vitest |

| Frontend Hosting | Vercel |

| Backend Hosting | Render |



## Repository Structure

```text
SpotSync/
|-- backend/
|   |-- app/
|   |-- tests/
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |-- public/
|   `-- package.json
`-- docs/
    |-- api/
    |-- architecture/
    |-- database/
    |-- iot/
    |-- ml/
    `-- screenshots/
```

## Getting Started



### Prerequisites



Install the following tools:



- Git

- Python

- Node.js and npm

- A compatible database if your local configuration requires one



### 1. Clone the Repository



```bash

git clone https://github.com/Shivanshi388/SpotSync.git

cd SpotSync

```



### 2. Configure the Backend



From the repository root, create and activate a Python virtual environment.



**Windows PowerShell:**



```powershell

python -m venv .venv

.\.venv\Scripts\Activate.ps1

pip install -r .\backend\requirements.txt

```



Create your local environment configuration using `.env.example` as a reference. Fill in the values required by your setup. Do not commit real credentials or secrets.



### 3. Run the Backend



From the repository root:



```powershell

uvicorn app.main:app --app-dir backend --reload

```



The local API should be available at:



- API: http://127.0.0.1:8000/

- Interactive documentation: http://127.0.0.1:8000/docs



### 4. Configure the Frontend



Open a second terminal at the repository root:



```powershell

cd .\frontend

npm install

```



If needed, create a `.env.local` file inside `frontend/` with:



```dotenv

VITE\_API\_URL=http://127.0.0.1:8000

```



### 5. Run the Frontend



From the `frontend` directory:



```powershell

npm run dev

```



Open the local URL printed by Vite in your terminal.



## API Reference



The deployed API provides interactive documentation at:



https://spotsync-api-ag0v.onrender.com/docs



| Endpoint | Purpose |

|---|---|

| `GET /api/parking/overview` | Retrieve the parking overview |

| `GET /api/parking/slots?available\_only=false` | Retrieve parking slot information |

| `GET /health/ready` | Check backend readiness |



Refer to the interactive API documentation for the available parameters and response schemas.



## Testing



### Backend Tests



From the repository root, with the project virtual environment configured:



```powershell

.\.venv-standard\Scripts\python.exe -m pytest .\backend\tests -q

```



If your local test setup uses a different virtual environment or test directory, adjust the command to match your repository configuration.



### Frontend Tests



From the `frontend` directory:



```powershell

npm test

```



### Frontend Production Build



```powershell

npm run build

```



## Security Considerations



- Keep API keys, database credentials, and JWT secrets in environment variables.

- Never commit `.env` files containing real secrets.

- Use `.env.example` only for placeholder configuration.

- Use test credentials when developing payment integrations.

- Review authentication, authorization, and input validation before production use.



## Current Limitations



- The deployed parking overview contains demo parking data.

- Availability counts should not be interpreted as live sensor readings unless connected to and verified against real parking sensors.

- External payment, MQTT, and machine-learning dependencies do not by themselves confirm that those features are operational.

- Free hosting services may have cold starts or temporary delays.



## Future Enhancements



- Integrate real-time parking sensors.

- Add interactive parking maps and navigation.

- Improve booking and reservation workflows.

- Complete and validate payment integration.

- Expand automated testing and monitoring.

- Add screenshots and architecture documentation.



## Contributing



Contributions and suggestions are welcome. Create a branch for your changes, test them, and submit a pull request for review.



## License



No license has been specified in this repository yet. Add a license file before distributing the project under an open-source license.



## Contact



For questions or suggestions, please open an issue in the [SpotSync GitHub repository](https://github.com/Shivanshi388/SpotSync).
