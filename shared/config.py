import os
from dotenv import load_dotenv
load_dotenv()
GROQ_API_KEY=os.getenv("GROQ_API_KEY","")
GROQ_MODEL=os.getenv("GROQ_MODEL","llama-3.3-70b-versatile")
BACKEND_PORT=int(os.getenv("BACKEND_PORT","8000"))
FRONTEND_URL=os.getenv("FRONTEND_URL","http://localhost:5173")
