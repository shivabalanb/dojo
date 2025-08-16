import os

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

# Load environment variables
load_dotenv()

app = FastAPI(title="Kleos Agent API", version="1.0.0")


class AgentRequest(BaseModel):
    message: str
    context: dict = {}


class AgentResponse(BaseModel):
    response: str
    status: str = "success"


@app.get("/")
async def root():
    return {"message": "Kleos Agent is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "kleos-agent"}


@app.post("/process", response_model=AgentResponse)
async def process_message(request: AgentRequest):
    """
    Process a message and return a response.
    This is a simple template - implement your agent logic here.
    """
    # Simple echo response for now
    response_text = f"Processed: {request.message}"

    return AgentResponse(response=response_text, status="success")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
