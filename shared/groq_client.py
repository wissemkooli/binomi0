from groq import Groq
from .config import GROQ_API_KEY,GROQ_MODEL
client=Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
def chat(messages,temperature=0.35,max_tokens=500):
    if not client: raise RuntimeError("GROQ_API_KEY is not configured")
    r=client.chat.completions.create(model=GROQ_MODEL,messages=messages,temperature=temperature,max_completion_tokens=max_tokens)
    return r.choices[0].message.content or ""
